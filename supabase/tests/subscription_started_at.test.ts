// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'

let db: PGlite
const user = '11111111-1111-4111-8111-111111111111'

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
create table public.books(id uuid primary key, title text);
create table public.chapters(id uuid primary key);`)
  await db.exec(readFileSync('supabase/migrations/20260909120000_platform_premium_memory.sql', 'utf8'))
  await db.exec(readFileSync('supabase/migrations/20261106140000_subscription_started_at.sql', 'utf8'))
  await db.query('insert into auth.users(id) values($1)', [user])
  await db.query(`insert into public.subscriptions(user_id, customer_id) values($1, 'cus-test')`, [user])
}, 60000)
afterAll(async () => { await db?.close() })

const iso = (value: unknown) => new Date(String(value)).toISOString()

it('seeds started_at from the first event and never moves it on later events', async () => {
  await db.query(`select public.apply_subscription_event($1, 100, 'sub-1', 'incomplete', '2026-11-06T00:00:00Z', false, '2026-11-01T00:00:00Z')`, [user])
  let row = (await db.query<{ started_at: unknown; status: string; current_period_end?: unknown }>('select started_at, status from public.subscriptions where user_id=$1', [user])).rows[0]
  expect(row.status).toBe('incomplete')
  expect(iso(row.started_at)).toBe('2026-11-01T00:00:00.000Z')

  /* A later event syncs lifecycle state but keeps the original start — a
     reactivated or re-created subscription does not reset membership. */
  await db.query(`select public.apply_subscription_event($1, 200, 'sub-1', 'active', '2026-12-06T00:00:00Z', false, '2026-11-03T00:00:00Z')`, [user])
  row = (await db.query<{ started_at: unknown; status: string; current_period_end: unknown }>('select started_at, status, current_period_end from public.subscriptions where user_id=$1', [user])).rows[0]
  expect(row.status).toBe('active')
  expect(iso(row.current_period_end)).toBe('2026-12-06T00:00:00.000Z')
  expect(iso(row.started_at)).toBe('2026-11-01T00:00:00.000Z')
})

it('keeps the stale-event guard after the column change', async () => {
  await db.query(`select public.apply_subscription_event($1, 150, 'sub-1', 'canceled', '2026-11-05T00:00:00Z', true, '2026-11-02T00:00:00Z')`, [user])
  const row = (await db.query<{ started_at: unknown; status: string }>('select started_at, status from public.subscriptions where user_id=$1', [user])).rows[0]
  expect(row.status).toBe('active')
  expect(iso(row.started_at)).toBe('2026-11-01T00:00:00.000Z')
})
