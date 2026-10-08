// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,it,expect} from 'vitest'
import {normaliseManualTranscriptJson} from './manualTranscriptJson'
let db:PGlite
const actor='11111111-1111-4111-8111-111111111111'
const source=[{text:'مرحبا 50% ١٢٫٥ 2026-10-08 08:22 [Music] Dr. Smith Ω 😀',timestamp:'00:01.234',translation:'Hello!',tokens:{broken:'not an array'}},{text:'English only!',timestamp:'00:01.234',tokens:[{arabic:'',headword:42},null,'!']},{text:'[ضحك] ! 42',timestamp:'00:03.456',tokens:[]}]
let id:string
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema transcript_private;
 create function account_role(p uuid) returns text language sql as $$select case when p='${actor}' then 'admin' else 'user' end$$;
 create table episodes(id uuid primary key default gen_random_uuid(),youtube_id text);
 create table youtube_transcripts(id uuid primary key default gen_random_uuid(),youtube_id text unique,canonical_url text,title text,channel text not null,thumbnail text,provider text,status text,translation_status text,searchable boolean,raw_transcript jsonb,lease_id uuid,lease_until timestamptz,duration_seconds float8,source_origin text,episode_id uuid,created_at timestamptz default now(),updated_at timestamptz default now(),canonical_transcript jsonb,error_code text,feed_eligible boolean default true);
 create table transcript_segments(id bigserial primary key,transcript_id uuid references youtube_transcripts on delete cascade,position int not null,start_seconds float8 not null check(start_seconds>=0 and start_seconds<=43200),end_seconds float8 not null check(end_seconds>=start_seconds and end_seconds<=43200),original_text text not null,normalised_text text not null,english_text text,canonical_paragraph jsonb,unique(transcript_id,position));
 create table transcript_tokens(segment_id bigint references transcript_segments on delete cascade,position int not null,surface text not null,normalised text not null,lemma text,root text,primary key(segment_id,position));
 create table transcript_private.translations(transcript_id uuid references youtube_transcripts on delete cascade);
 create table transcript_private.lexicon(normalised text,lemma text,root text,source text);
 create function normalise_transcript_word(value text) returns text language sql immutable as $$select lower(normalize(value,NFKC))$$;
 create function transcript_private.canonical_timestamp(p float8) returns text language sql immutable as $$select lpad((floor(p)::int/60)::text,2,'0')||':'||lpad((floor(p)::int%60)::text,2,'0')$$;
 create function admin_record_transcript_origin(p_actor uuid,p_id uuid) returns uuid language plpgsql as $$begin update public.youtube_transcripts set source_origin='website_admin_transcript' where id=p_id;return p_id;end$$;
 create table admin_manual_transcripts(transcript_id uuid primary key references youtube_transcripts on delete cascade,group_id uuid);
 create table transcript_groups(id uuid primary key default gen_random_uuid());
 alter table admin_manual_transcripts add foreign key(group_id) references transcript_groups;
 `)
 await db.exec(readFileSync('app/lib/fixtures/manual-source-live-functions.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261008182737_manual_awm_import_compatibility.sql','utf8'))
 await db.exec(`create trigger guard_segment before insert or update of canonical_paragraph on transcript_segments for each row execute function transcript_private.guard_canonical_write();create trigger guard_video before insert or update of canonical_transcript on youtube_transcripts for each row execute function transcript_private.guard_canonical_write();`)
 await db.exec(readFileSync('supabase/migrations/20261008195310_manual_transcript_source_first.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261008200317_manual_source_retry_preservation.sql','utf8'))
},20000)
afterAll(async()=>{await db?.close()})
async function snapshot(){return (await db.query<{videos:unknown;segments:unknown;tokens:unknown;sources:unknown}>('select (select jsonb_agg(to_jsonb(t) order by id) from youtube_transcripts t) videos,(select jsonb_agg(to_jsonb(s) order by id) from transcript_segments s) segments,(select jsonb_agg(to_jsonb(t) order by segment_id,position) from transcript_tokens t) tokens,(select jsonb_agg(to_jsonb(s) order by transcript_id) from transcript_private.manual_sources s) sources')).rows}
it('imports mixed content and completely malformed enrichment through actual RPC and canonical triggers',async()=>{
 const input=JSON.stringify(source),raw=normaliseManualTranscriptJson(input)
 const result=(await db.query<{result:{id:string;enrichment:string}}>('select admin_import_manual_source($1,$2,$3,$4,$5,true,null,null) result',[actor,'SOURCE00001','Readable source','', {...raw,_source_json:input}])).rows[0].result
 id=result.id;expect(result.enrichment).toBe('unavailable')
 const saved=(await db.query<{raw:unknown;status:string}>('select raw_transcript raw,status from youtube_transcripts where id=$1',[id])).rows[0]
 expect(saved).toMatchObject({raw,status:'ready'})
 const rows=(await db.query<{original_text:string;english_text:string|null;start_seconds:number;end_seconds:number|null}>('select * from transcript_segments where transcript_id=$1 order by position',[id])).rows
 expect(rows.map(s=>s.original_text)).toEqual(source.map(s=>s.text));expect(rows.map(s=>[s.start_seconds,s.end_seconds])).toEqual([[1.234,3.456],[1.234,3.456],[3.456,null]])
 expect(rows[0].english_text).toBe('Hello!')
 expect((await db.query<{original:string}>('select original_json original from transcript_private.manual_sources where transcript_id=$1',[id])).rows[0].original).toBe(input)
 expect((await db.query('select surface from transcript_tokens where surface=$1',['50%'])).rows).toHaveLength(1)
})
it('preserves valid enrichment and reports partial enrichment independently of import status',async()=>{
 const valid={arabic:'مرحبا',english:'hello',pos:'noun',headword:'مرحبا',entry_type:'word',transliteration:'marhaba',custom:{keep:true}}
 const raw=normaliseManualTranscriptJson(JSON.stringify([{text:'مرحبا',start_ms:0,end_ms:1000,tokens:[valid]},{text:'unknown 42',start_ms:1000,tokens:[{arabic:'42',headword:42}]}]))
 const result=(await db.query<{result:{id:string;enrichment:string}}>('select admin_import_manual_source($1,$2,$3,$4,$5,true,null,null) result',[actor,'PARTIAL0001','Partial','Channel',raw])).rows[0].result
 expect(result.enrichment).toBe('partial')
 expect((await db.query<{c:{tokens:unknown[]}}>('select canonical_paragraph c from transcript_segments where transcript_id=$1 and position=0',[result.id])).rows[0].c.tokens[0]).toMatchObject({arabic:'مرحبا',headword:'مرحبا'})
 expect((await db.query<{raw:unknown}>('select raw_transcript raw from youtube_transcripts where id=$1',[result.id])).rows[0].raw).toEqual(raw)
 const complete=(await db.query<{result:{enrichment:string}}>('select admin_import_manual_source($1,$2,$3,$4,$5,true,null,null) result',[actor,'COMPLETE001','Complete','Channel',{...raw,content:[raw.content[0]]}])).rows[0].result
 expect(complete.enrichment).toBe('ready')
})
it('allows retry without uploading, reindexing source, or changing timestamps and published data',async()=>{
 const before=await snapshot();await db.query('select admin_retry_manual_enrichment($1,$2)',[actor,id]);const after=await snapshot()
 expect(after[0].videos).toEqual(before[0].videos);expect(after[0].segments).toEqual(before[0].segments);expect(after[0].tokens).toEqual(before[0].tokens)
})
it('records optional dictionary failures internally while genuine storage failures roll back',async()=>{
 await db.exec(`create or replace function transcript_private.enrich_tokens(p_id uuid default null) returns void language plpgsql as $$begin raise exception 'Unsupported dictionary token';end$$`)
 const raw=normaliseManualTranscriptJson(JSON.stringify(source))
 const result=(await db.query<{result:{id:string;enrichment:string}}>('select admin_import_manual_source($1,$2,$3,$4,$5,true,null,null) result',[actor,'DICTSFAIL01','Dictionary fallback','Channel',raw])).rows[0].result
 expect(result.enrichment).toBe('unavailable');expect((await db.query<{d:unknown}>('select diagnostics d from transcript_private.manual_sources where transcript_id=$1',[result.id])).rows[0].d).toEqual(expect.arrayContaining([expect.objectContaining({operation:'dictionary enrichment'})]))
 const before=await snapshot();await db.exec(`create function fail_storage() returns trigger language plpgsql as $$begin raise exception using errcode='XX000',message='Genuine storage failure';end$$;create trigger fail_storage before insert on transcript_segments for each row execute function fail_storage();`)
 await expect(db.query('select admin_import_manual_source($1,$2,$3,$4,$5,true,null,null)',[actor,'STOREFAIL01','Storage failure','Channel',raw])).rejects.toThrow('Genuine storage failure')
 expect(await snapshot()).toEqual(before);await db.exec('drop trigger fail_storage on transcript_segments')
})
it('rejects structural errors together and protects an existing record on failed edit or duplicate import',async()=>{
 const before=await snapshot(),raw=normaliseManualTranscriptJson(JSON.stringify(source))
 await expect(db.query('select admin_import_manual_source($1,$2,$3,$4,$5,true,null,null)',[actor,'SOURCE00001','Duplicate','Channel',raw])).rejects.toThrow('already exists')
 const invalid={content:[{text:'',offset:0,duration:-1},{text:3,offset:-1,duration:null}]}
 await expect(db.query('select admin_import_manual_source($1,$2,$3,$4,$5,true,null,null)',[actor,'BADTIME0001','Bad timing','Channel',invalid])).rejects.toThrow(/Segment 1[\s\S]*Segment 2/)
 const version=(await db.query<{v:string}>('select updated_at v from youtube_transcripts where id=$1',[id])).rows[0].v
 await expect(db.query('select admin_save_manual_source($1,$2,$3,$4,$5,true,$6,$7,$8,null)',[actor,id,raw,'Failed edit','Channel',version,'SOURCE00001','22222222-2222-4222-8222-222222222222'])).rejects.toThrow()
 expect(await snapshot()).toEqual(before)
})
it('keeps private snapshots and mutation RPCs unavailable to clients and non-admins',async()=>{
 await expect(db.query('select admin_retry_manual_enrichment($1,$2)',['22222222-2222-4222-8222-222222222222',id])).rejects.toThrow('Forbidden')
 await db.exec('set role authenticated');try{await expect(db.query('select * from transcript_private.manual_sources')).rejects.toThrow('permission denied');await expect(db.query('select admin_retry_manual_enrichment($1,$2)',[actor,id])).rejects.toThrow('permission denied')}finally{await db.exec('reset role')}
})

it('retries a legacy saved transcript without upload and preserves valid existing canonical enrichment',async()=>{
 const complete=(await db.query<{id:string}>('select id from youtube_transcripts where youtube_id=$1',['COMPLETE001'])).rows[0].id
 await db.query('delete from transcript_private.manual_sources where transcript_id=$1',[complete])
 const before=(await db.query('select to_jsonb(t) data from youtube_transcripts t where id=$1',[complete])).rows
 const canonical=(await db.query('select canonical_paragraph from transcript_segments where transcript_id=$1',[complete])).rows
 await db.query('select admin_retry_manual_enrichment($1,$2)',[actor,complete])
 expect((await db.query('select to_jsonb(t) data from youtube_transcripts t where id=$1',[complete])).rows).toEqual(before)
 expect((await db.query('select canonical_paragraph from transcript_segments where transcript_id=$1',[complete])).rows).toEqual(canonical)
 expect((await db.query('select source from transcript_private.manual_sources where transcript_id=$1',[complete])).rows).toHaveLength(1)
})
