// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,expect,it} from 'vitest'
let db:PGlite
const actor='11111111-1111-4111-8111-111111111111'
const other='22222222-2222-4222-8222-222222222222'
const parent='33333333-3333-4333-8333-333333333333'
const child='44444444-4444-4444-8444-444444444444'
const sibling='55555555-5555-4555-8555-555555555555'
const title='قِصَّةُ إبراهيم — الدرس  الأول!'
type Result={rows:{id:string;title:string;group_id:string|null}[];total:number;groups:{id:string;direct_count:number;transcript_count:number}[];ungrouped:number}
async function list(search='',group:string|null=null,ungrouped=false,page=0){const result=await db.query<{result:Result}>('select public.admin_list_manual_transcripts($1,$2,$3,$4,$5) result',[actor,page,search,group,ungrouped]);return result.rows[0].result}
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`
 create role anon;create role authenticated;create role service_role;
 create schema transcript_private;
 create function public.account_role(p uuid) returns text language sql as $$select case when p='${actor}' then 'admin' else 'user' end$$;
 create table public.episodes(id uuid primary key default gen_random_uuid(),youtube_id text);
 create table public.youtube_transcripts(id uuid primary key default gen_random_uuid(),youtube_id text unique,canonical_url text,title text,channel text,thumbnail text,
 duration_seconds double precision,provider text,status text default 'ready',translation_status text default 'ready',searchable boolean default true,
 created_at timestamptz default now(),updated_at timestamptz default now(),error_code text,source_origin text default 'website_admin_transcript',episode_id uuid,raw_transcript jsonb);
 create table transcript_private.translations(transcript_id uuid references public.youtube_transcripts(id));
 create function public.admin_import_youtube_transcript(p_actor uuid,p_youtube_id text,p_title text,p_channel text,p_raw jsonb,p_searchable boolean) returns uuid language plpgsql as $$
 declare result uuid;begin insert into public.youtube_transcripts(youtube_id,title,channel,raw_transcript,provider,searchable,duration_seconds) values(p_youtube_id,p_title,p_channel,p_raw,'manual',p_searchable,5) returning id into result;return result;end$$;
 create function public.admin_update_transcript_json(p_actor uuid,p_id uuid,p_raw jsonb,p_title text,p_channel text,p_searchable boolean,p_updated_at timestamptz) returns timestamptz language plpgsql as $$
 declare result timestamptz;begin
 if (select updated_at from public.youtube_transcripts where id=p_id) is distinct from p_updated_at then raise exception 'transcript_edit_conflict';end if;
 update public.youtube_transcripts set title=p_title,channel=p_channel,raw_transcript=p_raw,searchable=p_searchable,updated_at=clock_timestamp() where id=p_id returning updated_at into result;return result;end$$;
 insert into public.youtube_transcripts(youtube_id,title,provider,source_origin) values('MANUAL00001','${title}','manual','website_admin_transcript'),('SHOW0000001','Show episode','curated','awm'),('UNKNOWN0001','Unknown manual','manual','legacy_unknown'),('GENERATED01','Generated','gladia','website_admin_transcript'),('OVERLAP0001','Episode import','manual','website_admin_transcript');
 insert into public.episodes(youtube_id) values('SHOW0000001'),('OVERLAP0001');
 insert into public.youtube_transcripts(youtube_id,title,provider) select 'P'||lpad(n::text,10,'0'),'Lesson '||n,'manual' from generate_series(1,35) n;
 `)
 await db.exec(readFileSync('supabase/migrations/20261008161532_transcript_groups_manual_library.sql','utf8'))
 await db.exec(`insert into public.transcript_groups(id,name,parent_id) values('${parent}','Islamic Lectures',null),('${child}','Stories of the Prophets','${parent}'),('${sibling}','Tafsir','${parent}');
 update public.admin_manual_transcripts set group_id='${parent}' where transcript_id=(select id from public.youtube_transcripts where youtube_id='P0000000001');
 update public.admin_manual_transcripts set group_id='${child}' where transcript_id=(select id from public.youtube_transcripts where youtube_id='MANUAL00001');`)
},20000)
afterAll(async()=>{await db?.close()})
it('backfills only proven manual imports without deleting shared records or episodes',async()=>{
 expect((await list()).total).toBe(36)
 expect((await db.query<{count:number}>('select count(*)::integer count from public.youtube_transcripts')).rows[0].count).toBe(40)
 expect((await db.query<{count:number}>('select count(*)::integer count from public.episodes')).rows[0].count).toBe(2)
 for(const search of ['Show episode','Unknown manual','Generated','Episode import'])expect((await list(search)).total).toBe(0)
})
it('finds exact, partial, Arabic variants, diacritics, punctuation and whitespace across all pages',async()=>{
 for(const search of [title,'قصة ابراهيم الدرس الاول','قصة إبراهيم','  قِصَّةُ   إبراهيم - الدرس الأول  '])expect((await list(search)).rows[0].title).toBe(title)
 expect((await list('lesson')).total).toBe(35)
 expect((await list('LESSON 35')).rows).toHaveLength(1)
 expect((await list('',null,false,1)).rows).toHaveLength(6)
 // Search uses literal substring matching; % is never a query wildcard.
 expect((await list('%')).total).toBe(36) // punctuation-only search normalises to empty
})
it('searches parent and subgroup names and returns database counts without duplication',async()=>{
 expect((await list('Islamic Lectures')).total).toBe(2)
 expect((await list('Stories of the Prophets')).rows[0].title).toBe(title)
 expect((await list('',parent)).total).toBe(2)
 expect((await list('',child)).total).toBe(1)
 const result=await list();expect(result.groups.find(group=>group.id===parent)).toMatchObject({direct_count:1,transcript_count:2})
 expect(result.ungrouped).toBe(34)
 expect((await list('',null,true)).total).toBe(34)
})
it('creates and renames groups but prevents deeper nesting and deletion of populated groups',async()=>{
 await expect(db.query('select admin_manage_transcript_group($1,$2,$3)',[actor,'Too deep',child])).rejects.toThrow('Subgroups must belong')
 await expect(db.query('select admin_manage_transcript_group($1,null,null,$2,true)',[actor,child])).rejects.toThrow()
 await expect(db.query('select admin_manage_transcript_group($1,null,null,$2,true)',[actor,parent])).rejects.toThrow()
 const subgroup=(await db.query<{id:string}>('select admin_manage_transcript_group($1,$2,$3) id',[actor,'Vocabulary',parent])).rows[0].id
 expect((await db.query<{parent_id:string}>('select parent_id from transcript_groups where id=$1',[subgroup])).rows[0].parent_id).toBe(parent)
 await db.query('select admin_manage_transcript_group($1,null,null,$2,true)',[actor,subgroup])
 const group=(await db.query<{id:string}>('select admin_manage_transcript_group($1,$2) id',[actor,'Empty group'])).rows[0].id
 await db.query('select admin_manage_transcript_group($1,$2,null,$3)',[actor,'Renamed group',group])
 expect((await db.query<{name:string}>('select name from transcript_groups where id=$1',[group])).rows[0].name).toBe('Renamed group')
 await db.query('select admin_manage_transcript_group($1,null,null,$2,true)',[actor,group])
 expect((await list('',child)).rows[0].title).toBe(title)
})
it('imports into a subgroup and atomically edits metadata, moves and returns to Ungrouped',async()=>{
 const raw={content:[{text:'مرحبا',offset:0,duration:5000,tokens:[{ar:'مرحبا',english:'hello',pos:'noun',headword:'مرحبا',entry_type:'word',transliteration:'marhaban'}]}]}
 const created=(await db.query<{id:string}>('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,$6,657) id',[actor,'NEWVIDEO001','New manual','Preserved channel',raw,child])).rows[0].id
 expect((await list('New manual')).rows[0]).toMatchObject({id:created,group_id:child})
 let previous=(await db.query<{updated_at:string}>('select updated_at from youtube_transcripts where id=$1',[created])).rows[0].updated_at
 await db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7,$8,$9)',[actor,created,raw,'Renamed Arabic title','Preserved channel',previous,'NEWVIDEO002',parent,4257])
 expect((await list('Renamed Arabic')).rows[0]).toMatchObject({id:created,group_id:parent})
 previous=(await db.query<{updated_at:string}>('select updated_at from youtube_transcripts where id=$1',[created])).rows[0].updated_at
 await db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7,null,null)',[actor,created,raw,'Moved back','Preserved channel',previous,'NEWVIDEO002'])
 expect((await list('Moved back',null,true)).rows[0]).toMatchObject({id:created,group_id:null})
 const record=(await db.query<{raw_transcript:unknown;channel:string;duration_seconds:number;canonical_url:string}>('select raw_transcript,channel,duration_seconds,canonical_url from youtube_transcripts where id=$1',[created])).rows[0]
 expect(record).toMatchObject({raw_transcript:raw,channel:'Preserved channel',duration_seconds:4257,canonical_url:'https://www.youtube.com/watch?v=NEWVIDEO002'})
 await expect(db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7,$8,1)',[actor,created,raw,'Should roll back','Channel',previous,'NEWVIDEO002',child])).rejects.toThrow()
 expect((await list('Moved back',null,true)).total).toBe(1)
})
it('rejects duplicate imports, stale edits, invalid groups and episode-linked target videos',async()=>{
 const raw={content:[{text:'مرحبا',offset:0,duration:5000}]}
 await expect(db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true)',[actor,'MANUAL00001','Duplicate','',raw])).rejects.toThrow('already exists')
 await expect(db.query('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,$6)',[actor,'ROLLBACK001','Rollback','',raw,other])).rejects.toThrow()
 expect((await list('Rollback')).total).toBe(0)
 const record=(await db.query<{id:string;updated_at:string}>('select id,updated_at from youtube_transcripts where youtube_id=$1',['MANUAL00001'])).rows[0]
 await expect(db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7)',[actor,record.id,raw,'Changed','',record.updated_at,'SHOW0000001'])).rejects.toThrow('Only manual')
 await expect(db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7)',[actor,record.id,raw,'Changed','','2000-01-01','MANUAL00001'])).rejects.toThrow('transcript_edit_conflict')
})
it('denies non-admin RPC access and client table writes with RLS and grants',async()=>{
 await expect(db.query('select admin_list_manual_transcripts($1)',[other])).rejects.toThrow('Forbidden')
 await expect(db.query('select admin_manage_transcript_group($1,$2)',[other,'Forbidden'])).rejects.toThrow('Forbidden')
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`)
  try {
   await expect(db.query('select * from public.transcript_groups')).rejects.toThrow('permission denied')
   await expect(db.query('select public.admin_list_manual_transcripts($1)',[actor])).rejects.toThrow('permission denied')
   await expect(db.query('insert into public.admin_manual_transcripts(transcript_id) values($1)',[other])).rejects.toThrow('permission denied')
   await expect(db.query('select public.admin_manage_transcript_group($1,$2)',[actor,'Blocked'])).rejects.toThrow('permission denied')
  }finally{await db.exec('reset role')}
 }
 expect((await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where relname in ('transcript_groups','admin_manual_transcripts')")).rows.every(row=>row.relrowsecurity)).toBe(true)
})
