// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,it,expect} from 'vitest'
let db:PGlite
const actor='11111111-1111-4111-8111-111111111111'
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema transcript_private;
 create function account_role(p uuid) returns text language sql as $$select case when p='${actor}' then 'admin' else 'user' end$$;
 create table episodes(youtube_id text);
 create table youtube_transcripts(id uuid primary key default gen_random_uuid(),youtube_id text unique,source_origin text default 'website_admin_transcript',provider text default 'supadata',status text default 'queued',episode_id uuid,searchable boolean default false,feed_eligible boolean default false,title text,raw_transcript jsonb,canonical_transcript jsonb,lease_id uuid,lease_until timestamptz,translation_status text,updated_at timestamptz default now());
 create table transcript_segments(id bigserial primary key,transcript_id uuid references youtube_transcripts(id) on delete cascade,position integer,start_seconds double precision,end_seconds double precision,original_text text,english_text text,canonical_paragraph jsonb);
 create table transcript_private.translations(transcript_id uuid references youtube_transcripts(id));
 create table config(key text);insert into config values('configured');
 create function transcript_provider_key() returns text language sql as $$select key from public.config$$;
 create function admin_record_transcript_origin(p_actor uuid,p_id uuid) returns uuid language sql as $$select p_id$$;
 create function register_youtube_transcript(p_user uuid,p_youtube_id text) returns uuid language plpgsql as $$declare result uuid;begin insert into public.youtube_transcripts(youtube_id,title) values(p_youtube_id,'Draft') returning id into result;return result;end$$;
 create function index_youtube_transcript(p_id uuid,p_lease uuid) returns void language plpgsql as $$begin insert into public.transcript_segments(transcript_id,position,start_seconds,end_seconds,original_text) select p_id,(ord-1)::integer,(c->>'offset')::numeric/1000,((c->>'offset')::numeric+(c->>'duration')::numeric)/1000,c->>'text' from public.youtube_transcripts t cross join lateral jsonb_array_elements(t.raw_transcript->'content') with ordinality a(c,ord) where t.id=p_id;update public.youtube_transcripts set status='ready',lease_id=null,lease_until=null where id=p_id;end$$;
 insert into youtube_transcripts(youtube_id,title) values('EXISTING001','Existing');`)
 await db.exec(readFileSync('supabase/migrations/20261008163950_website_generation_configuration_repair.sql','utf8'))
})
afterAll(async()=>{await db?.close()})
it('preserves existing records and indexer while adding generation configuration',async()=>{
 expect((await db.query("select title,website_generation from youtube_transcripts where youtube_id='EXISTING001'")).rows[0]).toEqual({title:'Existing',website_generation:false})
 expect((await db.query<{definition:string}>("select pg_get_functiondef('index_youtube_transcript(uuid,uuid)'::regprocedure) definition")).rows[0].definition).toContain('insert into public.transcript_segments')
})
it('registers an unpublished draft and safely reuses it for repeated submissions',async()=>{
 const created=(await db.query<{result:{id:string;duplicate:boolean}}>('select admin_generate_youtube_transcript($1,$2) result',[actor,'GENERATE001'])).rows[0].result
 expect(created.duplicate).toBe(false)
 expect((await db.query('select website_generation,searchable,feed_eligible from youtube_transcripts where id=$1',[created.id])).rows[0]).toEqual({website_generation:true,searchable:false,feed_eligible:false})
 expect((await db.query<{result:unknown}>('select admin_generate_youtube_transcript($1,$2) result',[actor,'GENERATE001'])).rows[0].result).toEqual({...created,duplicate:true})
})
it('reports missing credentials and denies invalid videos, episodes and non-admins',async()=>{
 await db.exec("insert into episodes values('EPISODE0001')")
 await expect(db.query('select admin_generate_youtube_transcript($1,$2)',[actor,'EPISODE0001'])).rejects.toThrow('episode_video')
 await db.exec('delete from config')
 await expect(db.query('select admin_generate_youtube_transcript($1,$2)',[actor,'NEWVIDEO001'])).rejects.toThrow('provider_not_configured')
 await db.exec("insert into config values('configured')")
 await expect(db.query('select admin_generate_youtube_transcript($1,$2)',[null,'NEWVIDEO001'])).rejects.toThrow('Forbidden')
 await expect(db.query('select admin_generate_youtube_transcript($1,$2)',[actor,'invalid'])).rejects.toThrow('invalid_request')
 await db.exec('set role authenticated');try{await expect(db.query('select public.admin_generate_youtube_transcript($1,$2)',[actor,'NEWVIDEO001'])).rejects.toThrow('permission denied')}finally{await db.exec('reset role')}
})
it('saves reviewed JSON on the same record and rejects stale edits without overwriting',async()=>{
 const record=(await db.query<{id:string;updated_at:string}>("update youtube_transcripts set status='ready' where youtube_id='GENERATE001' returning id,updated_at")).rows[0]
 const raw={content:[{text:'مرحبا',offset:84200,duration:5500,english:'Hello',tokens:[{arabic:'مرحبا',english:'hello',pos:'noun',headword:null,entry_type:'word',transliteration:'marhaban'}]}]}
 await db.query('select admin_review_generated_transcript($1,$2,$3,$4,$5,$6)',[actor,record.id,raw,'Reviewed',true,record.updated_at])
 expect((await db.query('select title,provider,searchable,raw_transcript from youtube_transcripts where id=$1',[record.id])).rows[0]).toMatchObject({title:'Reviewed',provider:'supadata',searchable:true,raw_transcript:raw})
 expect((await db.query('select start_ms,end_ms,english_text from transcript_segments where transcript_id=$1',[record.id])).rows[0]).toEqual({start_ms:84200,end_ms:89700,english_text:'Hello'})
 await expect(db.query('select admin_review_generated_transcript($1,$2,$3,$4,$5,$6)',[actor,record.id,raw,'Stale',true,record.updated_at])).rejects.toThrow('transcript_edit_conflict')
 expect((await db.query('select title from youtube_transcripts where id=$1',[record.id])).rows[0]).toEqual({title:'Reviewed'})
})
