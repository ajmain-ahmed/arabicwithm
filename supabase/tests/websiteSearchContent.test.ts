// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
const db=new PGlite()
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table shows(id uuid primary key,title text,slug text);create table episodes(id uuid primary key,show_id uuid,title text,slug text);
 create table books(id uuid primary key,title text,slug text,is_completed boolean);create table chapters(id uuid primary key,book_id uuid,title text,slug text,content jsonb);
 insert into shows values('11111111-1111-4111-8111-111111111111','Book cartoons','book-show');
 insert into episodes values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Book episode','episode');
 insert into books values('33333333-3333-4333-8333-333333333333','Book released','released',true),('44444444-4444-4444-8444-444444444444','Book preparation','preparation',false);
 insert into chapters values('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','Chapter','chapter','[{"tokens":[{"arabic":"كِتَاب","english":"book"}],"translation":"A book"}]'),('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','Hidden chapter','hidden','[{"translation":"book hidden prose"}]');`)
 await db.exec(readFileSync('supabase/migrations/20261109144507_website_search_content_repair.sql','utf8'))
})
afterAll(()=>db.close())
it('returns canonical metadata links to guests but no chapter content',async()=>{
 const {rows}=await db.query<{kind:string;href:string}>(`select * from website_search_content_v1('book')`)
 expect(rows.map(r=>r.kind).sort()).toEqual(['book','book','episode','show']);expect(rows.find(r=>r.kind==='episode')?.href).toBe('/cartoons/book-show/episode')
})
it('allows only released chapter content for verified signed-in searches and matches unvowelled Arabic',async()=>{
 const {rows}=await db.query<{kind:string;href:string}>(`select * from website_search_content_v1('book','',21,true)`)
 expect(rows.filter(r=>r.kind==='chapter')).toHaveLength(1);expect(rows.find(r=>r.kind==='chapter')?.href).toBe('/books/released/chapter')
 expect((await db.query(`select * from website_search_content_v1('كتاب','',21,true)`)).rows).toHaveLength(1)
})
it('uses bounded keyset pages, keeps empty results empty and rejects malformed input',async()=>{
 const first=await db.query<{key:string}>(`select * from website_search_content_v1('book','',2)`)
 const next=await db.query<{key:string}>(`select * from website_search_content_v1('book',$1,2)`,[first.rows[1].key]);expect(next.rows).toHaveLength(2);expect(new Set([...first.rows,...next.rows].map(r=>r.key)).size).toBe(4)
 expect((await db.query(`select * from website_search_content_v1('notfound')`)).rows).toEqual([])
 await expect(db.query(`select * from website_search_content_v1('x')`)).rejects.toThrow('Invalid search input')
})
it('restricts execution to service_role without SECURITY DEFINER',async()=>{
 const {rows}=await db.query<{anon:boolean;member:boolean;server:boolean;definer:boolean}>(`select has_function_privilege('anon','website_search_content_v1(text,text,integer,boolean)','execute') as anon,has_function_privilege('authenticated','website_search_content_v1(text,text,integer,boolean)','execute') as member,has_function_privilege('service_role','website_search_content_v1(text,text,integer,boolean)','execute') as server,prosecdef as definer from pg_proc where proname='website_search_content_v1'`)
 expect(rows[0]).toEqual({anon:false,member:false,server:true,definer:false})
})
