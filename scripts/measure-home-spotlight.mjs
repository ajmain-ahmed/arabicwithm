// Read-only live PostgREST check. Never print credentials or whole transcripts.
import {createClient} from '@supabase/supabase-js'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const client=createClient(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const report={samples:[]},clips=[]
for(let i=0;i<12;i++){
 const start=performance.now(),{data,error}=await client.rpc('home_for_you_spotlight',{p_seed:`post-fix-${i}`,p_allow_source_tokens:false}).abortSignal(AbortSignal.timeout(3000))
 if(error){report.samples.push({ms:Math.round(performance.now()-start),error:error.code||error.message});continue}
 assert(data);const duration=(data.clip_end_ms-data.clip_start_ms)/1000
 assert(duration>=30&&duration<=60);clips.push(data)
 report.samples.push({youtubeId:data.video.youtube_id,start:data.clip_start_ms/1000,duration,ms:Math.round(performance.now()-start),...data.diagnostics})
}
const times=report.samples.map(s=>s.ms).sort((a,b)=>a-b)
report.successfulSelections=clips.length;report.failedSelections=report.samples.length-clips.length
report.minimumMs=times[0];report.medianMs=(times[5]+times[6])/2;report.maximumMs=times.at(-1)
mkdirSync('docs/validation/spotlight-fix',{recursive:true});mkdirSync('test-results',{recursive:true})
writeFileSync('docs/validation/spotlight-fix/live-rpc.json',JSON.stringify(report,null,2))
writeFileSync('test-results/spotlight-live-rpc-clips.json',JSON.stringify(clips))
console.log(JSON.stringify(report,null,2))
if(clips.length!==12)process.exitCode=1
