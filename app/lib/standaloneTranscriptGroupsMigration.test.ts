// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,expect,it} from 'vitest'
let db:PGlite
const actor='11111111-1111-4111-8111-111111111111'
const other='22222222-2222-4222-8222-222222222222'
const parent='33333333-3333-4333-8333-333333333333'
const child='44444444-4444-4444-8444-444444444444'
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
 created_at timestamptz default now(),updated_at timestamptz default now(),error_code text,source_origin text default 'website_admin_transcript',episode_id uuid,raw_transcript jsonb,feed_eligible boolean default true,canonical_transcript jsonb,lease_id uuid,lease_until timestamptz);
 create table transcript_segments(id bigserial primary key,transcript_id uuid references youtube_transcripts on delete cascade,position integer,start_seconds double precision,end_seconds double precision,original_text text,english_text text,canonical_paragraph jsonb);
 create table transcript_tokens(segment_id bigint references transcript_segments on delete cascade,surface text);
 create function public.index_youtube_transcript(p_id uuid,p_lease uuid) returns void language plpgsql as $$begin
 insert into public.transcript_segments(transcript_id,position,start_seconds,end_seconds,original_text,canonical_paragraph) select p_id,(ord-1)::int,(c->>'offset')::float8/1000,((c->>'offset')::float8+(c->>'duration')::float8)/1000,c->>'text',c from jsonb_array_elements((select raw_transcript->'content' from public.youtube_transcripts where id=p_id)) with ordinality a(c,ord);
 update public.youtube_transcripts set status='ready',lease_id=null,lease_until=null where id=p_id;
 end$$;
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
 await db.exec(readFileSync('supabase/migrations/20261008171140_standalone_transcript_groups_restore.sql','utf8'))
},20000)
afterAll(async()=>{await db?.close()})
it('restores every old standalone record with no backfill, excluding Shows and unrelated imports',async()=>{
 expect((await list('',null,true)).total).toBe(36)
 expect((await db.query<{n:number}>('select count(*)::int n from admin_manual_transcripts')).rows[0].n).toBe(0)
 expect((await db.query<{n:number}>('select count(*)::int n from youtube_transcripts')).rows[0].n).toBe(40)
 for(const search of ['Show episode','Unknown manual','Generated','Episode import'])expect((await list(search)).total).toBe(0)
 expect((await list('lesson',null,true,1)).rows).toHaveLength(5)
})
it('creates flat groups, preserves legacy internal parents and counts only direct assignments',async()=>{
 await db.exec(`insert into transcript_groups(id,name,parent_id) values('${parent}','Lectures',null),('${child}','Grammar','${parent}');`)
 const id=(await db.query<{id:string}>('select admin_manage_transcript_group($1,$2,$3) id',[actor,'Flat new group',parent])).rows[0].id
 expect((await db.query<{parent_id:string|null}>('select parent_id from transcript_groups where id=$1',[id])).rows[0].parent_id).toBeNull()
 await db.query('select admin_manage_transcript_group($1,$2,null,$3)',[actor,'Grammar renamed',child])
 expect((await db.query<{parent_id:string}>('select parent_id from transcript_groups where id=$1',[child])).rows[0].parent_id).toBe(parent)
})
it('moves to a group and back without changing ANY transcript, segment, token or translation values',async()=>{
 const video=(await db.query<{id:string;updated_at:string}>('select id,updated_at from youtube_transcripts where youtube_id=$1',['MANUAL00001'])).rows[0]
 await db.query('insert into transcript_segments(transcript_id,position,original_text) values($1,0,$2)',[video.id,'Preserved Arabic'])
 await db.exec(`insert into transcript_tokens select id,'Preserved token' from transcript_segments;`)
 await db.query('insert into transcript_private.translations values($1)',[video.id])
 const snapshot=()=>db.query('select (select jsonb_agg(to_jsonb(t)) from youtube_transcripts t) videos,(select jsonb_agg(to_jsonb(s)) from transcript_segments s) segments,(select jsonb_agg(to_jsonb(k)) from transcript_tokens k) tokens,(select jsonb_agg(to_jsonb(j)) from transcript_private.translations j) translations,(select jsonb_agg(to_jsonb(e)) from episodes e) episodes')
 const before=(await snapshot()).rows
 await db.query('select admin_move_standalone_transcript($1,$2,$3,null,$4)',[actor,video.id,child,video.updated_at])
 expect((await list('',child)).rows[0].id).toBe(video.id)
 expect((await list('',parent)).total).toBe(0)
 expect((await list()).groups.find(g=>g.id===parent)?.transcript_count).toBe(0)
 await expect(db.query('select admin_move_standalone_transcript($1,$2,$3,null,$4)',[actor,video.id,parent,video.updated_at])).rejects.toThrow('transcript_group_conflict')
 await db.query('select admin_move_standalone_transcript($1,$2,null,$3,$4)',[actor,video.id,child,video.updated_at])
 expect((await list(title,null,true)).rows[0].id).toBe(video.id)
 expect((await snapshot()).rows).toEqual(before)
})
it('imports with optional group and still supports actual edits through the existing indexer',async()=>{
 const raw={content:[{text:'مرحبا',offset:1234,duration:5000,english:'Hello',tokens:[{arabic:'مرحبا',english:'hello',POS:'noun',headword:'مرحبا',entry_type:'word',transliteration:'marhaban'}]}]}
 const id=(await db.query<{id:string}>('select admin_import_grouped_transcript($1,$2,$3,$4,$5,true,null,null) id',[actor,'NEWVIDEO001','New ungrouped','Channel',raw])).rows[0].id
 expect((await list('New ungrouped',null,true)).rows[0].id).toBe(id)
 let version=(await db.query<{v:string}>('select updated_at v from youtube_transcripts where id=$1',[id])).rows[0].v
 await db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7,$8,657)',[actor,id,raw,'Edited title','Channel',version,'NEWVIDEO001',parent])
 expect((await list('Edited title',parent)).rows[0].id).toBe(id)
 expect((await db.query<{raw:unknown}>('select raw_transcript raw from youtube_transcripts where id=$1',[id])).rows[0].raw).toMatchObject(raw)
 version=(await db.query<{v:string}>('select updated_at v from youtube_transcripts where id=$1',[id])).rows[0].v
 await expect(db.query('select admin_save_grouped_transcript($1,$2,$3,$4,$5,true,$6,$7,$8,1)',[actor,id,raw,'Invalid duration','Channel',version,'NEWVIDEO001',parent])).rejects.toThrow('Video duration')
 expect((await list('Edited title')).total).toBe(1)
})
it('denies Show moves, non-admins, stale versions and client table access',async()=>{
 const video=(await db.query<{id:string;updated_at:string}>('select id,updated_at from youtube_transcripts where youtube_id=$1',['SHOW0000001'])).rows[0]
 await expect(db.query('select admin_move_standalone_transcript($1,$2,null,null,$3)',[actor,video.id,video.updated_at])).rejects.toThrow('Only manual')
 await expect(db.query('select admin_list_manual_transcripts($1)',[other])).rejects.toThrow('Forbidden')
 await expect(db.query('select admin_move_standalone_transcript($1,$2,null,null,$3)',[other,video.id,video.updated_at])).rejects.toThrow('Forbidden')
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);try{await expect(db.query('select * from transcript_groups')).rejects.toThrow('permission denied');await expect(db.query('select admin_move_standalone_transcript($1,$2,null,null,$3)',[actor,video.id,video.updated_at])).rejects.toThrow('permission denied')}finally{await db.exec('reset role')}}
})
