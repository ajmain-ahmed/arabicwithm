// @vitest-environment node
import {normaliseForYouClip} from './forYouData'
import {PGlite} from '@electric-sql/pglite'
import {readFileSync,writeFileSync} from 'node:fs'
import {beforeAll,afterAll,beforeEach,expect,it} from 'vitest'
let db:PGlite
const source=(i:number)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`
const english='5b98c563-5c35-4696-98e1-06aa000eb622'
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema transcript_private;
 create table public.youtube_transcripts(id uuid primary key,youtube_id text,title text,channel text,thumbnail text,duration_seconds numeric,translation_status text,status text default 'ready',explore_published boolean default true,language text default 'ar',source_origin text default 'website_admin_transcript',episode_id uuid,source_channel_id text,raw_transcript jsonb,error_code text);
 create table public.transcript_segments(id bigint primary key,transcript_id uuid references youtube_transcripts on delete cascade,position integer,original_text text,english_text text,start_seconds numeric,end_seconds numeric,for_you_manual_excluded boolean default false,for_you_music_only boolean default false,for_you_theme_score numeric default 0,canonical_paragraph jsonb,for_you_fingerprints text[]);
 create index segments_source on transcript_segments(transcript_id);
 create table public.episodes(id uuid,youtube_id text);
 create table public.transcript_groups(id uuid primary key,name text,parent_id uuid);
 create table public.admin_manual_transcripts(transcript_id uuid,group_id uuid);
 grant select on all tables in schema public to service_role;`)
 await db.exec(readFileSync('supabase/migrations/20261019000001_for_you_candidates.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261029234847_for_you_live_candidates_and_discovery.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261030002150_for_you_meaningful_clip_quality.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261030003020_for_you_lexical_word_count.sql','utf8'))
 await db.exec(readFileSync('supabase/migrations/20261107140000_home_for_you_spotlight.sql','utf8'))
 await db.exec('grant select on all tables in schema public to service_role')
},30000)
afterAll(async()=>{await db?.close()})

beforeEach(async()=>{
 await db.exec('truncate transcript_segments,for_you_candidates,youtube_transcripts,admin_manual_transcripts,transcript_groups,episodes cascade')
 await db.query('insert into transcript_groups values($1,$2,null)',[english,'English'])
 for(let i=1;i<=25;i++){
  await db.query('insert into youtube_transcripts(id,youtube_id,title,duration_seconds) values($1,$2,$3,120)',[source(i),`videoid${String(i).padStart(4,'0')}`,`Source ${i}`])
  const tokens=JSON.stringify({tokens:[{arabic:'\u0643\u062a\u0627\u0628',english:'book'},{arabic:'\u062c\u0645\u064a\u0644',english:'beautiful'},{arabic:'\u062c\u062f\u064a\u062f',english:'new'}]})
  for(let j=0;j<4;j++)await db.query('insert into transcript_segments(id,transcript_id,position,original_text,english_text,start_seconds,end_seconds,canonical_paragraph) values($1,$2,$3,$4,$5,$6,$7,$8)',[i*100+j,source(i),j,'\u0643\u062a\u0627\u0628 \u062c\u0645\u064a\u0644 \u062c\u062f\u064a\u062f.','A new beautiful book.',j*20,j*20+20,tokens])
 }
})
async function spotlight(seed='one',raw=false){return(await db.query<{clip:import('./forYou').ForYouClip|null}>('select home_for_you_spotlight($1,$2) clip',[seed,raw])).rows[0].clip}
it('returns exactly one canonical, coherent 30-60s clip; different seeds reach different sources',async()=>{
 const seen=new Set<string>()
 for(let i=0;i<20;i++){
  const clip=(await spotlight(String(i)))!;expect(clip).toBeTruthy();seen.add(clip.video.id)
  expect(clip.clip_end_ms-clip.clip_start_ms).toBeGreaterThanOrEqual(30000);expect(clip.clip_end_ms-clip.clip_start_ms).toBeLessThanOrEqual(60000)
  expect(clip.segments.length).toBeGreaterThan(1);expect(clip.segments.every(s=>!!s.canonical_paragraph)).toBe(true)
 }
 expect(seen.size).toBeGreaterThan(5)
})
it('excludes the English subtree by identity even when renamed or also in another group',async()=>{
 await db.query('insert into transcript_groups values($1,$2,$3)',[source(90),'Nested',english])
 await db.query('insert into transcript_groups values($1,$2,null)',[source(91),'Imports'])
 for(let i=2;i<=25;i++)await db.query('insert into admin_manual_transcripts values($1,$2)',[source(i),source(90)])
 await db.query('update transcript_groups set name=$1 where id=$2',['Renamed',english])
 await db.query('insert into admin_manual_transcripts values($1,$2)',[source(2),source(91)])
 for(let i=0;i<10;i++)expect((await spotlight(String(i)))?.video.id).toBe(source(1))
 await db.query('insert into admin_manual_transcripts values($1,$2)',[source(1),english]);expect(await spotlight()).toBeNull()
})
it('retains publication, episode/channel and segment quality restrictions from the canonical feed',async()=>{
 await db.exec("update youtube_transcripts set explore_published=false where title<>'Source 1'")
 await db.query('update transcript_segments set for_you_music_only=true where transcript_id=$1',[source(1)]);expect(await spotlight()).toBeNull()
 await db.query('update transcript_segments set for_you_music_only=false where transcript_id=$1',[source(1)])
 expect(await spotlight()).not.toBeNull()
 await db.query('insert into episodes values($1,$2)',[source(99),'videoid0001']);expect(await spotlight()).toBeNull()
 await db.exec('delete from episodes');await db.query("update youtube_transcripts set channel='ArabicWithM' where id=$1",[source(1)]);expect(await spotlight()).toBeNull()
})
it('rejects short, gapped and overlong windows rather than cutting captions',async()=>{
 await db.exec("update youtube_transcripts set explore_published=false where title<>'Source 1';delete from transcript_segments where position>0")
 expect(await spotlight()).toBeNull()
 await db.query('update transcript_segments set end_seconds=61 where transcript_id=$1',[source(1)]);expect(await spotlight()).toBeNull()
 await db.query("update transcript_segments set end_seconds=45,canonical_paragraph=jsonb_build_object('tokens',(canonical_paragraph->'tokens')||(canonical_paragraph->'tokens')) where transcript_id=$1",[source(1)]);expect((await spotlight())?.clip_end_ms).toBe(45000)
})
it('uses raw source tokens only on the single explicit fallback and never transfers a whole raw transcript',async()=>{
 await db.exec("update youtube_transcripts set explore_published=false where title<>'Source 1'")
 const rows=await db.query<{canonical_paragraph:unknown}>('select canonical_paragraph from transcript_segments where transcript_id=$1 order by position',[source(1)])
 await db.query('update youtube_transcripts set raw_transcript=$1 where id=$2',[JSON.stringify({content:rows.rows.map(r=>r.canonical_paragraph)}),source(1)])
 await db.query('update transcript_segments set canonical_paragraph=null where transcript_id=$1',[source(1)])
 expect(await spotlight()).toBeNull();const clip=(await spotlight('one',true))!;expect(clip).toBeTruthy();expect(JSON.stringify(clip)).not.toContain('raw_transcript');expect(clip.segments[0]).toHaveProperty('source_tokens')
})
it('fails closed if English classification is missing and is service-role only',async()=>{
 const privileges=await db.query<{anon:boolean;member:boolean}>('select has_function_privilege($1,$3,$4) anon,has_function_privilege($2,$3,$4) member',['anon','authenticated','public.home_for_you_spotlight(text,boolean)','execute'])
 expect(privileges.rows[0]).toEqual({anon:false,member:false})
 await db.exec('delete from transcript_groups');await expect(spotlight()).rejects.toThrow('classification')
})
it('profiles the real local PostgreSQL RPC against the existing generic RPC',async()=>{
 await db.exec('analyze for_you_candidates;analyze transcript_segments;analyze youtube_transcripts;analyze transcript_groups;analyze admin_manual_transcripts;')
 const measure=async(sql:string)=>{const times:number[]=[];for(let i=0;i<7;i++){const t=performance.now();await db.query(sql,[String(i)]);times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]}
 const before=await measure("select transcript_for_you_groups($1,'{}','{}',1,'{}')")
 const after=await measure('select home_for_you_spotlight($1,false)')
 const sample=await spotlight();const cpu=performance.now();for(let i=0;i<1000;i++)normaliseForYouClip(sample);const normalisationMs=(performance.now()-cpu)/1000
 if(process.env.AWM_SPOTLIGHT_PROFILE_PATH)writeFileSync(process.env.AWM_SPOTLIGHT_PROFILE_PATH,JSON.stringify({sources:25,candidates:100,genericMedianMs:before,spotlightMedianMs:after,normalisationMs},null,2))
})

it('does not cross missing paragraph positions or accept malformed canonical tokens',async()=>{
 await db.exec("update youtube_transcripts set explore_published=false where title<>'Source 1';delete from transcript_segments where position>1;update transcript_segments set position=2 where position=1")
 expect(await spotlight()).toBeNull()
 await db.exec("update transcript_segments set position=1 where position=2;update transcript_segments set canonical_paragraph='{\"tokens\":{}}'")
 expect(await spotlight()).toBeNull()
})
it('is callable under the existing service role with no owner-only privilege dependency',async()=>{
 await db.exec('set role service_role')
 try{expect(await spotlight()).not.toBeNull()}finally{await db.exec('reset role')}
})
it.skipIf(!process.env.AWM_SPOTLIGHT_PROFILE_PATH)('profiles a synthetic 2500-source/10000-candidate pool',async()=>{
 await db.exec(`insert into youtube_transcripts(id,youtube_id,title,duration_seconds)
  select md5(n::text)::uuid,'scale'||lpad(n::text,6,'0'),'Scale '||n,120 from generate_series(1,2500) n;
 insert into transcript_segments(id,transcript_id,position,original_text,english_text,start_seconds,end_seconds,canonical_paragraph)
  select 100000+n*4+j,md5(n::text)::uuid,j,s.original_text,s.english_text,j*15,j*15+15,s.canonical_paragraph
  from generate_series(1,2500) n cross join generate_series(0,3) j cross join (select * from transcript_segments where id=100) s;
 analyze for_you_candidates;analyze transcript_segments;analyze youtube_transcripts;`)
 const samples:number[]=[]
 for(let i=0;i<10;i++){const start=performance.now();expect(await spotlight(String(i))).not.toBeNull();samples.push(performance.now()-start)}
 const path=process.env.AWM_SPOTLIGHT_PROFILE_PATH!,existing=JSON.parse(readFileSync(path,'utf8'));existing.scale={sources:2525,candidates:10100,medianMs:samples.sort((a,b)=>a-b)[5],samplesMs:samples};writeFileSync(path,JSON.stringify(existing,null,2))
},30000)

it('fresh seeds remain varied even when candidate numeric IDs have a billion-row gap',async()=>{
 await db.query('insert into youtube_transcripts(id,youtube_id,title,duration_seconds) values($1,$2,$3,120)',[source(26),'videoid0026','Sparse source'])
 await db.query('insert into transcript_segments(id,transcript_id,position,original_text,english_text,start_seconds,end_seconds,canonical_paragraph) select id+1000000000,$1,position,original_text,english_text,start_seconds,end_seconds,canonical_paragraph from transcript_segments where transcript_id=$2',[source(26),source(1)])
 const choices=new Set<string>();for(let i=0;i<20;i++)choices.add((await spotlight(String(i)))!.video.id)
 expect(choices.size).toBeGreaterThan(5)
})
