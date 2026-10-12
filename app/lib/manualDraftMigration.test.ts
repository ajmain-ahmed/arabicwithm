// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,it,expect} from 'vitest'
let db:PGlite
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333'
const payload={title:'  Unfinished video  ',url:'https://youtu.be/unfinished',channel:'Source',json:'{ "arabic": "مَرْحَبًا",',duration:'unfinished',durationFormat:'minutes',searchable:true,groupId:'44444444-4444-4444-8444-444444444444'}
let version:string
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema transcript_private;grant usage on schema transcript_private to service_role;
 create function account_role(uuid) returns text language sql as $$select case when $1 in('${actor}','${other}') then 'admin' else 'user' end$$;
 create table youtube_transcripts(id uuid);create table transcript_segments(id bigint);create table transcript_groups(id uuid);
 insert into transcript_groups values('${payload.groupId}');`)
 await db.exec(readFileSync('supabase/migrations/20261009172655_manual_transcript_form_drafts.sql','utf8'))
},20000)
afterAll(async()=>{await db?.close()})
async function save(value=payload,v:string|null=null){return (await db.query<{result:{id:string;updatedAt:string}}>('select admin_save_manual_draft($1,$2,$3,$4) result',[actor,id,value,v])).rows[0].result}
it('saves incomplete form text verbatim and lists it in Drafts without importing or publishing',async()=>{
 const saved=await save();version=saved.updatedAt
 expect((await db.query<{d:{payload:unknown}}> ('select admin_load_manual_draft($1,$2) d',[actor,id])).rows[0].d.payload).toEqual(payload)
 const list=(await db.query<{d:{count:number;total:number;rows:Record<string,unknown>[]}}> ('select admin_list_manual_drafts($1,0,$2,true) d',[actor,'Unfinished'])).rows[0].d
 expect(list).toMatchObject({count:1,total:1});expect(list.rows[0]).toMatchObject({id,draft_id:id,title:'Unfinished video',status:'draft',group_id:'drafts',searchable:false})
 expect(list.rows[0]).not.toHaveProperty('json');expect(list.rows[0]).not.toHaveProperty('payload')
 expect((await db.query<{n:number}>('select count(*)::int n from youtube_transcripts')).rows[0].n).toBe(0)
 expect((await db.query<{n:number}>('select count(*)::int n from transcript_segments')).rows[0].n).toBe(0)
 expect((await db.query<{n:number}>('select count(*)::int n from transcript_groups')).rows[0].n).toBe(1)
})
it('replays a lost save acknowledgement without duplication and protects changed drafts from stale saves or deletes',async()=>{
 expect(await save()).toEqual({id,updatedAt:version})
 const changed={...payload,title:'Changed title'},saved=await save(changed,version)
 expect(saved.updatedAt).not.toBe(version)
 await expect(save({...payload,title:'Stale overwrite'},version)).rejects.toThrow('draft_conflict')
 await expect(db.query('select admin_delete_manual_draft($1,$2,$3)',[actor,id,version])).rejects.toThrow('draft_conflict')
 expect((await db.query<{d:{payload:unknown}}> ('select admin_load_manual_draft($1,$2) d',[actor,id])).rows[0].d.payload).toEqual(changed)
 version=saved.updatedAt
})
it('enforces ownership, administrator authorization, RLS and service-only RPC privileges',async()=>{
 await expect(db.query('select admin_load_manual_draft($1,$2)',[other,id])).rejects.toThrow('Draft not found')
 await expect(db.query('select admin_save_manual_draft($1,$2,$3,null)',[other,id,payload])).rejects.toThrow('Forbidden')
 await expect(db.query('select admin_list_manual_drafts($1)',[id])).rejects.toThrow('Forbidden')
 await db.exec('set role authenticated');try{await expect(db.query('select admin_load_manual_draft($1,$2)',[actor,id])).rejects.toThrow('permission denied');await expect(db.query('select * from transcript_private.manual_form_drafts')).rejects.toThrow('permission denied')}finally{await db.exec('reset role')}
 await db.exec('set role service_role');try{expect((await db.query('select admin_load_manual_draft($1,$2) d',[actor,id])).rows).toHaveLength(1)}finally{await db.exec('reset role')}
})
it('can delete a version-matched draft and list an empty group without altering transcripts or groups',async()=>{
 await db.query('select admin_delete_manual_draft($1,$2,$3)',[actor,id,version])
 expect((await db.query<{d:{rows:unknown[];count:number}}> ('select admin_list_manual_drafts($1) d',[actor])).rows[0].d).toMatchObject({rows:[],count:0})
})
