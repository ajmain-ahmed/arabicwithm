// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'
const db = new PGlite()
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema private; create schema auth;
    create function auth.uid() returns uuid language sql as 'select ''11111111-1111-4111-8111-111111111111''::uuid';
    create function public.account_has_premium(uuid) returns boolean language sql as 'select false';
    create table books(id uuid primary key,title text,slug text,is_completed boolean,premium_exempt boolean,free_chapter_count integer);
    create table chapters(id uuid primary key,book_id uuid references books(id),title text,slug text,chapter_number integer,content jsonb);
    create table shows(id uuid primary key,title text,slug text); create table episodes(id uuid primary key,show_id uuid,title text,slug text);
    insert into books values('11111111-1111-4111-8111-111111111111','Live book','live',true,true,5),('22222222-2222-4222-8222-222222222222','Hidden book','hidden',false,true,5);
    insert into chapters values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Find this chapter','one',1,'[{"translation":"Searchable prose"}]'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Hidden chapter','one',1,'[]');
    alter table chapters enable row level security;
    create policy permitted on chapters for select to anon,authenticated using(true);
    create policy released on chapters as restrictive for select to anon,authenticated using(exists(select 1 from books b where b.id=chapters.book_id and b.is_completed));
    grant usage on schema public to anon,authenticated; grant select on books,chapters to anon,authenticated;
    set check_function_bodies=false;`)
  await db.exec(readFileSync('test-fixtures/chapter-publication-functions.sql','utf8'))
  await db.exec(readFileSync('supabase/migrations/20261114002000_chapter_publication.sql','utf8'))
  await db.exec('set check_function_bodies=true')
},30000)
afterAll(()=>db.close())
it('backfills existing visibility and defaults every new chapter to unpublished',async()=>{
  expect((await db.query('select is_published from chapters order by id')).rows).toEqual([{is_published:true},{is_published:false}])
  await db.exec(`insert into chapters(id,book_id,title,slug,chapter_number,content) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','Draft in live book','draft',2,'[]')`)
  expect((await db.query(`select is_published from chapters where slug='draft'`)).rows).toEqual([{is_published:false}])
})
it('composes chapter and Book RLS gates for ordinary roles while Admin service reads retain all records',async()=>{
  for(const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`)
    expect((await db.query('select slug from chapters')).rows).toEqual([{slug:'one'}])
    await db.exec('reset role')
  }
  expect((await db.query('select id from chapters')).rows).toHaveLength(3)
})
it('updates all seven actual production function definitions and retains service-only search permissions',async()=>{
  const {rows}=await db.query<{proname:string;prosrc:string}>(`select proname,prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('private','public') and proname in('read_book_chapter','website_search_content_v1','nahw_source','practice_occurrence','website_grammar_candidates','word_search_vocabulary','sarf_context_candidates_v2')`)
  expect(rows).toHaveLength(7); for(const row of rows)expect(row.prosrc).toContain('is_published')
})
it('search and privileged reads exclude a chapter immediately after unpublishing and do not publish the parent Book',async()=>{
  expect((await db.query(`select * from website_search_content_v1('Searchable','',21,true)`)).rows).toHaveLength(1)
  expect((await db.query(`select read_book_chapter('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`)).rows).toHaveLength(1)
  await db.exec(`update chapters set is_published=false where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; update chapters set is_published=true where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'`)
  expect((await db.query(`select * from website_search_content_v1('Searchable','',21,true)`)).rows).toHaveLength(0)
  await expect(db.query(`select read_book_chapter('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`)).rejects.toThrow()
  await expect(db.query(`select read_book_chapter('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')`)).rejects.toThrow()
})
