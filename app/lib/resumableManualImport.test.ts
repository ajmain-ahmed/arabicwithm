// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,it,expect} from 'vitest'
import {normaliseManualTranscriptJson} from './manualTranscriptJson'
let db:PGlite
const actor='11111111-1111-4111-8111-111111111111'
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

 await db.exec(`alter table youtube_transcripts add column next_attempt_at timestamptz default now();alter table youtube_transcripts add column source_channel_id text;
 alter table transcript_segments add column for_you_fingerprints text[] default '{}';alter table transcript_segments add column for_you_music_only boolean default false;alter table transcript_segments add column for_you_theme_score real default 0;
 create table transcript_private.for_you_classification_queue(transcript_id uuid primary key references youtube_transcripts on delete cascade);
 create table transcript_private.intro_windows(transcript_id uuid references youtube_transcripts on delete cascade,anchor_id bigint,cohort text,segment_ids bigint[],fingerprints text[],window_size integer);
 create function transcript_private.for_you_hashes(text) returns text[] language sql immutable as $$select regexp_split_to_array($1,' +')$$;
 create function transcript_private.exclude_best_stories_intro(uuid) returns void language sql as $$select$$;
 alter function public.index_youtube_transcript(uuid,uuid) rename to index_youtube_transcript_before_for_you;
 create function transcript_private.classify_for_you(uuid) returns void language plpgsql as $$begin raise exception using errcode='57014',message='Synchronous classifier timeout';end$$;
 `)
 await db.exec(readFileSync('supabase/migrations/20261009164750_resumable_manual_transcript_import.sql','utf8'))
 await db.exec(readFileSync('app/lib/fixtures/manual-import-classifier-reference.sql','utf8'))
},30000)
afterAll(async()=>{await db?.close()})
type State={importId:string;id:string;committed:number;expected:number;tokens:number;completed:boolean;enrichment:string}
async function begin(video:string,raw:unknown,key=video.padEnd(64,'0').replace(/[^a-f0-9]/g,'a'),group:string|null=null){return (await db.query<{s:State}>('select admin_begin_manual_import($1,$2,$3,$4,$5,$6,true,$7,null) s',[actor,key,video,'Batch import','Channel',raw,group])).rows[0].s}
async function append(s:State,limit=100,offset=s.committed,bytes=524288){return (await db.query<{s:State}>('select admin_append_manual_import($1,$2,$3,$4,$5) s',[actor,s.importId,offset,limit,bytes])).rows[0].s}
async function finish(s:State){return (await db.query<{s:State}>('select admin_finish_manual_import($1,$2) s',[actor,s.importId])).rows[0].s}
const word={arabic:'\u0645\u064e\u0631\u0652\u062d\u064e\u0628\u064b\u0627',english:'hello',pos:'noun',headword:'\u0645\u0631\u062d\u0628\u0627',entry_type:'word',transliteration:'marhaban',custom:{untouched:true}}
it('small source retains arbitrary fields, diacritics, nullable endpoints and grouping',async()=>{
 const group=(await db.query<{id:string}>('insert into transcript_groups default values returning id')).rows[0].id
 const input=JSON.stringify([{text:word.arabic+' 42%',start_ms:1234,english:'Hello',tokens:[word],custom:{retain:42}},{text:'last',start_ms:1234,tokens:[null]}]),raw=normaliseManualTranscriptJson(input)
 let s=await begin('aaaaaa00001',{...raw,_source_json:input},undefined,group)
 await expect(finish(s)).rejects.toThrow('verification failed')
 s=await append(s,1);expect(s.committed).toBe(1)
 expect((await db.query('select status,searchable,lease_until::text,next_attempt_at::text from youtube_transcripts where id=$1',[s.id])).rows[0]).toMatchObject({status:'indexing',searchable:false,lease_until:'infinity',next_attempt_at:'infinity'})
 s=await append(s,1);s=await finish(s);expect(s).toMatchObject({completed:true,committed:2,enrichment:'partial'})
 expect((await db.query<{source:unknown;original_json:string}>('select source,original_json from transcript_private.manual_sources where transcript_id=$1',[s.id])).rows[0]).toEqual({source:raw,original_json:input})
 expect((await db.query<{end_seconds:null}>('select end_seconds from transcript_segments where transcript_id=$1 order by position',[s.id])).rows.map(r=>r.end_seconds)).toEqual([null,null])
 expect((await db.query<{group_id:string}>('select group_id from admin_manual_transcripts where transcript_id=$1',[s.id])).rows[0].group_id).toBe(group)
 expect((await db.query<{feed_eligible:boolean}>('select feed_eligible from youtube_transcripts where id=$1',[s.id])).rows[0].feed_eligible).toBe(false)
 await db.query('select transcript_private.classify_for_you($1)',[s.id])
 expect((await db.query<{feed_eligible:boolean}>('select feed_eligible from youtube_transcripts where id=$1',[s.id])).rows[0].feed_eligible).toBe(true)
})
it('large enriched source resumes committed batches, handles lost acknowledgements and checks all records before publishing',async()=>{
 const content=Array.from({length:2400},(_,i)=>({text:word.arabic+' '+i,offset:Math.floor(i/2)*1000,duration:i===2399?null:1000,english:'Translation '+i,tokens:Array.from({length:12},()=>word),metadata:{source:i}}))
 const raw={provider:'manual',lang:'ar',content},key='b'.repeat(64)
 let s=await begin('bbbbbb00002',raw,key)
 s=await append(s);expect(s.committed).toBe(100)
 const ack=await append(s,100,0);expect(ack).toEqual(s)
 const resume=await begin('bbbbbb00002',raw,key);expect(resume).toEqual(s)
 while(s.committed<s.expected)s=await append(s)
 s=await finish(s);expect(s).toMatchObject({completed:true,committed:2400,tokens:4800,enrichment:'ready'})
 expect(await finish(s)).toEqual(s)
 expect((await db.query<{raw:unknown}>('select raw_transcript raw from youtube_transcripts where id=$1',[s.id])).rows[0].raw).toEqual(raw)
 const saved=(await db.query<{position:number;start_seconds:number;end_seconds:number|null;original_text:string;c:{tokens:unknown[]}}> ('select position,start_seconds,end_seconds,original_text,canonical_paragraph c from transcript_segments where transcript_id=$1 order by position',[s.id])).rows
 expect(saved).toHaveLength(content.length)
 saved.forEach((r,i)=>{expect(r.position).toBe(i);expect(r.start_seconds).toBe(content[i].offset/1000);expect(r.end_seconds).toBe(i===2399?null:(content[i].offset+1000)/1000);expect(r.original_text).toBe(content[i].text);expect(r.c.tokens).toHaveLength(12)})
 expect((await db.query('select * from transcript_private.manual_import_batches where import_id=$1',[s.importId])).rows).toHaveLength(24)
},30000)
it('a 57014 rolls back only the current batch, and retry neither duplicates nor loses data',async()=>{
 const raw={content:Array.from({length:105},(_,i)=>({text:'word '+i,offset:i*1000,duration:null}))}
 let s=await begin('cccccc00003',raw,'c'.repeat(64));s=await append(s)
 await db.exec(`create function batch_fail() returns trigger language plpgsql as $$begin if new.position=102 then raise exception using errcode='57014',message='Simulated statement timeout';end if;return new;end$$;create trigger batch_fail before insert on transcript_segments for each row execute function batch_fail()`)
 await expect(append(s)).rejects.toThrow('Simulated statement timeout')
 expect((await db.query<{n:number}>('select count(*)::int n from transcript_segments where transcript_id=$1',[s.id])).rows[0].n).toBe(100)
 await db.exec('drop trigger batch_fail on transcript_segments');s=await append(s);expect(s.committed).toBe(105);await finish(s)
 expect((await db.query<{end_seconds:number|null}>('select end_seconds from transcript_segments where transcript_id=$1 and position=99',[s.id])).rows[0].end_seconds).toBe(100)
})
it('uses byte-aware limits without truncation, rejects duplicate videos and protects published records',async()=>{
 const raw={content:Array.from({length:10},(_,i)=>({text:'word',offset:i*1000,duration:null,metadata:'x'.repeat(9000)}))}
 let s=await begin('dddddd00004',raw,'d'.repeat(64));s=await append(s,100,0,16384);expect(s.committed).toBe(1)
 while(s.committed<s.expected)s=await append(s,100,s.committed,16384);await finish(s)
 const before=(await db.query('select to_jsonb(t) data from youtube_transcripts t where id=$1',[s.id])).rows
 await expect(begin('dddddd00004',raw,'e'.repeat(64))).rejects.toThrow('already exists')
 expect((await db.query('select to_jsonb(t) data from youtube_transcripts t where id=$1',[s.id])).rows).toEqual(before)
})
it('blocks publication when saved records are missing and denies client/non-admin mutations',async()=>{
 let s=await begin('eeeeee00005',{content:[{text:'safe',offset:0,duration:1000}]},'e'.repeat(64));s=await append(s)
 await db.query('delete from transcript_tokens where segment_id in(select id from transcript_segments where transcript_id=$1)',[s.id])
 await expect(finish(s)).rejects.toThrow('verification failed')
 expect((await db.query('select status,searchable from youtube_transcripts where id=$1',[s.id])).rows[0]).toEqual({status:'indexing',searchable:false})
 await expect(db.query('select admin_manual_import_state($1,$2)',['22222222-2222-4222-8222-222222222222',s.importId])).rejects.toThrow('Forbidden')
 await db.exec('set role authenticated');try{await expect(db.query('select admin_manual_import_state($1,$2)',[actor,s.importId])).rejects.toThrow('permission denied');await expect(db.query('select * from transcript_private.manual_import_jobs')).rejects.toThrow('permission denied')}finally{await db.exec('reset role')}
})
it('preserves classifier decisions when the third matching transcript arrives',async()=>{
 const ids:string[]=[]
 const text='one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen'
 for(let v=0;v<3;v++){
  const raw={content:Array.from({length:30},(_,i)=>({text:i===0?'[Music]':text+' '+i,offset:i*3000,duration:3000}))}
  let s=await begin('fffff00000'+v,raw,(v+1).toString().repeat(64));s=await append(s);s=await finish(s);ids.push(s.id)
  await db.query('select transcript_private.classify_for_you_reference($1)',[s.id])
 }
 const before=(await db.query<{id:number;score:number;music:boolean}>('select id,for_you_theme_score score,for_you_music_only music from transcript_segments where transcript_id=any($1::uuid[]) order by id',[ids])).rows
 expect(before.some(r=>r.score>0)).toBe(true);expect(before.filter(r=>r.music)).toHaveLength(3)
 await db.query('select transcript_private.classify_for_you($1)',[ids[2]])
 expect((await db.query('select id,for_you_theme_score score,for_you_music_only music from transcript_segments where transcript_id=any($1::uuid[]) order by id',[ids])).rows).toEqual(before)
},20000)
