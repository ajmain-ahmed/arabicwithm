// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
let db:PGlite
const user='11111111-1111-4111-8111-111111111111',a='22222222-2222-4222-8222-222222222222',b='33333333-3333-4333-8333-333333333333'
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;grant usage on schema private to service_role;create table auth.users(id uuid primary key);insert into auth.users values('${user}');create table private.premium(enabled boolean);insert into private.premium values(false);create function private.has_premium(uuid) returns boolean language sql as 'select enabled from private.premium';`)
 await db.exec(readFileSync('supabase/migrations/20261026120000_for_you_daily_usage.sql','utf8'))
})
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('truncate private.website_for_you_daily;update private.premium set enabled=false')})
async function sync(lease=a,total=0,active=true){return (await db.query<{usage:{remainingMs:number|null;unlimited:boolean;busy:boolean;day:string}}>('select public.website_for_you_usage($1,$2,$3,$4) usage',[user,lease,total,active])).rows[0].usage}
async function age(){await db.exec("update private.website_for_you_daily set touched_at=clock_timestamp()-interval '2 seconds'")}
it('persists cumulative usage, ignores duplicate reports, and stops at the exact shared cap',async()=>{
 await sync();await age();expect((await sync(a,1000)).remainingMs).toBe(899000)
 expect((await sync(a,1000)).remainingMs).toBe(899000)
 await db.exec('update private.website_for_you_daily set used_ms=899000');await age()
 expect((await sync(a,2000)).remainingMs).toBe(0)
 expect((await sync(b,0,false)).remainingMs).toBe(0)
})
it('does not charge pauses and blocks simultaneous leases even on idle heartbeats',async()=>{
 await sync();await age();expect((await sync(a,0,false)).remainingMs).toBe(900000)
 await sync(a,0,true)
 expect((await sync(b)).busy).toBe(true)
 expect((await sync(b,0,false)).busy).toBe(true)
 await sync(a,0,false);expect((await sync(b)).busy).toBe(false)
})
it('bounds reports by elapsed server time and recovers abandoned leases',async()=>{
 await sync();expect((await sync(a,900000)).remainingMs).toBeGreaterThan(899000)
 await db.exec("update private.website_for_you_daily set lease_until=clock_timestamp()-interval '1 second'")
 expect((await sync(b)).busy).toBe(false)
})
it('silently starts a new London day and never meters premium accounts',async()=>{
 await db.exec(`insert into private.website_for_you_daily(user_id,activity_date,used_ms) values('${user}',(now() at time zone 'Europe/London')::date-1,900000)`)
 expect((await sync()).remainingMs).toBe(900000)
 await db.exec('truncate private.website_for_you_daily;update private.premium set enabled=true')
 expect(await sync(a,900000)).toMatchObject({unlimited:true,remainingMs:null,busy:false})
 expect((await db.query('select * from private.website_for_you_daily')).rows).toHaveLength(0)
})
it('denies browser roles direct access to usage and the service-only function',async()=>{
 expect((await db.query<{allowed:boolean}>("select has_function_privilege('authenticated','public.website_for_you_usage(uuid,uuid,bigint,boolean)','EXECUTE') allowed")).rows[0].allowed).toBe(false)
 expect((await db.query<{allowed:boolean}>("select has_table_privilege('authenticated','private.website_for_you_daily','SELECT') allowed")).rows[0].allowed).toBe(false)
})
