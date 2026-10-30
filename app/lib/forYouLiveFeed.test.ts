// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,beforeEach,expect,it} from 'vitest'
let db:PGlite
const source=(i:number)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`
const group=source(99)
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
 await db.exec('grant select on all tables in schema public to service_role')
},30000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('truncate transcript_segments,for_you_candidates,youtube_transcripts,admin_manual_transcripts,transcript_groups,episodes cascade')
 for(let i=1;i<=25;i++){
  await db.query('insert into youtube_transcripts(id,youtube_id,title,duration_seconds) values($1,$2,$3,120)',[source(i),`videoid${String(i).padStart(4,'0')}`,`Source ${i}`])
  for(let j=0;j<4;j++)await db.query('insert into transcript_segments(id,transcript_id,position,original_text,english_text,start_seconds,end_seconds) values($1,$2,$3,$4,$5,$6,$7)',[i*100+j,source(i),j,'\u0627\u0644\u0643\u062a\u0627\u0628 \u062c\u0645\u064a\u0644.','A beautiful book.',j*20,j*20+20])
 }
})
async function batch(seed='one',excluded:number[]=[],recent:string[]=[],groups:string[]=[]){return(await db.query<{clips:import('./forYou').ForYouClip[]}>('select transcript_for_you_groups($1,$2,$3,5,$4) clips',[seed,excluded,recent,groups])).rows[0].clips}
it('maintains the full pool immediately on publish, segment edit, unpublish and deletion',async()=>{
 expect((await db.query('select * from for_you_candidates')).rows).toHaveLength(100)
 await db.query('update youtube_transcripts set explore_published=false where id=$1',[source(1)])
 expect((await db.query('select * from for_you_candidates where transcript_id=$1',[source(1)])).rows).toHaveLength(0)
 await db.query('update youtube_transcripts set explore_published=true where id=$1',[source(1)])
 expect((await db.query('select * from for_you_candidates where transcript_id=$1',[source(1)])).rows).toHaveLength(4)
 await db.exec('update transcript_segments set for_you_manual_excluded=true where id=100')
 expect((await db.query('select * from for_you_candidates where segment_id=100')).rows).toHaveLength(0)
 await db.exec('update transcript_segments set for_you_manual_excluded=false,end_seconds=start_seconds where id=100')
 expect((await db.query('select * from for_you_candidates where segment_id=100')).rows).toHaveLength(0)
 await db.query('delete from youtube_transcripts where id=$1',[source(1)])
 expect((await db.query('select * from for_you_candidates')).rows).toHaveLength(96)
})
it('draws five at a time from all 25 sources before source recycling, without overlapping seen segments',async()=>{
 const ids:string[]=[],seen:number[]=[]
 for(let i=0;i<5;i++){
  const clips=await batch('session',seen,ids.slice().reverse());expect(clips).toHaveLength(5)
  for(const clip of clips){expect(ids).not.toContain(clip.video.id);ids.push(clip.video.id);for(const s of clip.segments){expect(seen).not.toContain(s.id);seen.push(s.id)}}
 }
 expect(new Set(ids).size).toBe(25)
})
it('uses the entire selected group including a just-published source and excludes episode-backed/draft sources',async()=>{
 await db.query('insert into transcript_groups values($1,$2,null)',[group,'Cartoons'])
 for(let i=1;i<=20;i++)await db.query('insert into admin_manual_transcripts values($1,$2)',[source(i),group])
 await db.query("update youtube_transcripts set status='indexing' where id=$1",[source(1)])
 await db.query('insert into episodes values($1,$2)',[source(88),'videoid0002'])
 const seen:number[]=[],ids:string[]=[]
 for(let i=0;i<4;i++){const clips=await batch('group',seen,ids,[group]);for(const c of clips){ids.push(c.video.id);seen.push(...c.segments.map(s=>s.id))}}
 expect(new Set(ids).size).toBe(18);expect(ids).not.toContain(source(1));expect(ids).not.toContain(source(2))
 await db.query('delete from episodes where youtube_id=$1',['videoid0002'])
 expect((await db.query('select * from for_you_candidates where transcript_id=$1',[source(2)])).rows).toHaveLength(4)
})
it('fresh seeds change opening selection and browser roles cannot call feed internals',async()=>{
 expect((await batch('one')).map(c=>c.video.id)).not.toEqual((await batch('two')).map(c=>c.video.id))
 const q=await db.query<{allowed:boolean}>("select has_function_privilege('authenticated','public.transcript_for_you_groups(text,bigint[],uuid[],integer,uuid[])','EXECUTE') allowed")
 expect(q.rows[0].allowed).toBe(false)
})

const arabicWords=['\u0647\u0630\u0627','\u0643\u0644\u0627\u0645','\u0645\u0641\u064a\u062f','\u0639\u0646','\u0627\u0644\u0623\u062f\u0628']
async function qualitySource(lines:{words:number;start:number;end:number;excluded?:boolean;theme?:number;tokens?:unknown[];rawOnly?:boolean}[]){
 await db.exec('update youtube_transcripts set explore_published=false')
 const id=source(100),content=lines.map(line=>({tokens:line.tokens??arabicWords.slice(0,line.words).map(arabic=>({arabic}))}))
 await db.query('insert into youtube_transcripts(id,youtube_id,title,duration_seconds,raw_transcript) values($1,$2,$3,120,$4)',[id,'quality0000','Quality fixture',JSON.stringify({content})])
 for(let i=0;i<lines.length;i++){
  const line=lines[i]
  await db.query('insert into transcript_segments(id,transcript_id,position,original_text,english_text,start_seconds,end_seconds,for_you_manual_excluded,for_you_theme_score,canonical_paragraph) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[10000+i,id,i,arabicWords.slice(0,line.words).join(' '),'A useful phrase.',line.start,line.end,line.excluded??false,line.theme??0,line.rawOnly?null:JSON.stringify(content[i])])
 }
}
it.each([1,2])('rejects an isolated %s-word line even when its duration is twenty seconds',async words=>{
 await qualitySource([{words,start:0,end:20}]);expect(await batch()).toEqual([])
})
it('rejects a two-second final fragment even when it has five Arabic words',async()=>{
 await qualitySource([{words:5,start:0,end:2}]);expect(await batch()).toEqual([])
})
it('accepts five lexical words at ten seconds and ignores punctuation and timestamps',async()=>{
 await qualitySource([{words:5,start:0,end:10}]);expect(await batch()).toHaveLength(1)
 await qualitySourceCleanup()
 await qualitySource([{words:1,start:0,end:20,tokens:[{arabic:arabicWords[0]},{arabic:'...'},'!',{arabic:'00:20'},{metadata:'decorative'},{arabic:''}]}])
 expect(await batch()).toEqual([])
})
async function qualitySourceCleanup(){await db.query('delete from youtube_transcripts where id=$1',[source(100)])}
it('extends a tiny anchor through a connected adjacent sentence to reach both thresholds',async()=>{
 await qualitySource([{words:1,start:0,end:4},{words:4,start:4,end:12}])
 const clips=await batch();expect(clips).toHaveLength(1)
 expect(clips[0]).toMatchObject({clip_start_ms:0,clip_end_ms:12000})
 expect(clips[0].segments.map(s=>s.id)).toEqual([10000,10001])
})
it.each(['manual','theme','gap','maximum'])('does not merge across a %s boundary',async boundary=>{
 const lines=boundary==='maximum'?[{words:1,start:0,end:55},{words:4,start:55,end:70}]:boundary==='gap'?[{words:1,start:0,end:4},{words:4,start:7,end:17}]:[{words:1,start:0,end:4},{words:1,start:4,end:6,excluded:boundary==='manual',theme:boundary==='theme'?1:0},{words:4,start:6,end:16}]
 await qualitySource(lines);expect(await batch()).toEqual([])
})
it('uses source token arrays when optional canonical enrichment is unavailable',async()=>{
 await qualitySource([{words:5,start:0,end:10,rawOnly:true}]);expect(await batch()).toHaveLength(1)
})
it('does not count decorative tatweel, punctuation, empty tokens or timestamps as lexical words',async()=>{
 const tokens=[{arabic:arabicWords[0]},...Array.from({length:5},()=>({arabic:'\u0640\u0640\u0640'})),{arabic:'!!!'},{arabic:'00:10'},{arabic:''}]
 const result=await db.query<{words:number}>('select transcript_private.for_you_word_count($1,$2) words',['',JSON.stringify(tokens)])
 expect(result.rows[0].words).toBe(1)
})
