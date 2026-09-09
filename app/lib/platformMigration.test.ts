// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { MEMORY } from './entitlements'

let db: PGlite
const user = '11111111-1111-4111-8111-111111111111'
const premium = '22222222-2222-4222-8222-222222222222'
const migration = readFileSync('supabase/migrations/20260909120000_platform_premium_memory.sql', 'utf8')
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
    create table public.books(id uuid primary key, title text);
    create table public.chapters(id uuid primary key, content jsonb);
    grant select on public.chapters to anon,authenticated;
    insert into auth.users values ('${user}', '{"memory_xp":9}'), ('${premium}', '{}');
    insert into books values ('${randomUUID()}', 'Blackwood Manor'), ('${randomUUID()}', 'Layla and the Shadow'), ('${randomUUID()}', 'The Stranger Who Knows My Name'), ('${randomUUID()}', 'When Learning Feels Real'), ('${randomUUID()}', 'Future Book');`)
  await db.exec(migration)
}, 30000)
afterAll(async () => { await db?.close() })
async function review(id: string, completion = randomUUID(), card = randomUUID(), direction = 'arabic') {
  const session = { index: 1, cards: [{ id: card }], completionIds: [completion], direction }
  const { rows } = await db.query<{ result: { accepted: boolean; used: number; awarded: number; totalXp: number } }>('select complete_memory_card($1,$2,$3,$4,$5,$6,$7::jsonb) result', [id, completion, card, 'known', MEMORY.xpPerCard, MEMORY.dailyFreeCards, JSON.stringify(session)])
  return rows[0].result
}
describe.sequential('actual PostgreSQL migration and Memory transactions', () => {
  it('is rerunnable, exempts exactly the original books and preserves old XP', async () => {
    await db.exec(migration)
    const { rows } = await db.query<{ premium_exempt: boolean; title: string }>('select title,premium_exempt from books')
    expect(rows.filter(row => row.premium_exempt)).toHaveLength(4)
    expect(rows.find(row => row.title === 'Future Book')?.premium_exempt).toBe(false)
    expect((await db.query<{ xp: number }>('select xp from memory_legacy_progress')).rows[0].xp).toBe(9)
  })
  it('records 8, resumes for 12 in the other direction, then rejects further practice without losing XP', async () => {
    for (let i = 0; i < 8; i++) expect((await review(user)).used).toBe(i + 1)
    for (let i = 8; i < 20; i++) expect((await review(user, randomUUID(), randomUUID(), 'english')).used).toBe(i + 1)
    expect(await review(user)).toEqual({ accepted: false, used: 20, awarded: 0, totalXp: 20 })
    const { rows } = await db.query<{ state: { completed: number; sessionXp: number } }>('select state from memory_sessions where user_id=$1', [user])
    expect(rows[0].state).toMatchObject({ completed: 1, sessionXp: 1 })
  })
  it('does not let concurrent requests overspend the quota', async () => {
    const id = randomUUID()
    await db.query('insert into auth.users values ($1,$2)', [id, '{}'])
    const results = await Promise.all(Array.from({ length: 24 }, () => review(id)))
    expect(results.filter(row => row.accepted)).toHaveLength(20)
  })
  it('allows Premium beyond 20 without increasing XP; retries and repeated sources cannot farm XP', async () => {
    await db.query("insert into subscriptions(user_id,customer_id,status,current_period_end,cancel_at_period_end) values ($1,'cus_test','active',now()+interval '1 month',true)", [premium])
    const completion = randomUUID()
    const card = randomUUID()
    await review(premium, completion, card)
    expect((await review(premium, completion, card)).used).toBe(1)
    expect((await review(premium, randomUUID(), card)).awarded).toBe(0)
    for (let i = 0; i < 23; i++) expect((await review(premium)).awarded).toBe(1)
    expect((await review(premium)).used).toBe(26)
  })
  it('resets by persisted date; expiration removes access but preserves all progress', async () => {
    await db.query("update memory_reviews set activity_date=activity_date-1 where user_id=$1", [user])
    expect(await review(user)).toMatchObject({ accepted: true, used: 1, totalXp: 21 })
    await db.query("update subscriptions set current_period_end=now()-interval '1 second' where user_id=$1", [premium])
    expect(await review(premium)).toMatchObject({ accepted: false, used: 26, totalXp: 25 })
  })
  it('rejects stale billing events', async () => {
    await db.query("select apply_subscription_event($1,100,'sub_test','active',now()+interval '1 month',true)", [premium])
    await db.query("select apply_subscription_event($1,99,'sub_test','expired',now(),false)", [premium])
    expect((await db.query<{ status: string }>('select status from subscriptions where user_id=$1', [premium])).rows[0].status).toBe('active')
  })
  it('protects direct database access and service-only mutations', async () => {
    await db.exec('set role anon')
    await expect(db.query('select * from chapters')).rejects.toThrow(/permission denied/)
    await expect(db.query('select * from subscriptions')).rejects.toThrow(/permission denied/)
    await expect(review(user)).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  })
})
