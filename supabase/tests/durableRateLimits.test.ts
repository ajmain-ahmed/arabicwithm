// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'

let db: PGlite
const key = 'a'.repeat(64)

beforeAll(async () => {
  db = new PGlite()
  await db.exec('create role anon; create role authenticated; create role service_role; create schema private;')
  await db.exec(readFileSync('supabase/migrations/20261110154753_durable_website_rate_limits.sql', 'utf8'))
}, 30000)
afterAll(async () => { await db?.close() })

it('atomically enforces limits and resets the window', async () => {
  const call = () => db.query<{ ok: boolean }>("select (public.website_rate_limit($1, 2, 1000)->>'ok')::boolean ok", [key])
  expect((await call()).rows[0].ok).toBe(true)
  expect((await call()).rows[0].ok).toBe(true)
  expect((await call()).rows[0].ok).toBe(false)
  await db.exec('update private.website_rate_limits set reset_at=now()-interval \'1 second\'')
  expect((await call()).rows[0].ok).toBe(true)
})

it('rejects invalid inputs and exposes execution only to the service role', async () => {
  await expect(db.query('select public.website_rate_limit($1, 2, 1000)', ['bad'])).rejects.toThrow('Invalid rate limit request')
  for (const role of ['anon', 'authenticated']) {
    expect((await db.query<{ allowed: boolean }>('select has_function_privilege($1, $2, $3) allowed', [role, 'public.website_rate_limit(text,integer,integer)', 'execute'])).rows[0].allowed).toBe(false)
  }
  expect((await db.query<{ allowed: boolean }>('select has_function_privilege($1, $2, $3) allowed', ['service_role', 'public.website_rate_limit(text,integer,integer)', 'execute'])).rows[0].allowed).toBe(true)
})
