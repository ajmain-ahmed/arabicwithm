// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

let db: PGlite
const user = '11111111-1111-4111-8111-111111111111'
const puzzle = '22222222-2222-4222-8222-222222222222'
const source = '33333333-3333-4333-8333-333333333333'

async function complete(completionId = randomUUID(), puzzleId = puzzle) {
  const { rows } = await db.query<{ result: { awarded: number; totalXp: number; duplicate: boolean } }>(
    'select complete_word_search($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) result',
    [user, completionId, puzzleId, 'book', source, 'A2', 8, 8, 0, 0, 2, 45, 38],
  )
  return rows[0].result
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create schema auth;
    create function auth.uid() returns uuid language sql as 'select null::uuid';
    create role anon; create role authenticated; create role service_role;
    create table auth.users(id uuid primary key);
    create table public.memory_reviews(user_id uuid, activity_date date, xp integer);
    create table public.memory_legacy_progress(user_id uuid primary key, xp bigint not null default 0);
    create table public.learning_profiles(user_id uuid primary key references auth.users(id), legacy_active_seconds bigint not null default 0, tracked_active_seconds bigint not null default 0, updated_at timestamptz not null default now());
    create table public.learning_activity_daily(user_id uuid references auth.users(id), activity_date date, active_seconds bigint not null default 0, reading_seconds bigint not null default 0, video_seconds bigint not null default 0, word_lookups integer not null default 0, updated_at timestamptz not null default now(), primary key(user_id,activity_date));
    insert into auth.users values ('${user}');
    insert into memory_legacy_progress values ('${user}', 4);
    insert into memory_reviews values ('${user}', current_date, 2);
  `)
  await db.exec(readFileSync('supabase/migrations/20261001113000_add_word_search_completions.sql', 'utf8'))
}, 30000)

afterAll(async () => { await db?.close() })

describe.sequential('Word Search completion migration', () => {
  it('persists XP and active time atomically', async () => {
    expect(await complete()).toEqual({ awarded: 38, totalXp: 44, duplicate: false })
    const completions = await db.query<{ xp_earned: number; duration_seconds: number }>('select xp_earned,duration_seconds from word_search_completions where user_id=$1', [user])
    expect(completions.rows).toEqual([{ xp_earned: 38, duration_seconds: 45 }])
    const profile = await db.query<{ tracked_active_seconds: number }>('select tracked_active_seconds from learning_profiles where user_id=$1', [user])
    expect(Number(profile.rows[0].tracked_active_seconds)).toBe(45)
  })

  it('returns zero and does not duplicate XP or time on retry', async () => {
    expect(await complete(randomUUID())).toEqual({ awarded: 0, totalXp: 44, duplicate: true })
    const count = await db.query<{ count: number }>('select count(*)::integer count from word_search_completions where user_id=$1', [user])
    expect(count.rows[0].count).toBe(1)
    const activity = await db.query<{ active_seconds: number }>('select active_seconds from learning_activity_daily where user_id=$1', [user])
    expect(Number(activity.rows[0].active_seconds)).toBe(45)
  })

  it('blocks direct writes and service-only RPC calls from browser roles', async () => {
    await db.exec('set role authenticated')
    await expect(db.query("insert into word_search_completions(id,user_id,puzzle_id,source_type,source_id,word_count,words_found,duration_seconds,xp_earned) values ($1,$2,$3,'book',$4,8,8,10,40)", [randomUUID(), user, randomUUID(), source])).rejects.toThrow(/permission denied/)
    await expect(complete(randomUUID(), randomUUID())).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  })
})
