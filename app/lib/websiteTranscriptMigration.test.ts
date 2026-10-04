// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const admin = '11111111-1111-4111-8111-111111111111', user = '22222222-2222-4222-8222-222222222222'
let id: string
describe('website generation migration and shared transcript boundaries', () => {
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema transcript_private;
      create table roles(id uuid primary key, role text);
      insert into roles values('${admin}','admin'),('${user}','user');
      create function public.account_role(p uuid) returns text language sql as 'select role from public.roles where id=p';
      create table youtube_transcripts(id uuid primary key default gen_random_uuid(),youtube_id text unique,
        canonical_url text,title text default 'Video',channel text,thumbnail text,duration_seconds double precision,
        provider text default 'supadata',status text default 'queued',searchable boolean default true,
        feed_eligible boolean default true,translation_status text default 'unavailable',episode_id uuid,
        raw_transcript jsonb,lease_id uuid,lease_until timestamptz,error_code text,updated_at timestamptz default now());
      create table transcript_segments(id bigserial primary key,transcript_id uuid references youtube_transcripts on delete cascade,
        position integer,start_seconds double precision,end_seconds double precision,original_text text,normalised_text text,english_text text);
      create table transcript_tokens(segment_id bigint references transcript_segments on delete cascade,surface text);
      create table user_video_library(user_id uuid,transcript_id uuid references youtube_transcripts on delete cascade);
      create table transcript_private.guest_imports(transcript_id uuid references youtube_transcripts on delete cascade);
      create table transcript_private.translations(transcript_id uuid primary key references youtube_transcripts on delete cascade,
        source_hash text,status text default 'queued',error_code text);
      create table dictionary(word text); insert into dictionary values('shared');
      create table legacy_calls(id uuid);
      alter table youtube_transcripts enable row level security;
      alter table transcript_segments enable row level security;
      create function public.normalise_transcript_word(input text) returns text language sql immutable as $$
        select btrim(regexp_replace(regexp_replace(translate(normalize(input,NFKC),'أإآٱى','ااااي'),
        U&'[\\0610-\\061A\\064B-\\065F\\0670\\06D6-\\06ED\\0640]','','g'),'[^[:alnum:]]+',' ','g'));
      $$;
      create function public.register_youtube_transcript(p_user uuid,p_youtube_id text) returns uuid language plpgsql as $$
        declare v uuid; begin insert into public.youtube_transcripts(youtube_id,canonical_url) values(p_youtube_id,'https://www.youtube.com/watch?v='||p_youtube_id) returning id into v;
        insert into public.user_video_library values(p_user,v); return v; end $$;
      create function public.index_youtube_transcript(p_id uuid,p_lease uuid) returns void language sql as 'insert into public.legacy_calls values(p_id)';
      create function transcript_private.queue_translation() returns trigger language plpgsql as 'begin return new; end';
      create trigger transcript_translation_queue after insert or update of status on youtube_transcripts for each row execute function transcript_private.queue_translation();
      create function public.search_transcript_word(p_word text,p_after bigint default 0,p_limit integer default 20,p_after_rank integer default 0)
      returns table(segment_id bigint,transcript_id uuid,youtube_id text,title text,channel text,thumbnail text,
        duration_seconds double precision,original_text text,start_seconds double precision,end_seconds double precision,
        matched_surfaces text[],previous_text text,next_text text,previous_start double precision,next_end double precision,
        match_type text,match_rank integer,english_text text)
      language sql as $$ select s.id,t.id,t.youtube_id,t.title,t.channel,t.thumbnail,t.duration_seconds,s.original_text,s.start_seconds,s.end_seconds,
        array[k.surface],null::text,null::text,null::double precision,null::double precision,'exact'::text,0,s.english_text
        from public.transcript_tokens k join public.transcript_segments s on s.id=k.segment_id join public.youtube_transcripts t on t.id=s.transcript_id
        where k.surface=p_word and t.status='ready' and t.searchable and (0,s.id)>(p_after_rank,p_after) order by s.id limit p_limit $$;
    `)
    await db.exec(readFileSync('supabase/migrations/20261004100332_website_transcript_generation.sql', 'utf8'))
  })
  afterAll(async () => { await db?.close() })
  it('rejects non-admin actors and direct authenticated generation/deletion', async () => {
    await expect(db.query('select admin_generate_youtube_transcript($1,$2)', [user, 'GENERATE001'])).rejects.toThrow('Forbidden')
    await expect(db.query('select admin_delete_youtube_transcript($1,$2)', [user, admin])).rejects.toThrow('Forbidden')
    await db.exec('set role authenticated')
    await expect(db.query('select public.admin_generate_youtube_transcript($1,$2)', [admin, 'GENERATE001'])).rejects.toThrow(/permission denied/)
    await expect(db.query('select public.admin_delete_youtube_transcript($1,$2)', [admin, admin])).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  })
  it('deduplicates the video ID without replacing source or invoking another provider', async () => {
    const row = (await db.query<{ result: {id:string;duplicate:boolean} }>('select admin_generate_youtube_transcript($1,$2) result', [admin, 'GENERATE001'])).rows[0].result
    id = row.id; expect(row.duplicate).toBe(false)
    const duplicate = (await db.query<{ result: {id:string;duplicate:boolean} }>('select admin_generate_youtube_transcript($1,$2) result', [admin, 'GENERATE001'])).rows[0].result
    expect(duplicate).toEqual({ id, duplicate: true })
    expect((await db.query<{ searchable:boolean;provider:string }>('select searchable,provider from youtube_transcripts where id=$1',[id])).rows[0]).toEqual({searchable:false,provider:'supadata'})
  })
  it('keeps real integer timing chronological, skips enrichment, and queues translation', async () => {
    const raw = { lang:'ar',content:[{text:'عندما تشعر أنك لست وحدك',offset:84200,duration:5500},{text:'حياكم الله',offset:0,duration:5270}] }
    await db.query('update youtube_transcripts set raw_transcript=$2,lease_id=$3 where id=$1',[id,JSON.stringify(raw),admin])
    await db.query('select index_youtube_transcript($1,$2)',[id,admin])
    const segments = (await db.query<{start_ms:number;end_ms:number;original_text:string}>('select start_ms,end_ms,original_text from transcript_segments where transcript_id=$1 order by position',[id])).rows
    expect(segments).toEqual([{start_ms:0,end_ms:5270,original_text:'حياكم الله'},{start_ms:84200,end_ms:89700,original_text:'عندما تشعر أنك لست وحدك'}])
    expect((await db.query('select * from transcript_tokens')).rows).toHaveLength(0)
    expect((await db.query('select * from legacy_calls')).rows).toHaveLength(0)
    expect((await db.query('select * from transcript_private.translations where transcript_id=$1',[id])).rows).toHaveLength(1)
    expect((await db.query('select * from search_transcript_word($1)', ['حياكم'])).rows).toHaveLength(0)
    await expect(db.query('update youtube_transcripts set searchable=true where id=$1',[id])).rejects.toThrow('generation_incomplete')
  })
  it('reports translation failure without publication, then publishes complete paired English for the existing search', async () => {
    await db.query("update transcript_private.translations set status='unavailable',error_code='provider_upgrade_required' where transcript_id=$1",[id])
    expect((await db.query<{searchable:boolean;error_code:string}>('select searchable,error_code from youtube_transcripts where id=$1',[id])).rows[0]).toEqual({searchable:false,error_code:'provider_upgrade_required'})
    await db.query("update transcript_segments set english_text=case position when 0 then 'Welcome' else 'When you feel that you are not alone' end where transcript_id=$1",[id])
    await db.query("update transcript_private.translations set status='ready',error_code=null where transcript_id=$1",[id])
    await db.query("update youtube_transcripts set translation_status='ready' where id=$1",[id])
    const hits = (await db.query<{transcript_id:string;start_seconds:number;english_text:string}>('select * from search_transcript_word($1)', ['حَيـاكم'])).rows
    expect(hits).toHaveLength(1);expect(hits[0]).toEqual(expect.objectContaining({transcript_id:id,start_seconds:0,english_text:'Welcome'}))
    expect((await db.query('select * from search_transcript_word($1)', ['عندما تشعر'])).rows).toHaveLength(1)
    expect((await db.query('select * from search_transcript_word($1)', ['not alone'])).rows).toHaveLength(1)
    const firstId = (await db.query<{id:number}>('select id from transcript_segments where transcript_id=$1 order by position',[id])).rows[0].id
    expect((await db.query('select * from search_transcript_word($1,$2,20,1)', ['حياكم',firstId])).rows).toHaveLength(0)
  })
  it('retains legacy indexing and deletes all owned rows for any origin without touching shared data', async () => {
    const legacy=(await db.query<{id:string}>("insert into youtube_transcripts(youtube_id,lease_id) values('LEGACY00001',$1) returning id",[admin])).rows[0].id
    await db.query('select index_youtube_transcript($1,$2)',[legacy,admin])
    expect((await db.query('select * from legacy_calls where id=$1',[legacy])).rows).toHaveLength(1)
    await db.query('insert into transcript_private.guest_imports values($1)',[id])
    await db.query('insert into transcript_tokens select id,$2 from transcript_segments where transcript_id=$1',[id,'owned token'])
    await db.query('select admin_delete_youtube_transcript($1,$2)',[admin,id])
    for(const table of ['transcript_segments','user_video_library','transcript_private.guest_imports','transcript_private.translations']) {
      expect((await db.query(`select * from ${table} where transcript_id=$1`,[id])).rows).toHaveLength(0)
    }
    expect((await db.query('select * from transcript_tokens')).rows).toHaveLength(0)
    expect((await db.query('select * from dictionary')).rows).toHaveLength(1)
    expect((await db.query('select * from youtube_transcripts where id=$1',[legacy])).rows).toHaveLength(1)
    expect((await db.query('select * from search_transcript_word($1)', ['حياكم'])).rows).toHaveLength(0)
  })
})
