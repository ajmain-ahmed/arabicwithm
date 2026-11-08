// Read-only production snapshot; all migration execution happens in disposable PGlite.
// Run: node --env-file=.env.local scripts/verify-home-spotlight.mjs
import {createClient} from '@supabase/supabase-js'
import {PGlite} from '@electric-sql/pglite'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import assert from 'node:assert/strict'
const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL
assert.equal(new URL(url).hostname,'whbxgwucsoguqzpnpzjd.supabase.co')
const client=createClient(url,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const report={project:'whbxgwucsoguqzpnpzjd',mode:'read-only production snapshot, correction executed locally',baseline:[],samples:[]}
for(let i=0;i<3;i++){
 const start=performance.now(),{data,error}=await client.rpc('home_for_you_spotlight',{p_seed:`baseline-${i}`,p_allow_source_tokens:false})
 report.baseline.push({ms:Math.round(performance.now()-start),code:error?.code??null,message:error?.message??null,selected:Boolean(data)})
}
async function rows(table,fields,filter=q=>q){
 const result=[]
 for(let offset=0;;offset+=500){const {data,error}=await filter(client.from(table).select(fields)).order(table==='admin_manual_transcripts'?'transcript_id':'id').range(offset,offset+499);if(error)throw error;result.push(...data);if(data.length<500)return result}
}
const [transcripts,groups,members,episodes]=await Promise.all([
 rows('youtube_transcripts','id,youtube_id,title,channel,duration_seconds,translation_status,status,explore_published,language,source_origin,episode_id,source_channel_id,error_code',q=>q.eq('status','ready').eq('explore_published',true)),
 rows('transcript_groups','id,name,parent_id'),rows('admin_manual_transcripts','transcript_id,group_id'),rows('episodes','id,youtube_id'),
])
const ids=transcripts.map(t=>t.id)
const segments=await rows('transcript_segments','id,transcript_id,position,original_text,english_text,start_seconds,end_seconds,for_you_manual_excluded,for_you_music_only,for_you_theme_score,canonical_paragraph,for_you_fingerprints',q=>q.in('transcript_id',ids))
const db=new PGlite()
try{
 const testSource=readFileSync('app/lib/homeSpotlightMigration.test.ts','utf8')
 const schema=testSource.split('await db.exec(`')[1].split('`)')[0]
 await db.exec(schema)
 const migrations=['20261019000001_for_you_candidates.sql','20261029234847_for_you_live_candidates_and_discovery.sql','20261030002150_for_you_meaningful_clip_quality.sql','20261030003020_for_you_lexical_word_count.sql','20261107140000_home_for_you_spotlight.sql']
 for(const file of migrations)await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'))
 for(const [table,data] of [['youtube_transcripts',transcripts],['transcript_groups',groups],['admin_manual_transcripts',members],['episodes',episodes],['transcript_segments',segments]]){
  const columns=Object.keys(data[0]??{}).join(',');if(!columns)continue
  // These table/column names come from the fixed projection above, never external input.
  await db.query(`insert into public.${table} (${columns}) select ${columns} from json_populate_recordset(null::public.${table},$1)`,[JSON.stringify(data)])
 }
 await assert.rejects(db.query("select home_for_you_spotlight('float8-regression',false)"),/does not exist/)
 const countSQL=`with recursive english(id) as (select id from transcript_groups where id='5b98c563-5c35-4696-98e1-06aa000eb622' union select g.id from transcript_groups g join english e on e.id=g.parent_id), eligible as materialized(select t.* from youtube_transcripts t where transcript_private.for_you_source_allowed(t.id)), ar as materialized(select t.* from eligible t where not exists(select 1 from admin_manual_transcripts m join english e on e.id=m.group_id where m.transcript_id=t.id)) select (select count(*) from for_you_candidates) candidate_segments,(select count(*) from eligible) before_ar,(select count(*) from ar) after_ar,(select count(*) from ar t where exists(select 1 from for_you_candidates c where c.transcript_id=t.id and transcript_private.home_spotlight_window(t.id,c.position,c.start_seconds,t.duration_seconds::numeric,false) is not null)) after_windows`
 report.counts=(await db.query(countSQL)).rows[0]
 await db.exec(readFileSync('supabase/migrations/20261108192634_home_spotlight_transcript_first.sql','utf8'))
 report.counts.after_speech=(await db.query(countSQL)).rows[0].after_windows
 await db.exec('analyze for_you_candidates;analyze transcript_segments;analyze youtube_transcripts;analyze transcript_groups;analyze admin_manual_transcripts;')
 const clips=[]
 for(let i=0;i<12;i++){
  const start=performance.now()
  let clip=(await db.query('select home_for_you_spotlight($1,false) clip',[`real-snapshot-${i}`])).rows[0].clip
  if(!clip)clip=(await db.query('select home_for_you_spotlight($1,true) clip',[`real-snapshot-${i}`])).rows[0].clip
  assert(clip,'No clip selected');const duration=(clip.clip_end_ms-clip.clip_start_ms)/1000
  assert(duration>=30&&duration<=60);assert(/^[\w-]{11}$/.test(clip.video.youtube_id))
  clips.push(clip)
  report.samples.push({youtubeId:clip.video.youtube_id,start:clip.clip_start_ms/1000,duration,ms:Math.round((performance.now()-start)*100)/100,...clip.diagnostics})
 }
 assert(new Set(clips.map(c=>c.video.youtube_id)).size>1)
 mkdirSync('test-results',{recursive:true})
 writeFileSync('test-results/spotlight-live-clips.json',JSON.stringify(clips))
 writeFileSync('test-results/spotlight-live-report.json',JSON.stringify(report,null,2))
 console.log(JSON.stringify(report,null,2))
}finally{await db.close()}
