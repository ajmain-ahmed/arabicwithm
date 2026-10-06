// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
let db: PGlite
const free=randomUUID(), paid=randomUUID(), admin=randomUUID()
function queue(count=5) {return {sessionId:randomUUID(),cards:Array.from({length:count},(_,i)=>({id:`source-${i}`})),completionIds:Array.from({length:count},()=>randomUUID()),index:0,completed:0,sessionXp:0,direction:'arabic'}}
async function call(name:string,args:unknown[]) {return (await db.query<{value:unknown}>(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args)).rows[0].value}
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create schema auth;create schema private;create role anon;create role authenticated;create role service_role bypassrls;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,created_at timestamptz,last_sign_in_at timestamptz,banned_until timestamptz,is_anonymous boolean);
 create table public.account_roles(user_id uuid primary key,role text);
 create function public.account_role(uuid) returns text language sql as 'select coalesce((select role from public.account_roles where user_id=$1),''user'')';
 create table public.subscriptions(user_id uuid primary key,status text,current_period_end timestamptz,cancel_at_period_end boolean);
 create table public.public_profiles(user_id uuid,display_name text);
 create table public.content_suggestions(author_id uuid,status text);
 create table public.chapters(id uuid primary key,content jsonb);
 grant select on public.chapters to anon,authenticated;
 create table public.memory_sessions(user_id uuid primary key,state jsonb,updated_at timestamptz default now());
 create table public.memory_reviews(user_id uuid,completion_id uuid,card_id text,rating text,activity_date date,xp integer,primary key(user_id,completion_id));
 grant all on all tables in schema public to service_role;
 insert into auth.users(id) values('${free}'),('${paid}'),('${admin}');
 insert into public.account_roles values('${admin}','admin');
 insert into public.subscriptions values('${paid}','active','2099-01-01',false);`)
 await db.exec(readFileSync('supabase/migrations/20261006222630_website_premium_sessions.sql','utf8'))
},30000)
afterAll(async()=>{await db?.close()})
describe.sequential('Premium and session policy in real PostgreSQL',()=>{
 it('manual revoke preserves paid access and does not edit billing',async()=>{
  expect(await call('account_has_premium',[free])).toBe(false)
  await call('admin_set_manual_premium',[admin,free,true,'Test grant']);expect(await call('account_has_premium',[free])).toBe(true)
  await call('admin_set_manual_premium',[admin,free,false,'Test revoke']);expect(await call('account_has_premium',[free])).toBe(false)
  await call('admin_set_manual_premium',[admin,paid,true,'Test grant']);await call('admin_set_manual_premium',[admin,paid,false,'Test revoke']);expect(await call('account_has_premium',[paid])).toBe(true)
  expect((await db.query<{status:string}>('select status from subscriptions where user_id=$1',[paid])).rows[0].status).toBe('active')
  await expect(call('admin_set_manual_premium',[free,free,true,'Spoof actor'])).rejects.toThrow('Forbidden')
 })
 it('counts starts, not the 50 cards, and allows same-session resume/retry',async()=>{
  const state=queue(50)
  expect(await call('website_begin_memory_session',[free,state])).toMatchObject({accepted:true,used:1})
  expect(await call('website_begin_memory_session',[free,state])).toMatchObject({accepted:true,used:1})
  expect(await call('website_begin_memory_session',[free,queue()])).toMatchObject({accepted:false,used:1})
  for(let i=0;i<50;i++)expect(await call('website_complete_memory_card_v2',[free,state.completionIds[i],state.cards[i].id,'known',{...state,index:i+1}])).toMatchObject({accepted:true,used:1})
  expect(await call('website_complete_memory_card_v2',[free,state.completionIds[0],state.cards[0].id,'known',{...state,index:1}])).toMatchObject({accepted:true,used:1})
  const saved=(await db.query<{state:{completed:number}}>('select state from memory_sessions where user_id=$1',[free])).rows[0].state
  expect(saved.completed).toBe(50)
  expect(await call('website_save_memory_session',[free,saved])).toMatchObject({completed:50})
 })
 it('blocks queue replacement and cross-account progress',async()=>{
  const state=queue()
  await call('website_begin_memory_session',[paid,state])
  await expect(call('website_save_memory_session',[paid,{...state,cards:[{id:'different'}]}])).rejects.toThrow('Invalid session progress')
  await expect(call('website_save_memory_session',[free,state])).rejects.toThrow('Start this session first')
 })
 it('allows multiple Premium sessions and resets on a new London day',async()=>{
  expect(await call('website_begin_memory_session',[paid,queue()])).toMatchObject({accepted:true})
  expect(await call('website_begin_memory_session',[paid,queue()])).toMatchObject({accepted:true})
  await db.query("update private.website_memory_starts set activity_date=(now() at time zone 'Europe/London')::date-1 where user_id=$1",[free])
  expect(await call('website_begin_memory_session',[free,queue()])).toMatchObject({accepted:true,used:1})
 })
 it('manual Premium removes the session limit and revoking it restores the daily cap',async()=>{
  await call('admin_set_manual_premium',[admin,free,true,'Grant unlimited sessions'])
  expect(await call('website_begin_memory_session',[free,queue()])).toMatchObject({accepted:true,used:2})
  await call('admin_set_manual_premium',[admin,free,false,'Restore free tier'])
  expect(await call('website_begin_memory_session',[free,queue()])).toMatchObject({accepted:false,used:2})
 })
 it('denies direct anonymous/authenticated protected APIs and raw guest chapters',async()=>{
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`)
   await expect(call('account_has_premium',[free])).rejects.toThrow('permission denied')
   await expect(call('website_begin_memory_session',[free,queue()])).rejects.toThrow('permission denied')
   await expect(call('admin_set_manual_premium',[admin,free,true,'Client spoof'])).rejects.toThrow('permission denied')
   if(role==='anon')await expect(db.query('select * from chapters')).rejects.toThrow('permission denied')
   await db.exec('reset role')
  }
 })
})
