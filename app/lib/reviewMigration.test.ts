// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const admin='11111111-1111-4111-8111-111111111111', editor='22222222-2222-4222-8222-222222222222', user='33333333-3333-4333-8333-333333333333', other='44444444-4444-4444-8444-444444444444'
const parent='55555555-5555-4555-8555-555555555555', target='66666666-6666-4666-8666-666666666666'
const document=[{tokens:[{arabic:'مرحبا',english:'hello',pos:'interjection',cefr:'a1',headword:'مرحبا'}],translation:'Hello',timestamp:4,paragraph:1}]
async function submit(actor=editor,type='book'){
 return (await db.query<{id:string}>('select public.submit_content_suggestion($1,$2,$3,0,$4::jsonb,null,$5,$6,$7) id',[actor,type,target,JSON.stringify(document),'Greetings','Review this translation','More natural'])).rows[0].id
}
async function review(id:string,action='accept',actor=admin){return (await db.query<{result:{ok:boolean;conflict?:boolean}}>('select public.review_content_suggestion($1,$2,$3,$4,null) result',[actor,id,action,'Reviewed'])).rows[0].result}
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),last_sign_in_at timestamptz,banned_until timestamptz,is_anonymous boolean default false);
 create table public.public_profiles(user_id uuid primary key,display_name text);
 create table public.subscriptions(user_id uuid primary key,status text,current_period_end timestamptz,cancel_at_period_end boolean);
 create table public.books(id uuid primary key,title text);create table public.shows(id uuid primary key,title text);
 create table public.chapters(id uuid primary key,book_id uuid,title text,content jsonb,updated_at timestamptz);
 create table public.episodes(id uuid primary key,show_id uuid,title text,transcript jsonb,updated_at timestamptz);
 grant all on public.books,public.shows,public.chapters,public.episodes to anon,authenticated,service_role;
 grant usage on schema public to service_role,authenticated,anon;
 insert into auth.users(id,email,raw_app_meta_data) values ('${admin}','admin@example.com','{"role":"admin"}'),('${editor}','editor@example.com','{"role":"editor"}'),('${user}','user@example.com','{}'),('${other}','other@example.com','{}');
 insert into books values('${parent}','Book');insert into shows values('${parent}','Show');
 insert into chapters values('${target}','${parent}','Chapter','${JSON.stringify(document)}',now());
 insert into episodes values('${target}','${parent}','Episode','${JSON.stringify(document)}',now());
 insert into subscriptions values('${user}','active',now()+interval '1 month',false);`)
 await db.exec(readFileSync('supabase/migrations/20261002170311_user_management_reviews.sql','utf8'))
},30000)
afterAll(async()=>{await db?.close()})
describe.sequential('database role and review security',()=>{
 it('seeds protected roles and prevents final Admin demotion',async()=>{
  await expect(db.query('select change_account_role($1,$1,$2,$3)',[admin,'user','Demotion'])).rejects.toThrow(/final Admin/)
  await expect(db.query('select change_account_role($1,$2,$3,$4)',[editor,user,'admin','Escalation'])).rejects.toThrow(/Forbidden/)
  await expect(db.query('select change_account_role($1,$2,$3,$4)',[user,user,'editor','Escalation'])).rejects.toThrow(/Forbidden/)
 })
 it('uses safe directory fields with genuine subscriptions, search, counts and pagination',async()=>{
  await db.exec('set role service_role')
  const directory=await db.query<{r:{users:{id:string;email:string}[];total:number;counts:{all:number;premium:number}}}>('select admin_user_directory($1,$2,$3,0,1) r',[admin,'all',''])
  expect(directory.rows[0].r.total).toBe(4);expect(directory.rows[0].r.users).toHaveLength(1);expect(directory.rows[0].r.counts.premium).toBe(2)
  const filtered=await db.query<{r:{users:{id:string}[];total:number}}>('select admin_user_directory($1,$2,$3,0,25) r',[admin,'premium','user@'])
  expect(filtered.rows[0].r.total).toBe(1);expect(filtered.rows[0].r.users[0].id).toBe(user)
  await expect(db.query('select admin_user_directory($1,$2,$3,0,25)',[editor,'all',''])).rejects.toThrow(/Forbidden/)
  await db.exec('reset role')
 })
 it('blocks browser role RPC spoofing and canonical/suggestion/role/audit writes or deletes',async()=>{
  for(const identity of [user,editor,admin]){
   await db.query("select set_config('request.jwt.claim.sub',$1,false)",[identity]);await db.exec('set role authenticated')
   for(const table of ['books','shows','chapters','episodes','content_suggestions','account_roles','access_change_audit']){
    await expect(db.exec(`delete from public.${table}`)).rejects.toThrow(/permission denied/)
   }
   await expect(db.exec("update chapters set content='[]'")).rejects.toThrow(/permission denied/)
   await expect(db.exec("update episodes set transcript='[]'")).rejects.toThrow(/permission denied/)
   await expect(db.exec("update account_roles set role='admin'")).rejects.toThrow(/permission denied/)
   await expect(db.query('select change_account_role($1,$2,$3,$4)',[admin,user,'admin','Spoofed actor'])).rejects.toThrow(/permission denied/)
   await expect(submit(admin)).rejects.toThrow(/permission denied/)
   await expect(db.query("select admin_user_directory($1,'all','',0,25)",[admin])).rejects.toThrow(/permission denied/)
   await db.exec('reset role')
  }
 })
 it('allows reviewer submissions without canonical mutations and owns suggestion reads',async()=>{
  await expect(submit(user)).rejects.toThrow(/Forbidden/)
  const id=await submit();expect((await db.query<{content:unknown}>('select content from chapters')).rows[0].content).toEqual(document)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated')
  expect((await db.query('select id from content_suggestions')).rows).toHaveLength(0)
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[editor]);await db.exec('set role authenticated')
  expect((await db.query<{id:string}>('select id from content_suggestions')).rows[0].id).toBe(id)
  await db.exec('reset role')
  await expect(review(id,'accept',editor)).rejects.toThrow(/Forbidden/)
 })
 it('edits/withdraws only own pending suggestions, preserving history',async()=>{
  const id=await submit()
  await expect(db.query("select edit_content_suggestion($1,$2,false,null,'New','Comment','Reason')",[other,id])).rejects.toThrow(/Forbidden/)
  await db.query("select edit_content_suggestion($1,$2,false,null,'New','Comment','Reason')",[editor,id])
  await db.query("select edit_content_suggestion($1,$2,true,null,null,'','')",[editor,id])
  expect((await db.query<{status:string}>('select status from content_suggestions where id=$1',[id])).rows[0].status).toBe('withdrawn')
  await expect(db.query("select edit_content_suggestion($1,$2,false,null,'New','','')",[editor,id])).rejects.toThrow(/pending/)
 })
 it('applies English correction atomically and retains token metadata and review attribution',async()=>{
  const id=await submit();expect(await review(id)).toEqual({ok:true})
  const block=(await db.query<{content:typeof document}>('select content from chapters')).rows[0].content[0]
  expect(block).toEqual({...document[0],translation:'Greetings'})
  const s=(await db.query<{status:string;reviewed_by:string}>('select status,reviewed_by from content_suggestions where id=$1',[id])).rows[0]
  expect(s).toEqual({status:'accepted',reviewed_by:admin});await expect(review(id)).rejects.toThrow(/pending/)
  await db.query('update chapters set content=$1::jsonb',[JSON.stringify(document)])
 })
 it('detects changed/deleted targets and concurrent source changes without overwriting',async()=>{
  const first=await submit(),second=await submit()
  expect(await review(first)).toEqual({ok:true});expect(await review(second)).toMatchObject({ok:false,conflict:true})
  expect((await db.query<{status:string}>('select status from content_suggestions where id=$1',[second])).rows[0].status).toBe('pending')
  await db.query('update chapters set content=$1::jsonb',[JSON.stringify(document)])
  const missing=await submit();await db.exec(`delete from chapters where id='${target}'`)
  expect(await review(missing)).toMatchObject({ok:false,conflict:true})
  await db.query('insert into chapters values($1,$2,$3,$4::jsonb,now())',[target,parent,'Chapter',JSON.stringify(document)])
 })
 it('accepts/rejects/replies on show suggestions and protects authorship on role revocation',async()=>{
  const id=await submit(editor,'show');expect(await review(id)).toEqual({ok:true})
  await db.query('update episodes set transcript=$1::jsonb',[JSON.stringify(document)])
  const rejected=await submit(editor,'show');expect(await review(rejected,'reject')).toEqual({ok:true});expect(await review(rejected,'reply')).toEqual({ok:true})
  await db.query('select change_account_role($1,$2,$3,$4)',[admin,editor,'user','Review access revoked'])
  expect((await db.query('select id from content_suggestions where author_id=$1',[editor])).rows.length).toBeGreaterThan(0)
  await expect(submit()).rejects.toThrow(/Forbidden/)
  expect((await db.query<{previous_role:string;new_role:string}>('select previous_role,new_role from access_change_audit')).rows[0]).toEqual({previous_role:'editor',new_role:'user'})
  await db.query('select change_account_role($1,$2,$3,$4)',[admin,editor,'editor','Restored'])
 })
 it('requires reviewed annotated tokens for Arabic corrections and rejects self-approval',async()=>{
  const id=(await db.query<{id:string}>('select submit_content_suggestion($1,$2,$3,0,$4::jsonb,$5,null,$6,$7) id',[editor,'book',target,JSON.stringify(document),'أهلا','Arabic correction','Natural greeting'])).rows[0].id
  await expect(review(id)).rejects.toThrow(/annotated/)
  const tokens=[{arabic:'أهلا',pos:'interjection',cefr:'a1',english:'welcome',headword:'أهل'}]
  expect((await db.query<{r:{ok:boolean}}>("select review_content_suggestion($1,$2,'accept','Reviewed',$3::jsonb) r",[admin,id,JSON.stringify(tokens)])).rows[0].r.ok).toBe(true)
  await db.query('update chapters set content=$1::jsonb',[JSON.stringify(document)])
  const own=await submit(admin)
  await expect(review(own)).rejects.toThrow(/Another Admin/)
 })
 it('serializes simultaneous demotions so one Admin survives',async()=>{
  await db.query('select change_account_role($1,$2,$3,$4)',[admin,other,'admin','Second Admin'])
  const result=await Promise.allSettled([
   db.query('select change_account_role($1,$2,$3,$4)',[admin,other,'user','Demote']),
   db.query('select change_account_role($1,$2,$3,$4)',[other,admin,'user','Demote']),
  ])
  expect(result.filter(x=>x.status==='fulfilled')).toHaveLength(1)
  expect((await db.query<{count:number}>("select count(*)::integer count from account_roles where role='admin'")).rows[0].count).toBe(1)
 })
})
