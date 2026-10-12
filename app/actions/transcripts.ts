'use server'

import { z } from 'zod'
import {createHash} from 'node:crypto'
import {runManualImport,type ImportReply,type ManualImportState} from '@/app/lib/manualImportRunner'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedAccess, guardAdmin } from '@/app/actions/auth'
import { serviceClient } from '@/app/lib/supabase'
import type { Json } from '@/app/lib/supabase/database.types'
import { normaliseManualTranscript, transcriptVideoId } from '@/app/lib/manualTranscripts'
import { MAX_TRANSCRIPT_BYTES, normaliseManualTranscriptJson, serialiseTranscriptJson, transcriptJsonFilename } from '@/app/lib/manualTranscriptJson'
import {transcriptDatabaseError} from '@/app/lib/transcriptDatabaseError'
import { MissingTranscriptDuration, parseVideoDuration } from '@/app/lib/transcriptTiming'

export interface TranscriptRow {id:string;youtube_id:string;canonical_url:string;title:string;channel:string|null;thumbnail:string;duration_seconds:number|null;provider:string;status:string;translation_status:string;searchable:boolean;created_at:string;updated_at:string;error_code:string|null;website_generation?:boolean;group_id?:string|null;draft_id?:string;draft_version?:string}
export interface TranscriptSegment {id:number;position:number;original_text:string;english_text:string|null;start_seconds:number;end_seconds:number|null;start_ms?:number;end_ms?:number|null;canonical_paragraph?:Json|null}
export interface TranscriptHit {segment_id:number;transcript_id:string;youtube_id:string;title:string;channel:string|null;thumbnail:string;start_seconds:number;end_seconds:number|null;original_text:string;english_text:string|null;matched_surfaces:string[];match_type:string;match_rank:number;previous_text:string|null;next_text:string|null}
const columns='id,youtube_id,canonical_url,title,channel,thumbnail,duration_seconds,provider,status,translation_status,searchable,created_at,updated_at,error_code'
function missingGenerationColumn(error:{code?:string;message:string}|null):boolean{return Boolean(error&&['42703','PGRST204'].includes(error.code??'')&&error.message.includes('website_generation'))}
async function adminIdentity():Promise<string> {const access=await getAuthenticatedAccess();if(!access?.admin) throw new Error('Forbidden');return access.userId}
async function recordAdminOrigin(actor:string,id:string):Promise<void> {
  const {error}=await serviceClient.rpc('admin_record_transcript_origin',{p_actor:actor,p_id:id})
  if(error)throw new Error('Unable to record Admin transcript provenance. Please retry the import.')
}
export async function generateAdminTranscript(url: string): Promise<{ok:true;id:string;duplicate:boolean}|{ok:false;error:string}> {
  try {
    const actor=await adminIdentity()
    const input=z.string().trim().max(2048).parse(url)
    const youtubeId=manualVideoId(input)
    const {data,error}=await serviceClient.rpc('admin_generate_youtube_transcript',{p_actor:actor,p_youtube_id:youtubeId})
    if(error)throw new Error(/Forbidden/.test(error.message)?'Administrators only.':/rate_limit|daily_limit/.test(error.message)?'Generation quota reached. Please try again later.':/PGRST202|42883/.test(error.code??'')?'The website generation RPC is missing. Apply website_generation_configuration_repair to the configured Supabase project.':/provider_not_configured/.test(error.message)?'Supadata is not configured. Set SUPADATA_API_KEY in Supabase Vault or on the transcript worker.':/episode_video/.test(error.message)?'This video belongs to Shows. Manage its transcript in Episodes.':error.code==='42501'?'The server cannot call the generation RPC. Check its service-role permissions.':'Unable to queue transcript generation. Please retry.')
    const result=z.object({id:z.string().uuid(),duplicate:z.boolean()}).parse(data)
    await recordAdminOrigin(actor,result.id)
    revalidatePath('/admin/transcripts')
    return {ok:true,...result}
  }catch(error){return {ok:false,error:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Unable to generate transcript.'}}
}
export async function deleteAdminTranscript(id: string): Promise<{ok:true}|{ok:false;error:string}> {
  try {
    const actor=await adminIdentity();z.string().uuid().parse(id)
    const {error}=await serviceClient.rpc('admin_delete_youtube_transcript',{p_actor:actor,p_id:id})
    if(error)throw new Error('Unable to delete this transcript. Please retry.')
    for(const path of ['/admin/transcripts','/explore/search','/explore',`/transcripts/${id}`])revalidatePath(path)
    return {ok:true}
  }catch(error){return {ok:false,error:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Unable to delete transcript.'}}
}
export interface TranscriptGroup {id:string;name:string;parent_id:string|null;direct_count:number;transcript_count:number}
export interface ManualTranscriptList {rows:TranscriptRow[];total:number;groups:TranscriptGroup[];ungrouped:number}
export async function listAdminTranscripts(page=0,titleSearch='',groupFilter=''):Promise<ManualTranscriptList> {
  const actor=await adminIdentity()
  z.number().int().min(0).max(100000).parse(page)
  const search=z.string().trim().max(300).parse(titleSearch)
  const drafts=groupFilter==='drafts'
  if(groupFilter&&!['ungrouped','drafts'].includes(groupFilter))z.string().uuid().parse(groupFilter)
  const {data,error}=await serviceClient.rpc('admin_list_manual_transcripts',{p_actor:actor,p_page:drafts?0:page,p_search:drafts?'':search,p_group:groupFilter&&!['ungrouped','drafts'].includes(groupFilter)?groupFilter:null,p_ungrouped:groupFilter==='ungrouped'})
  if(error)throw new Error(/PGRST202|42883/.test(error.code??'')?'Transcript groups are not configured. Apply the transcript groups migration.':'Unable to load transcripts. Please retry.')
  const {data:draftData,error:draftError}=await serviceClient.rpc('admin_list_manual_drafts',{p_actor:actor,p_page:page,p_search:search,p_rows:drafts})
  if(draftError)throw new Error(transcriptDatabaseError('Draft list',draftError))
  const list=data as unknown as ManualTranscriptList,draftList=draftData as unknown as {rows:TranscriptRow[];total:number;count:number}
  return {...list,...(drafts?{rows:draftList.rows,total:draftList.total}:{}),groups:[{id:'drafts',name:'Drafts',parent_id:null,direct_count:draftList.count,transcript_count:draftList.count},...(list.groups??[])]}
}
export interface ManualDraftInput {url:string;title:string;channel:string;json:string;searchable:boolean;duration:string;durationFormat:'clock'|'minutes';groupId:string|null}
const manualDraftInput=z.object({url:z.string().max(2048),title:z.string().max(300),channel:z.string().max(300),json:z.string().max(MAX_TRANSCRIPT_BYTES).refine(value=>Buffer.byteLength(value,'utf8')<=MAX_TRANSCRIPT_BYTES,'Draft JSON exceeds 20 MB.'),searchable:z.boolean(),duration:z.string().max(30),durationFormat:z.enum(['clock','minutes']),groupId:z.string().uuid().nullable()})
function draftError(error:unknown):string{return error instanceof z.ZodError?error.issues[0].message:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Unable to save draft.'}
function draftDatabaseError(operation:string,error:{code?:string;message:string}):Error{return new Error(error.message.includes('draft_conflict')?'This draft changed in another tab. Reopen it before saving or deleting.':transcriptDatabaseError(operation,error))}
export async function saveAdminManualDraft(id:string,payload:ManualDraftInput,updatedAt:string|null=null):Promise<{ok:true;id:string;updatedAt:string}|{ok:false;error:string}>{
 try{const actor=await adminIdentity();z.string().uuid().parse(id);if(updatedAt!==null)z.string().min(1).max(60).parse(updatedAt)
  // Store form strings exactly; unfinished JSON, URLs and durations are valid drafts.
  const value=manualDraftInput.parse(payload)
  const {data,error}=await serviceClient.rpc('admin_save_manual_draft',{p_actor:actor,p_id:id,p_payload:value as unknown as Json,p_version:updatedAt})
  if(error)throw draftDatabaseError('Save draft',error)
  const result=z.object({id:z.string().uuid(),updatedAt:z.string()}).parse(data)
  revalidatePath('/admin/transcripts');return {ok:true,...result}
 }catch(error){return {ok:false,error:draftError(error)}}
}
export async function loadAdminManualDraft(id:string):Promise<{id:string;payload:ManualDraftInput;updatedAt:string}>{
 const actor=await adminIdentity();z.string().uuid().parse(id)
 const {data,error}=await serviceClient.rpc('admin_load_manual_draft',{p_actor:actor,p_id:id})
 if(error)throw draftDatabaseError('Load draft',error)
 return z.object({id:z.string().uuid(),payload:manualDraftInput,updatedAt:z.string()}).parse(data)
}
export async function deleteAdminManualDraft(id:string,updatedAt:string):Promise<{ok:true}|{ok:false;error:string}>{
 try{const actor=await adminIdentity();z.string().uuid().parse(id);z.string().min(1).max(60).parse(updatedAt)
  const {error}=await serviceClient.rpc('admin_delete_manual_draft',{p_actor:actor,p_id:id,p_version:updatedAt})
  if(error)throw draftDatabaseError('Delete draft',error)
  revalidatePath('/admin/transcripts');return {ok:true}
 }catch(error){return {ok:false,error:draftError(error)}}
}
export async function manageAdminTranscriptGroup(input:{name?:string;parentId?:string|null;id?:string;remove?:boolean}):Promise<{ok:true;id:string}|{ok:false;error:string}> {
  try {
    const actor=await adminIdentity()
    const value=z.object({name:z.string().trim().min(1).max(150).optional(),parentId:z.string().uuid().nullable().optional(),id:z.string().uuid().optional(),remove:z.boolean().default(false)}).parse(input)
    if(!value.remove&&!value.name)throw new Error('Enter a group name.')
    if(value.remove&&!value.id)throw new Error('Select a group.')
    const {data,error}=await serviceClient.rpc('admin_manage_transcript_group',{p_actor:actor,p_name:value.name??null,p_parent:value.parentId??null,p_id:value.id??null,p_delete:value.remove})
    if(error)throw new Error(error.code==='23503'?'This group is still in use. Move its transcripts before deleting it.':error.code==='23505'?'A group with this name already exists.':'Unable to save the group. Please retry.')
    revalidatePath('/admin/transcripts')
    return {ok:true,id:z.string().parse(data)}
  }catch(error){return {ok:false,error:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Unable to save group.'}}
}
export async function addAdminYouTubeTranscript(input:string):Promise<string> {
  const actor=await adminIdentity(),id=transcriptVideoId(input)
  // Saved canonical work is always reused, even if the operator is on cooldown.
  const {data:existing,error:lookupError}=await serviceClient.from('youtube_transcripts').select('id').eq('youtube_id',id).maybeSingle()
  if(lookupError)throw new Error('Unable to check the canonical library.')
  if(existing){await recordAdminOrigin(actor,existing.id);return existing.id}
  const {data,error}=await serviceClient.rpc('register_youtube_transcript',{p_user:actor,p_youtube_id:id})
  if(error)throw new Error(/limit/.test(error.message)?'Import quota reached. Please try later.':'Unable to queue transcript import.')
  await recordAdminOrigin(actor,data)
  revalidatePath('/admin/transcripts');return data
}
function manualVideoId(input: string): string {
  try { return transcriptVideoId(input) } catch { throw new Error('Enter a YouTube URL or video ID.') }
}
async function resolveManualJson(json:string,youtubeId:string,duration?:string,durationSeconds?:number,durationFormat:'clock'|'minutes'='clock',savedSeconds?:number|null){
 const supplied=parseVideoDuration(duration??'',durationFormat)
 const end=supplied===undefined?durationSeconds??undefined:supplied/1000
 const raw=normaliseManualTranscriptJson(json,end)
 void youtubeId;void savedSeconds
 return {raw,durationSource:supplied!==undefined||durationSeconds!==undefined?'manual' as const:'transcript' as const}
}
export type ManualEnrichmentStatus='ready'|'partial'|'unavailable'
export async function loadAdminManualEnrichment(id:string):Promise<{status:ManualEnrichmentStatus;diagnostics:Json;originalJson:string|null}|null>{
 const actor=await adminIdentity();z.string().uuid().parse(id)
 const {data,error}=await serviceClient.rpc('admin_manual_enrichment',{p_actor:actor,p_id:id})
 if(error)throw new Error(transcriptDatabaseError('Enrichment details',error))
 return data as {status:ManualEnrichmentStatus;diagnostics:Json;originalJson:string|null}|null
}
export async function retryAdminManualEnrichment(id:string):Promise<{ok:true;status:ManualEnrichmentStatus}|{ok:false;error:string}>{
 try{const actor=await adminIdentity();z.string().uuid().parse(id)
 const {data,error}=await serviceClient.rpc('admin_retry_manual_enrichment',{p_actor:actor,p_id:id})
 if(error)throw new Error(transcriptDatabaseError('Enrichment retry',error))
 revalidatePath('/admin/transcripts');return {ok:true,status:z.object({status:z.enum(['ready','partial','unavailable'])}).parse(data).status}
 }catch(e){return {ok:false,error:e instanceof Error?e.message:'Enrichment retry unavailable.'}}
}
export type ManualTranscriptCheck = {ok:true;segments:number;durationSource:'transcript'|'youtube'|'saved-video'|'manual'} | {ok:false;error:string;needsDuration:boolean}
/** Read-only preflight; the import repeats the same validation before writing. */
export async function validateAdminManualTranscript(input:{url:string;json:string;duration?:string;durationFormat?:'clock'|'minutes'}):Promise<ManualTranscriptCheck> {
  try {
    await adminIdentity()
    const value=z.object({url:z.string().trim().max(2048),json:z.string().max(MAX_TRANSCRIPT_BYTES),duration:z.string().max(30).optional(),durationFormat:z.enum(['clock','minutes']).default('clock')}).parse(input)
    const {raw,durationSource}=await resolveManualJson(value.json,manualVideoId(value.url),value.duration,undefined,value.durationFormat)
    return {ok:true,segments:raw.content.length,durationSource}
  }catch(error){return {ok:false,error:error instanceof z.ZodError?error.issues[0].message:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Unable to check the transcript.',needsDuration:error instanceof MissingTranscriptDuration}}
}
async function prepareManualImport(input:{url:string;title:string;channel?:string;json?:string;arabic?:string;english?:string;searchable:boolean;duration?:string;durationSeconds?:number;durationFormat?:'clock'|'minutes';groupId?:string|null}):Promise<ManualImportState> {
  const actor=await adminIdentity()
  const value=z.object({url:z.string().trim().max(2048),title:z.string().trim().min(1,'Enter a video title.').max(300),channel:z.string().trim().max(300).default(''),json:z.string().max(MAX_TRANSCRIPT_BYTES).optional(),arabic:z.string().max(MAX_TRANSCRIPT_BYTES).optional(),english:z.string().max(MAX_TRANSCRIPT_BYTES).optional(),searchable:z.boolean(),duration:z.string().max(30).optional(),durationFormat:z.enum(['clock','minutes']).default('clock'),durationSeconds:z.number().finite().positive().max(43200).optional(),groupId:z.string().uuid().nullable().optional()}).parse(input)
  const id=manualVideoId(value.url)
  const durationMs=parseVideoDuration(value.duration??'',value.durationFormat)
  const raw=value.json!==undefined?(await resolveManualJson(value.json,id,value.duration,value.durationSeconds,value.durationFormat)).raw:normaliseManualTranscript(value.arabic??'',value.english)
  const parameters={p_youtube_id:id,p_title:value.title,p_channel:value.channel||'Unknown channel',p_raw:{...raw,...(value.json!==undefined?{_source_json:value.json}:{})} as unknown as Json,p_searchable:value.searchable,p_group:value.groupId??null,p_duration:durationMs===undefined?value.durationSeconds??null:durationMs/1000}
  const key=createHash('sha256').update(JSON.stringify(parameters)).digest('hex')
  const {data,error}=await serviceClient.rpc('admin_begin_manual_import',{p_actor:actor,p_key:key,...parameters})
  if(error)throw importFailure(error)
  return importState.parse(data)
}
const importState=z.object({importId:z.string().uuid(),id:z.string(),completed:z.boolean(),committed:z.number().int().nonnegative(),expected:z.number().int().positive(),tokens:z.number().int().nonnegative(),enrichment:z.enum(['ready','partial','unavailable'])})
function importFailure(error:{code?:string;message:string}){return Object.assign(new Error(transcriptDatabaseError('Import',error)),{code:error.code})}
function importError(error:unknown):ImportReply{
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):undefined
 return {ok:false,error:error instanceof z.ZodError?error.issues[0].message:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Unable to import transcript.',code,retryable:Boolean(code&&(['57014','40001','40P01','55P03','53300','57P01','57P02','57P03','PGRST000','PGRST001','PGRST002'].includes(code)||code.startsWith('08')))}
}
export async function prepareAdminManualImport(input:Parameters<typeof prepareManualImport>[0]):Promise<ImportReply>{
 try{return {ok:true,state:await prepareManualImport(input)}}catch(error){return importError(error)}
}
export async function appendAdminManualImport(id:string,offset:number,limit=100):Promise<ImportReply>{
 try{const actor=await adminIdentity();z.string().uuid().parse(id);z.number().int().min(0).parse(offset);z.number().int().min(1).max(100).parse(limit)
  const configured=Number(process.env.TRANSCRIPT_IMPORT_BATCH_SIZE??100),bytes=Number(process.env.TRANSCRIPT_IMPORT_BATCH_BYTES??524288)
  const batchSize=Number.isInteger(configured)&&configured>=1&&configured<=100?configured:100
  const batchBytes=Number.isInteger(bytes)&&bytes>=16384&&bytes<=1048576?bytes:524288
  const {data,error}=await serviceClient.rpc('admin_append_manual_import',{p_actor:actor,p_import:id,p_offset:offset,p_limit:Math.min(limit,batchSize),p_bytes:batchBytes})
  if(error)throw importFailure(error)
  return {ok:true,state:importState.parse(data)}
 }catch(error){return importError(error)}
}
export async function resumeAdminManualImport(id:string):Promise<ImportReply>{
 try{const actor=await adminIdentity();z.string().uuid().parse(id)
  const {data,error}=await serviceClient.rpc('admin_resume_manual_import',{p_actor:actor,p_id:id})
  if(error)throw importFailure(error)
  return {ok:true,state:importState.parse(data)}
 }catch(error){return importError(error)}
}
export async function finishAdminManualImport(id:string):Promise<ImportReply>{
 try{const actor=await adminIdentity();z.string().uuid().parse(id)
  const {data,error}=await serviceClient.rpc('admin_finish_manual_import',{p_actor:actor,p_import:id})
  if(error)throw importFailure(error)
  const state=importState.parse(data)
  if(!state.completed||state.committed!==state.expected)throw new Error('Import verification failed.')
  for(const path of ['/admin/transcripts','/explore/search','/explore',`/transcripts/${state.id}`])revalidatePath(path)
  return {ok:true,state}
 }catch(error){return importError(error)}
}
async function importManualSource(input:Parameters<typeof prepareManualImport>[0]):Promise<{id:string;enrichment:ManualEnrichmentStatus}>{
 await adminIdentity()
 const state=await runManualImport({prepare:()=>prepareAdminManualImport(input),append:appendAdminManualImport,finish:finishAdminManualImport},()=>{})
 return {id:state.id,enrichment:state.enrichment}
}
export async function importAdminManualTranscript(input:Parameters<typeof importManualSource>[0]):Promise<string>{return (await importManualSource(input)).id}
export async function updateAdminTranscript(id:string,input:{title:string;channel:string;searchable:boolean}):Promise<void> {
  await guardAdmin();z.string().uuid().parse(id)
  const value=z.object({title:z.string().trim().min(1).max(300),channel:z.string().trim().max(300),searchable:z.boolean()}).parse(input)
  let {data:video,error:readError}=await serviceClient.from('youtube_transcripts').select('status,website_generation,translation_status').eq('id',id).single()
  if(missingGenerationColumn(readError))({data:video,error:readError}=await serviceClient.from('youtube_transcripts').select('status,translation_status').eq('id',id).single())
  if(readError||!video)throw new Error('Transcript not found.')
  if(value.searchable&&video.status!=='ready')throw new Error('Wait for processing to finish before publishing.')
  if(value.searchable&&video.website_generation&&video.translation_status!=='ready')throw new Error('Wait for complete English translation before publishing this generated transcript.')
  const {error}=await serviceClient.from('youtube_transcripts').update({...value,updated_at:new Date().toISOString()}).eq('id',id)
  if(error)throw new Error('Unable to save transcript settings.')
  revalidatePath('/admin/transcripts');revalidatePath(`/transcripts/${id}`)
}
export async function searchTranscriptWord(word:string,after=0,rank=0):Promise<TranscriptHit[]> {
  const query=z.string().trim().min(1).max(200).parse(word)
  z.number().int().min(0).parse(after);z.number().int().min(0).max(3).parse(rank)
  const {data,error}=await serviceClient.rpc('search_transcript_word',{p_word:query,p_after:after,p_after_rank:rank,p_limit:20})
  if(error)throw new Error('Unable to search the shared transcript library.')
  return data as unknown as TranscriptHit[]
}
async function loadTranscript(id:string,after=-1,seconds?:number,admin=false):Promise<{video:TranscriptRow;segments:TranscriptSegment[]}|null> {
  z.string().uuid().parse(id);z.number().int().min(-1).parse(after)
  // Service reads always explicitly enforce the existing public corpus boundary.
  let lookup=serviceClient.from('youtube_transcripts').select(columns).eq('id',id)
  if(!admin)lookup=lookup.eq('status','ready').eq('searchable',true)
  const {data:video,error}=await lookup.maybeSingle()
  if(error)throw new Error('Unable to load transcript.')
  if(!video)return null
  if(seconds!==undefined&&after===-1){
    z.number().finite().min(0).max(43200).parse(seconds)
    const {data:anchor,error:anchorError}=await serviceClient.from('transcript_segments').select('position').eq('transcript_id',id).lte('start_seconds',seconds).order('start_seconds',{ascending:false}).order('position',{ascending:false}).limit(1).maybeSingle()
    if(anchorError)throw new Error('Unable to locate transcript timestamp.')
    after=Math.max(0,(anchor?.position??0)-15)-1
  }
  const {data:segments,error:segmentError}=await serviceClient.from('transcript_segments').select('*').eq('transcript_id',id).gt('position',after).order('position',{ascending:true}).limit(100)
  if(segmentError)throw new Error('Unable to load transcript segments.')
  return {video,segments:(segments??[]).map(segment=>({id:segment.id,position:segment.position,original_text:segment.original_text,english_text:segment.english_text,start_seconds:segment.start_seconds,end_seconds:segment.end_seconds,start_ms:segment.start_ms??Math.round(segment.start_seconds*1000),end_ms:segment.end_seconds===null?null:segment.end_ms??Math.round(segment.end_seconds*1000)}))}
}
export async function importAdminManualTranscriptResult(input: Parameters<typeof importAdminManualTranscript>[0]): Promise<{ok:true;id:string;enrichment:ManualEnrichmentStatus}|{ok:false;error:string}> {
  try { return {ok:true,...await importManualSource(input)} }
  catch(error) { return {ok:false,error:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error instanceof z.ZodError?error.issues[0].message:error.message):'Unable to import transcript.'} }
}
export async function loadPublicTranscript(id:string,after=-1,seconds?:number){return loadTranscript(id,after,seconds)}
export async function loadAdminTranscript(id:string,after=-1,seconds?:number){await guardAdmin();return loadTranscript(id,after,seconds,true)}

/** Export every stored segment, independently of the viewer's 100-row window. */
export async function downloadAdminTranscriptJson(id: string): Promise<{ filename: string; json: string; updatedAt: string; durationSeconds: number | null; title: string; channel: string | null; searchable: boolean; youtubeId:string;groupId:string|null }> {
  await guardAdmin()
  z.string().uuid().parse(id)
  const { data: video, error } = await serviceClient.from('youtube_transcripts').select('title,channel,searchable,raw_transcript,updated_at,duration_seconds,youtube_id').eq('id', id).maybeSingle()
  if (error) throw new Error('Unable to load transcript for download.')
  if (!video) throw new Error('Transcript is no longer available.')
  const segments: TranscriptSegment[] = []
  let after = -1
  for (;;) {
    const { data, error: segmentError } = await serviceClient.from('transcript_segments').select('*')
      .eq('transcript_id', id).gt('position', after).order('position', { ascending: true }).limit(500)
    if (segmentError) throw new Error('Unable to download the complete transcript. Please retry.')
    const batch = data ?? []
    segments.push(...batch)
    if (batch.length < 500) break
    after = batch[batch.length - 1].position
  }
  // Do not return a partial export if the record was deleted during pagination.
  const { data: current, error: checkError } = await serviceClient.from('youtube_transcripts').select('id,updated_at').eq('id', id).maybeSingle()
  if (checkError || !current) throw new Error('Transcript is no longer available. Please retry.')
  if (current.updated_at !== video.updated_at) throw new Error('Transcript changed while loading. Please reload it.')
  if (!segments.length) throw new Error('This transcript has no segments to download yet.')
  const {data:membership,error:groupError}=await serviceClient.from('admin_manual_transcripts').select('group_id').eq('transcript_id',id).maybeSingle()
  if(groupError)throw new Error('Unable to load transcript group. Apply the transcript groups migration.')
  return { youtubeId:video.youtube_id,groupId:membership?.group_id??null,filename: transcriptJsonFilename(video.title), json: serialiseTranscriptJson(segments, video.raw_transcript), updatedAt: video.updated_at, durationSeconds: video.duration_seconds, title: video.title, channel: video.channel, searchable: video.searchable }
}

/** Validate with Manual Import, then commit content and metadata in one RPC. */
export async function saveAdminTranscriptJson(id: string, input: {json:string;title:string;channel:string;searchable:boolean;updatedAt:string;duration?:string;durationFormat?:'clock'|'minutes';url?:string;groupId?:string|null}): Promise<{ok:true;updatedAt:string;json:string;enrichment?:ManualEnrichmentStatus}|{ok:false;error:string}> {
  try {
    const actor = await adminIdentity()
    z.string().uuid().parse(id)
    const value = z.object({json:z.string().max(MAX_TRANSCRIPT_BYTES),title:z.string().trim().min(1,'Enter a video title.').max(300),channel:z.string().trim().max(300),searchable:z.boolean(),updatedAt:z.string().datetime({offset:true}),duration:z.string().max(30).optional(),durationFormat:z.enum(['clock','minutes']).default('clock'),url:z.string().trim().max(2048).optional(),groupId:z.string().uuid().nullable().optional()}).parse(input)
    const {data:video,error:readError} = await serviceClient.from('youtube_transcripts').select('youtube_id,duration_seconds').eq('id',id).single()
    if(readError)throw new Error(transcriptDatabaseError('Edit lookup',readError))
    if(!video)throw new Error('Transcript not found.')
    const youtubeId=value.url===undefined?video.youtube_id:manualVideoId(value.url)
    const durationMs=parseVideoDuration(value.duration??'',value.durationFormat)
    const {raw} = await resolveManualJson(value.json,youtubeId,value.duration,undefined,value.durationFormat,youtubeId===video.youtube_id?video.duration_seconds:null)
    const {data,error} = await serviceClient.rpc('admin_save_manual_source',{p_actor:actor,p_id:id,p_raw:{...raw,_source_json:value.json} as unknown as Json,p_title:value.title,p_channel:value.channel,p_searchable:value.searchable,p_updated_at:value.updatedAt,p_youtube_id:youtubeId,p_group:value.groupId??null,p_duration:durationMs===undefined?null:durationMs/1000})
    if (error) throw new Error(error.code==='23503'?'The selected group no longer exists. Choose another group.':error.code==='23505'?'This YouTube video already has a transcript.':/Video duration|Only manual/.test(error.message)?error.message:/transcript_edit_conflict/.test(error.message)?'This transcript changed after you opened it. Reopen Edit before saving. Your edits are still here.':/transcript_edit_busy/.test(error.message)?'Wait for transcript processing and translation to finish before editing.':/generation_incomplete/.test(error.message)?'Published generated transcripts need English for every segment. Add the missing translations or turn publication off.':transcriptDatabaseError('Edit',error))
    for (const path of ['/admin/transcripts','/explore/search','/explore',`/transcripts/${id}`]) revalidatePath(path)
    const result=z.object({updatedAt:z.string(),enrichment:z.enum(['ready','partial','unavailable'])}).parse(data)
    return {ok:true,...result,json:JSON.stringify({content:raw.content},null,2)}
  } catch (error) {
    return {ok:false,error:error instanceof z.ZodError?error.issues.map(issue=>issue.message).join('\n'):error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Could not save transcript.'}
  }
}

/** Generated work has its own review panel, independent of the manual library. */
export async function loadAdminGeneration(id:string):Promise<{video:TranscriptRow;json:string|null}> {
 await guardAdmin();z.string().uuid().parse(id)
 const {data:video,error}=await serviceClient.from('youtube_transcripts').select(`${columns},website_generation,raw_transcript`).eq('id',id).single()
 if(error||!video)throw new Error('Unable to load generation status. Check the database configuration and retry.')
 const {raw_transcript:raw,...metadata}=video
 if(video.status!=='ready')return {video:metadata,json:null}
 const segments:TranscriptSegment[]=[]
 for(let after=-1;;){const {data,error}=await serviceClient.from('transcript_segments').select('*').eq('transcript_id',id).gt('position',after).order('position').limit(500);if(error)throw new Error('Unable to load generated JSON. Retry before saving.');const batch=data??[];segments.push(...batch);if(batch.length<500)break;after=batch[batch.length-1].position}
 const {data:current,error:checkError}=await serviceClient.from('youtube_transcripts').select('updated_at').eq('id',id).single()
 if(checkError||current?.updated_at!==video.updated_at)throw new Error('Generation changed while loading. Retry to load its latest JSON.')
 return {video:metadata,json:serialiseTranscriptJson(segments,raw)}
}
export async function saveAdminGeneratedTranscript(id:string,input:{json:string;title:string;searchable:boolean;updatedAt:string;duration?:string}):Promise<{ok:true;updatedAt:string;json:string}|{ok:false;error:string}> {
 try {
  const actor=await adminIdentity();z.string().uuid().parse(id)
  const value=z.object({json:z.string().max(MAX_TRANSCRIPT_BYTES),title:z.string().trim().min(1).max(300),searchable:z.boolean(),updatedAt:z.string().datetime({offset:true}),duration:z.string().max(30).optional()}).parse(input)
  const {data:video,error:readError}=await serviceClient.from('youtube_transcripts').select('youtube_id,duration_seconds').eq('id',id).single()
  if(readError||!video)throw new Error('Generated transcript not found.')
  parseVideoDuration(value.duration??'')
  const raw=normaliseManualTranscriptJson(value.json,parseVideoDuration(value.duration??'')===undefined?video.duration_seconds??undefined:parseVideoDuration(value.duration??'')!/1000)
  if(raw.content.some(c=>c.duration===null))throw new MissingTranscriptDuration()
  const {data,error}=await serviceClient.rpc('admin_review_generated_transcript',{p_actor:actor,p_id:id,p_raw:raw as unknown as Json,p_title:value.title,p_searchable:value.searchable,p_updated_at:value.updatedAt})
  if(error)throw new Error(/transcript_edit_conflict/.test(error.message)?'This transcript changed. Reload its JSON before saving. Your edits are still here.':/transcript_edit_busy/.test(error.message)?'Wait for generation to finish before saving.':/not_generated_transcript/.test(error.message)?'This saved video belongs to another workflow. Use its existing editor.':'Unable to save generated JSON. Check its token metadata and retry.')
  for(const path of ['/admin/transcripts','/explore','/explore/search',`/transcripts/${id}`])revalidatePath(path)
  return {ok:true,updatedAt:z.string().parse(data),json:JSON.stringify({content:raw.content},null,2)}
 }catch(error){return {ok:false,error:error instanceof Error?error.message:'Unable to save generated transcript.'}}
}

/** Move organisational metadata without touching transcript content or search rows. */
export async function moveAdminTranscriptGroup(id:string,input:{groupId:string|null;previousGroupId:string|null;updatedAt:string}):Promise<{ok:true;updatedAt:string}|{ok:false;error:string}> {
 try {
  const actor=await adminIdentity();z.string().uuid().parse(id)
  const value=z.object({groupId:z.string().uuid().nullable(),previousGroupId:z.string().uuid().nullable(),updatedAt:z.string().datetime({offset:true})}).parse(input)
  const {data,error}=await serviceClient.rpc('admin_move_standalone_transcript',{p_actor:actor,p_id:id,p_group:value.groupId,p_previous_group:value.previousGroupId,p_updated_at:value.updatedAt})
  if(error)throw new Error(error.code==='23503'?'The selected group no longer exists. Choose another group.':/conflict/.test(error.message)?'This transcript or its group changed. Reopen Edit before saving. Your edits are still here.':'Unable to move the transcript. Please retry.')
  revalidatePath('/admin/transcripts');return {ok:true,updatedAt:z.string().parse(data)}
 }catch(error){return {ok:false,error:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Unable to move the transcript.'}}
}
