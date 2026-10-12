import {createClient} from '@supabase/supabase-js'
import ts from 'typescript'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
const root=process.cwd(),cache=path.resolve('.next/import-repair-qa')
if(!cache.startsWith(root+path.sep))throw new Error('Verification files must stay inside the website')
mkdirSync(cache,{recursive:true})
for(const name of ['transcriptTiming','manualTranscriptJson']){
 const source=readFileSync(path.join(root,'app/lib',name+'.ts'),'utf8').replace("@/app/lib/transcriptTiming","./transcriptTiming.mjs")
 writeFileSync(path.join(cache,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)
}
const {normaliseManualTranscriptJson}=await import(pathToFileURL(path.join(cache,'manualTranscriptJson.mjs')).href)
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false}})
const {data:roles,error:roleError}=await db.from('account_roles').select('user_id').eq('role','admin').limit(1)
if(roleError||!roles?.length)throw new Error('Unable to verify Admin actor')
const {data:videos,error:readError}=await db.from('youtube_transcripts').select('id,youtube_id,title,channel,raw_transcript,canonical_transcript,updated_at').eq('provider','manual').eq('source_origin','website_admin_transcript').is('episode_id',null).order('created_at').limit(1)
if(readError||!videos?.length)throw new Error('Existing AWM transcript not available for verification')
const video=videos[0],file=path.join(cache,'existing-valid-awm.json')
writeFileSync(file,JSON.stringify(video.raw_transcript,null,2))
const normalized=normaliseManualTranscriptJson(readFileSync(file,'utf8'))
assert.deepEqual(normalized.content,video.raw_transcript.content)
const payload={p_actor:roles[0].user_id,p_youtube_id:video.youtube_id,p_title:video.title,p_channel:video.channel??'',p_raw:normalized,p_searchable:true,p_group:null,p_duration:null}
const duplicate=await db.rpc('admin_import_grouped_transcript',payload)
assert.equal(duplicate.error?.code,'P0001');assert.match(duplicate.error.message,/already exists/)
const group=await db.rpc('admin_import_grouped_transcript',{...payload,p_group:randomUUID()})
assert.equal(group.error?.code,'23503');assert.match(group.error.message,/group assignment/)
const {data:after,error:afterError}=await db.from('youtube_transcripts').select('id,youtube_id,title,channel,raw_transcript,canonical_transcript,updated_at').eq('id',video.id).single()
if(afterError)throw new Error('Unable to verify existing transcript after rejected operations')
assert.deepEqual(after,video)
console.log(JSON.stringify({existingAwmFileParsed:true,segments:normalized.content.length,timestampsAndEnrichmentUnchanged:true,duplicateRestError:duplicate.error.code,invalidGroupRestError:group.error.code,canonicalRecordUnchanged:true}))
