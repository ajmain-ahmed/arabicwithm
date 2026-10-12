// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
let db: PGlite
const admin=randomUUID(), user=randomUUID(), paid=randomUUID(), editor=randomUUID()
async function call(name:string,args:unknown[]){return (await db.query<{value:unknown}>(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value}
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create schema auth;create schema private;create role anon;create role authenticated;create role service_role bypassrls;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,created_at timestamptz,last_sign_in_at timestamptz,banned_until timestamptz,is_anonymous boolean);
 create table public.account_roles(user_id uuid primary key,role text,updated_at timestamptz default now());
 create function public.account_role(uuid) returns text language sql as 'select coalesce((select role from public.account_roles where user_id=$1),''user'')';
 create table public.access_change_audit(id uuid default gen_random_uuid(),target_user_id uuid,previous_role text,new_role text,changed_by uuid,reason text,changed_at timestamptz default now());
 create table public.subscriptions(user_id uuid primary key,status text,current_period_end timestamptz,cancel_at_period_end boolean);
 create table public.public_profiles(user_id uuid primary key,display_name text,is_public boolean default false);
 create table public.content_suggestions(author_id uuid,status text);
 create table public.chapters(id uuid primary key,content jsonb);
 create table public.memory_sessions(user_id uuid primary key,state jsonb,updated_at timestamptz default now());
 create table public.memory_reviews(user_id uuid,completion_id uuid,card_id text,rating text,activity_date date,xp integer,primary key(user_id,completion_id));
 create table public.youtube_transcripts(id uuid primary key default gen_random_uuid(),youtube_id text unique,canonical_url text,title text,channel text,thumbnail text,provider text,status text,searchable boolean,raw_transcript jsonb,lease_id uuid,lease_until timestamptz,duration_seconds double precision,translation_status text);
 create table public.transcript_segments(id bigserial primary key,transcript_id uuid,position integer,original_text text,english_text text,start_seconds double precision,end_seconds double precision);
 create function public.admin_record_transcript_origin(uuid,uuid) returns void language sql as 'select';
 create function public.index_youtube_transcript(p_id uuid,p_lease uuid) returns void language plpgsql as $$begin
 insert into public.transcript_segments(transcript_id,position,original_text,start_seconds,end_seconds) select p_id,(row_number() over(order by (c->>'offset')::numeric,ord)-1)::integer,c->>'text',(c->>'offset')::double precision/1000,((c->>'offset')::double precision+(c->>'duration')::double precision)/1000 from public.youtube_transcripts t cross join lateral jsonb_array_elements(t.raw_transcript->'content') with ordinality a(c,ord) where t.id=p_id;
 update public.youtube_transcripts set status='ready' where id=p_id;end $$;
 grant all on all tables in schema public to service_role;
 insert into auth.users(id) values('${admin}'),('${user}'),('${paid}'),('${editor}');
 insert into public.account_roles(user_id,role) values('${admin}','admin');
 insert into public.subscriptions values('${paid}','active','2099-01-01',false);`)
 await db.exec(readFileSync('supabase/migrations/20261006222630_website_premium_sessions.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261007154352_website_final_overhaul.sql','utf8'))
},30000)
afterAll(async()=>{await db?.close()})
describe.sequential('final overhaul database policy',()=>{
 it('saves independent Premium and Editor with optional notes and no billing changes',async()=>{
  for(const role of ['user','editor'])for(const premium of [false,true]){
   expect(await call('admin_set_account_access',[admin,editor,role,premium,''])).toMatchObject({role,manual:premium,premium})
  }
  expect(await call('admin_set_account_access',[admin,paid,'editor',false,'Keep paid benefits'])).toMatchObject({role:'editor',premium:true,manual:false})
  expect((await db.query('select status from subscriptions where user_id=$1',[paid])).rows[0]).toMatchObject({status:'active'})
  expect((await db.query('select reason from private.manual_premium_audit where user_id=$1 order by changed_at desc',[paid])).rows[0]).toMatchObject({reason:'Keep paid benefits'})
 })
 it('Admin inherits Premium; final Admin protection rolls back combined changes',async()=>{
  expect(await call('account_has_premium',[admin])).toBe(true)
  await expect(call('admin_set_account_access',[admin,admin,'user',true,''])).rejects.toThrow('final Admin')
  expect((await db.query('select * from private.manual_premium_grants where user_id=$1',[admin])).rows).toHaveLength(0)
  await expect(call('admin_set_account_access',[user,user,'admin',true,''])).rejects.toThrow('Forbidden')
 })
 it('accepts large canonical imports and persists rich raw token data',async()=>{
  const tokens=[{id:'token-1',ar:'\u0645\u0631\u062d\u0628\u0627',plain:'\u0645\u0631\u062d\u0628\u0627',gloss:'Hello',start_ms:0,end_ms:1000}]
  const content=Array.from({length:5001},(_,i)=>({text:i===0?'\u0645\u0631\u062d\u0628\u0627 '.repeat(3000):'\u0645\u0631\u062d\u0628\u0627',offset:i*1000,duration:1000,english:'Hello',...(i===0?{tokens,sentence_id:'s1'}:{})}))
  const id=await call('admin_import_youtube_transcript',[admin,'FINALtest01','Long import','Tests',{content},false])
  expect((await db.query<{n:number}>('select count(*)::integer n from transcript_segments where transcript_id=$1',[id])).rows[0].n).toBe(5001)
  const raw=(await db.query<{raw_transcript:{content:{tokens:unknown}[]}}>('select raw_transcript from youtube_transcripts where id=$1',[id])).rows[0].raw_transcript
  expect(raw.content[0].tokens).toEqual(tokens)
 })
 it('rejects malformed data atomically and denies direct client mutations',async()=>{
  await expect(call('admin_import_youtube_transcript',[admin,'FINALtest02','Bad','',{content:[{text:'\u0645\u0631\u062d\u0628\u0627',offset:0,duration:0}]},false])).rejects.toThrow('interval')
  expect((await db.query("select id from youtube_transcripts where youtube_id='FINALtest02'")).rows).toHaveLength(0)
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`)
   await expect(call('admin_set_account_access',[admin,user,'admin',true,''])).rejects.toThrow('permission denied')
   await expect(call('admin_import_youtube_transcript',[admin,'FINALtest03','Test','',{content:[]},false])).rejects.toThrow('permission denied')
   await db.exec('reset role')
  }
 })
})
