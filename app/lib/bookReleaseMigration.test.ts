// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import sources from './fixtures/bookReleaseSourceFunctions.json'

let db: PGlite
const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const oldBook = '33333333-3333-4333-8333-333333333333'
const book = '44444444-4444-4444-8444-444444444444'
const chapter = '55555555-5555-4555-8555-555555555555'
async function asUser(user: string, sql: string, params: unknown[] = []) {
  await db.exec('set role authenticated')
  try { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]); return await db.query(sql, params) }
  finally { await db.exec('reset role') }
}
const subscribe = (user: string, value = true) => asUser(user, 'select public.set_book_release_reminder($1,$2)', [book, value])

describe('canonical book completion and release reminders', () => {
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create schema auth; create schema private;
      create role anon; create role authenticated; create role service_role;
      grant usage on schema auth,private to authenticated,anon;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function public.account_has_premium(uuid) returns boolean language sql as $$select false$$;
      create table auth.users(id uuid primary key);
      insert into auth.users values('${first}'),('${second}');
      create table public.books(id uuid primary key default gen_random_uuid(),slug text,title text,premium_exempt boolean default false,free_chapter_count integer default 5);
      create table public.chapters(id uuid primary key,book_id uuid references books(id),slug text,title text,chapter_number integer,content jsonb);
      create table public.episodes(id uuid primary key,transcript jsonb);
      create table public.app_notifications(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),kind text not null check(kind in ('book','episode','invite')),source_id uuid not null,title text not null,message text not null,route text not null,created_at timestamptz default now(),constraint app_notifications_kind_source_id_key unique(kind,source_id));
      alter table books enable row level security; alter table chapters enable row level security; alter table app_notifications enable row level security;
      grant select on books,chapters,episodes,app_notifications to authenticated,anon;
      create policy books_public on books for select using(true);
      create policy chapters_public on chapters for select using(true);
      create policy notices_own on app_notifications for select to authenticated using(user_id is null or user_id=auth.uid());
      insert into books(id,slug,title) values('${oldBook}','existing','Existing Book');
      set check_function_bodies=off;
    `)
    // Exact read-only snapshots of the canonical shared functions, not rewritten
    // versions: verify the migration changes their release predicates safely.
    for (const source of sources) await db.exec(source.definition)
    await db.exec(readFileSync('supabase/migrations/20261103192129_book_completion_release_reminders.sql', 'utf8'))
    await db.exec('set check_function_bodies=on')
    await db.query('insert into books(id,slug,title) values($1,$2,$3)', [book, 'prepared-book', 'Prepared Book'])
    await db.query('insert into chapters values($1,$2,$3,$4,1,$5)', [chapter, book, 'private-chapter', 'Unreleased Chapter', JSON.stringify([{ tokens: [{ arabic: 'كتاب', headword: 'كتاب', english: 'book', cefr: 'A1' }], translation: 'Unreleased content' }])])
  })
  afterAll(async () => { await db?.close() })

  it('preserves existing books, defaults new books to incomplete and sends no preparation broadcast', async () => {
    expect((await db.query('select id,is_completed from books order by id')).rows).toEqual([{ id: oldBook, is_completed: true }, { id: book, is_completed: false }])
    expect((await db.query('select * from app_notifications')).rows).toHaveLength(0)
  })

  it('deduplicates reminders, binds ownership, isolates rows and denies direct writes', async () => {
    await subscribe(first); await subscribe(first); await subscribe(second)
    expect((await db.query('select * from book_release_reminders')).rows).toHaveLength(2)
    expect((await asUser(first, 'select user_id from book_release_reminders')).rows).toEqual([{ user_id: first }])
    await expect(asUser(first, 'update book_release_reminders set fulfilled_at=now()')).rejects.toThrow(/permission denied/)
    await expect(asUser(first, 'insert into book_release_reminders(user_id,book_id) values($1,$2)', [second, oldBook])).rejects.toThrow(/permission denied/)
    await db.exec('set role anon')
    try { await expect(db.query('select public.set_book_release_reminder($1,true)', [book])).rejects.toThrow(/permission denied/) }
    finally { await db.exec('reset role') }
  })

  it('allows cancellation and re-subscription before release without duplicates', async () => {
    await subscribe(second, false)
    expect((await db.query('select * from book_release_reminders')).rows).toHaveLength(1)
    await subscribe(second); await subscribe(second)
    expect((await db.query('select * from book_release_reminders')).rows).toHaveLength(2)
  })

  it('blocks direct REST-equivalent chapter reads, shared chapter RPC and word-search text before completion', async () => {
    expect((await asUser(first, 'select * from chapters where id=$1', [chapter])).rows).toEqual([])
    await expect(asUser(first, 'select public.read_book_chapter($1)', [chapter])).rejects.toThrow(/unavailable/)
    expect((await asUser(first, "select public.word_search_vocabulary('book',$1) as words", [chapter])).rows).toEqual([{ words: [] }])
    // Even the privileged game caller cannot bypass the explicit source guard.
    expect((await db.query("select public.word_search_vocabulary('book',$1) as words", [chapter])).rows).toEqual([{ words: [] }])
  })

  it('fulfills two recipients atomically using canonical book notifications and routes', async () => {
    await db.query('update books set is_completed=true where id=$1', [book])
    const notices = (await db.query('select user_id,kind,source_id,title,route from app_notifications order by user_id')).rows
    expect(notices).toEqual([first, second].map(user_id => ({ user_id, kind: 'book', source_id: book, title: 'Prepared Book is now available', route: `/read/book/${book}` })))
    expect((await db.query('select * from book_release_reminders where fulfilled_at is null')).rows).toEqual([])
    expect((await asUser(first, 'select user_id from app_notifications')).rows).toEqual([{ user_id: first }])
    expect((await asUser(first, 'select title from chapters where id=$1', [chapter])).rows).toEqual([{ title: 'Unreleased Chapter' }])
    expect((await asUser(first, 'select public.read_book_chapter($1) as chapter', [chapter])).rows[0]).toHaveProperty('chapter.content')
  })

  it('does not resend after ordinary edits, reopening, cancellation or repeated subscriptions', async () => {
    await db.query("update books set title='Edited title',is_completed=true where id=$1", [book])
    await db.query('update books set is_completed=false where id=$1', [book])
    await subscribe(first, false); await subscribe(first); await subscribe(second)
    await db.query('update books set is_completed=true where id=$1', [book])
    expect((await db.query('select * from app_notifications where source_id=$1', [book])).rows).toHaveLength(2)
    expect((await db.query('select * from book_release_reminders where book_id=$1', [book])).rows).toHaveLength(2)
  })

  it('retains one broadcast for completed-on-create books and safely patches all derived sources', async () => {
    await db.query("insert into books(slug,title,is_completed) values('ready','Already ready',true)")
    expect((await db.query('select * from app_notifications where user_id is null')).rows).toHaveLength(1)
    for (const source of sources) {
      const result = await db.query<{ definition: string }>('select pg_get_functiondef(oid) as definition from pg_proc where proname=$1', [source.proname])
      expect(result.rows.some(row => row.definition.includes('is_completed'))).toBe(true)
    }
    const functions = (await db.query<{ config: string[] }>("select proconfig as config from pg_proc where proname in ('set_book_release_reminder','fulfill_book_release_reminders','notify_completed_book_insert')")).rows
    expect(functions.every(fn => fn.config.some(value => value.startsWith('search_path=')))).toBe(true)
  })
})
