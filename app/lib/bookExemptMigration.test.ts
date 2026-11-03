// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const free = '11111111-1111-4111-8111-111111111111', paid = '22222222-2222-4222-8222-222222222222'
const targets = [
  ['ad76c3ab-177b-4180-99ce-bfd7facabb10', 'bos3'], ['e4ba3b2a-1a62-45ad-a2bb-1eff8a36fed7', 'bos1'],
  ['f3b08eae-fdfc-4746-81b9-7b7d5088ff69', 'bos2'], ['6fb6426f-2d56-44e0-88f6-86c39e3d1f18', 'bpd'],
]
const normal = '33333333-3333-4333-8333-333333333333', existing = '44444444-4444-4444-8444-444444444444'
const chapters = new Map<string, string>()
async function asUser(id: string | null, sql: string, values: unknown[] = []) {
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`)
  try { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']); return await db.query(sql, values) }
  finally { await db.exec('reset role') }
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create schema auth; create role anon; create role authenticated;
    grant usage on schema auth to anon,authenticated;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function account_has_premium(uuid) returns boolean language sql as $$select $1='${paid}'::uuid$$;
    create table books(id uuid primary key,slug text,title text,premium_exempt boolean default false,free_chapter_count integer default 5,is_completed boolean default true,updated_at timestamptz default now());
    create table chapters(id uuid primary key default gen_random_uuid(),book_id uuid references books,slug text,title text,chapter_number integer,content jsonb default '[{"translation":"Protected prose"}]');
    alter table books enable row level security; alter table chapters enable row level security;
    grant select on books,chapters to anon,authenticated;
    create policy metadata on books for select using(true);
    create policy previous_chapter_visibility on chapters for select using(true);
    create policy completion on chapters as restrictive for select using(exists(select 1 from books where books.id=book_id and is_completed));`)
  for (const [id, slug] of [...targets, [normal, 'normal'], [existing, 'already-exempt']]) {
    await db.query('insert into books(id,slug,title,premium_exempt) values($1,$2,$2,$3)', [id, slug, id === existing])
    const row = (await db.query<{ id: string }>("insert into chapters(book_id,slug,title,chapter_number) values($1,'last','Late chapter',99) returning id", [id])).rows[0]
    chapters.set(id, row.id)
  }
  await db.exec(readFileSync('supabase/migrations/20261103192139_book_exempt_access.sql', 'utf8'))
})
afterAll(async () => { await db?.close() })
it('updates exactly the four canonical rows, retaining existing exemptions and normal-book limits', async () => {
  for (const [id] of targets) expect((await db.query('select premium_exempt,free_chapter_count from books where id=$1', [id])).rows).toEqual([{ premium_exempt: true, free_chapter_count: 5 }])
  expect((await db.query('select premium_exempt from books where id=$1', [existing])).rows).toEqual([{ premium_exempt: true }])
  expect((await db.query('select premium_exempt from books where id=$1', [normal])).rows).toEqual([{ premium_exempt: false }])
})
it('denies signed-out raw chapter access and shared RPC access even for exempt books', async () => {
  expect((await asUser(null, 'select * from chapters')).rows).toEqual([])
  for (const id of [targets[0][0], normal]) await expect(asUser(null, 'select read_book_chapter($1)', [chapters.get(id)])).rejects.toThrow('Sign in')
})
it('allows late chapters on every exemption for free accounts while preserving normal-book RPC rules', async () => {
  for (const id of [...targets.map(([id]) => id), existing]) expect((await asUser(free, 'select read_book_chapter($1) as chapter', [chapters.get(id)])).rows[0]).toHaveProperty('chapter.content')
  await expect(asUser(free, 'select read_book_chapter($1)', [chapters.get(normal)])).rejects.toThrow('AWM Plus')
  expect((await asUser(paid, 'select read_book_chapter($1) as chapter', [chapters.get(normal)])).rows[0]).toHaveProperty('chapter.content')
})
it('keeps completion stronger than both exemption and Plus', async () => {
  const id = targets[0][0]
  await db.query('update books set is_completed=false where id=$1', [id])
  for (const user of [free, paid]) await expect(asUser(user, 'select read_book_chapter($1)', [chapters.get(id)])).rejects.toThrow('unavailable')
  expect((await asUser(free, 'select * from chapters where book_id=$1', [id])).rows).toEqual([])
})
