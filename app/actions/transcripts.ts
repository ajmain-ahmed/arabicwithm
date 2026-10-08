'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedAccess, guardAdmin } from '@/app/actions/auth'
import { serviceClient } from '@/app/lib/supabase'
import type { Json } from '@/app/lib/supabase/database.types'
import { normaliseManualTranscript, transcriptVideoId } from '@/app/lib/manualTranscripts'
import { MAX_TRANSCRIPT_BYTES, normaliseManualTranscriptJson, serialiseTranscriptJson, transcriptJsonFilename } from '@/app/lib/manualTranscriptJson'
import { getYouTubeVideoDuration } from '@/app/lib/youtubeVideoDuration'
import { MissingTranscriptDuration, parseVideoDuration } from '@/app/lib/transcriptTiming'

export interface TranscriptRow {id:string;youtube_id:string;canonical_url:string;title:string;channel:string|null;thumbnail:string;duration_seconds:number|null;provider:string;status:string;translation_status:string;searchable:boolean;created_at:string;updated_at:string;error_code:string|null;website_generation?:boolean}
export interface TranscriptSegment {id:number;position:number;original_text:string;english_text:string|null;start_seconds:number;end_seconds:number;start_ms?:number;end_ms?:number;canonical_paragraph?:Json|null}
export interface TranscriptHit {segment_id:number;transcript_id:string;youtube_id:string;title:string;channel:string|null;thumbnail:string;start_seconds:number;end_seconds:number;original_text:string;english_text:string|null;matched_surfaces:string[];match_type:string;match_rank:number;previous_text:string|null;next_text:string|null}
const columns='id,youtube_id,canonical_url,title,channel,thumbnail,duration_seconds,provider,status,translation_status,searchable,created_at,updated_at,error_code'
function missingGenerationColumn(error:{code?:string;message:string}|null):boolean{return Boolean(error&&['42703','PGRST204'].includes(error.code??'')&&error.message.includes('website_generation'))}
// Cache only schema capability, never transcript data or permissions. Recheck
// within one minute so applying the generation migration takes effect promptly.
let generationColumnUnavailableUntil=0
async function adminIdentity():Promise<string> {const access=await getAuthenticatedAccess();if(!access?.admin) throw new Error('Forbidden');return access.userId}
async function recordAdminOrigin(actor:string,id:string):Promise<void> {
  const {error}=await serviceClient.rpc('admin_record_transcript_origin',{p_actor:actor,p_id:id})
  if(error)throw new Error('Unable to record Admin transcript provenance. Please retry the import.')
}
export async function generateAdminTranscript(url: string): Promise<{ok:true;id:string;duplicate:boolean}|{ok:false;error:string}> {
  try {
    const actor=await adminIdentity()
    const input=z.string().trim().max(2048).parse(url)
    if(!/^https?:\/\//i.test(input))throw new Error('Enter a complete YouTube URL, including https://.')
    const youtubeId=transcriptVideoId(input)
    const {data,error}=await serviceClient.rpc('admin_generate_youtube_transcript',{p_actor:actor,p_youtube_id:youtubeId})
    if(error)throw new Error(/Forbidden/.test(error.message)?'Administrators only.':/rate_limit|daily_limit/.test(error.message)?'Generation quota reached. Please try again later.':/PGRST202|42883/.test(error.code??'')?'Website generation is not configured. Apply the website transcript migration.':'Unable to queue transcript generation. Please retry.')
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
export async function listAdminTranscripts(page=0):Promise<{rows:TranscriptRow[];total:number}> {
  await guardAdmin();z.number().int().min(0).max(100000).parse(page)
  const includeGeneration=Date.now()>=generationColumnUnavailableUntil
  let {data,error,count}=await serviceClient.from('youtube_transcripts').select(includeGeneration?`${columns},website_generation`:columns,{count:'exact'}).order('created_at',{ascending:false}).order('id').range(page*30,page*30+29).overrideTypes<TranscriptRow[],{merge:false}>()
  if(!includeGeneration&&data)data=data.map(row=>({...row,website_generation:false}))
  if(missingGenerationColumn(error)){
    generationColumnUnavailableUntil=Date.now()+60_000
    const legacy=await serviceClient.from('youtube_transcripts').select(columns,{count:'exact'}).order('created_at',{ascending:false}).order('id').range(page*30,page*30+29)
    data=legacy.data?.map(row=>({...row,website_generation:false}))??null;error=legacy.error;count=legacy.count
  }
  if(error)throw new Error('Unable to load transcripts. Please retry.')
  return {rows:data??[],total:count??0}
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
async function resolveManualJson(json: string, youtubeId: string, duration?: string, durationSeconds?: number, durationFormat: 'clock'|'minutes' = 'clock', savedSeconds?:number|null) {
  try { return {raw:normaliseManualTranscriptJson(json),durationSource:'transcript' as const} }
  catch (error) { if (!(error instanceof MissingTranscriptDuration)) throw error }
  const actual = await getYouTubeVideoDuration(youtubeId)
  if (actual !== null) return {raw:normaliseManualTranscriptJson(json,actual),durationSource:'youtube' as const}
  const manualEnd = duration !== undefined ? parseVideoDuration(duration,durationFormat) : durationSeconds !== undefined ? durationSeconds*1000 : undefined
  // Manual fallback is explicit; legacy saved metadata remains a last resort.
  if (manualEnd !== undefined) return {raw:normaliseManualTranscriptJson(json,manualEnd/1000),durationSource:'manual' as const}
  let saved = savedSeconds
  if (saved === undefined) {
    const {data} = await serviceClient.from('youtube_transcripts').select('duration_seconds').eq('youtube_id',youtubeId).maybeSingle()
    saved = data?.duration_seconds
  }
  if (typeof saved === 'number' && Number.isFinite(saved) && saved > 0 && saved <= 43200) {
    try { return {raw:normaliseManualTranscriptJson(json,saved),durationSource:'saved-video' as const} }
    catch (error) { if (!(error instanceof Error) || !error.message.includes('video duration extends beyond')) throw error }
  }
  throw new MissingTranscriptDuration()
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
export async function importAdminManualTranscript(input:{url:string;title:string;channel?:string;json?:string;arabic?:string;english?:string;searchable:boolean;duration?:string;durationSeconds?:number;durationFormat?:'clock'|'minutes'}):Promise<string> {
  const actor=await adminIdentity()
  const value=z.object({url:z.string().trim().max(2048),title:z.string().trim().min(1,'Enter a video title.').max(300),channel:z.string().trim().max(300).default(''),json:z.string().max(MAX_TRANSCRIPT_BYTES).optional(),arabic:z.string().max(MAX_TRANSCRIPT_BYTES).optional(),english:z.string().max(MAX_TRANSCRIPT_BYTES).optional(),searchable:z.boolean(),duration:z.string().max(30).optional(),durationFormat:z.enum(['clock','minutes']).default('clock'),durationSeconds:z.number().finite().positive().max(43200).optional()}).parse(input)
  const id=manualVideoId(value.url)
  const raw=value.json!==undefined?(await resolveManualJson(value.json,id,value.duration,value.durationSeconds,value.durationFormat)).raw:normaliseManualTranscript(value.arabic??'',value.english)
  const {data,error}=await serviceClient.rpc('admin_import_youtube_transcript',{p_actor:actor,p_youtube_id:id,p_title:value.title,p_channel:value.channel||'Unknown channel',p_raw:raw as unknown as Json,p_searchable:value.searchable})
  if(error)throw new Error(/^(Segment \d+:|Transcript needs|Invalid transcript|Transcript could not)/.test(error.message) ? error.message : 'Unable to import the timed transcript. Existing canonical content has not been replaced.')
  await recordAdminOrigin(actor,data)
  for(const path of ['/admin/transcripts','/explore/search','/explore',`/transcripts/${data}`])revalidatePath(path);return data
}
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
  return {video,segments:(segments??[]).map(segment=>({id:segment.id,position:segment.position,original_text:segment.original_text,english_text:segment.english_text,start_seconds:segment.start_seconds,end_seconds:segment.end_seconds,start_ms:segment.start_ms??Math.round(segment.start_seconds*1000),end_ms:segment.end_ms??Math.round(segment.end_seconds*1000)}))}
}
export async function importAdminManualTranscriptResult(input: Parameters<typeof importAdminManualTranscript>[0]): Promise<{ok:true;id:string}|{ok:false;error:string}> {
  try { return {ok:true,id:await importAdminManualTranscript(input)} }
  catch(error) { return {ok:false,error:error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error instanceof z.ZodError?error.issues[0].message:error.message):'Unable to import transcript.'} }
}
export async function loadPublicTranscript(id:string,after=-1,seconds?:number){return loadTranscript(id,after,seconds)}
export async function loadAdminTranscript(id:string,after=-1,seconds?:number){await guardAdmin();return loadTranscript(id,after,seconds,true)}

/** Export every stored segment, independently of the viewer's 100-row window. */
export async function downloadAdminTranscriptJson(id: string): Promise<{ filename: string; json: string; updatedAt: string; durationSeconds: number | null; title: string; channel: string | null; searchable: boolean }> {
  await guardAdmin()
  z.string().uuid().parse(id)
  const { data: video, error } = await serviceClient.from('youtube_transcripts').select('title,channel,searchable,raw_transcript,updated_at,duration_seconds').eq('id', id).maybeSingle()
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
  return { filename: transcriptJsonFilename(video.title), json: serialiseTranscriptJson(segments, video.raw_transcript), updatedAt: video.updated_at, durationSeconds: video.duration_seconds, title: video.title, channel: video.channel, searchable: video.searchable }
}

/** Validate with Manual Import, then commit content and metadata in one RPC. */
export async function saveAdminTranscriptJson(id: string, input: {json:string;title:string;channel:string;searchable:boolean;updatedAt:string;duration?:string;durationFormat?:'clock'|'minutes'}): Promise<{ok:true;updatedAt:string;json:string}|{ok:false;error:string}> {
  try {
    const actor = await adminIdentity()
    z.string().uuid().parse(id)
    const value = z.object({json:z.string().max(MAX_TRANSCRIPT_BYTES),title:z.string().trim().min(1,'Enter a video title.').max(300),channel:z.string().trim().max(300),searchable:z.boolean(),updatedAt:z.string().datetime({offset:true}),duration:z.string().max(30).optional(),durationFormat:z.enum(['clock','minutes']).default('clock')}).parse(input)
    const {data:video,error:readError} = await serviceClient.from('youtube_transcripts').select('youtube_id,duration_seconds').eq('id',id).single()
    if (readError || !video) throw new Error('Transcript not found.')
    const {raw} = await resolveManualJson(value.json,video.youtube_id,value.duration,undefined,value.durationFormat,video.duration_seconds)
    const {data,error} = await serviceClient.rpc('admin_update_transcript_json',{p_actor:actor,p_id:id,p_raw:raw as unknown as Json,p_title:value.title,p_channel:value.channel,p_searchable:value.searchable,p_updated_at:value.updatedAt})
    if (error) throw new Error(/transcript_edit_conflict/.test(error.message)?'This transcript changed after you opened it. Reopen Edit before saving. Your edits are still here.':/transcript_edit_busy/.test(error.message)?'Wait for transcript processing and translation to finish before editing.':/generation_incomplete/.test(error.message)?'Published generated transcripts need English for every segment. Add the missing translations or turn publication off.':'Could not save transcript. Please retry.')
    for (const path of ['/admin/transcripts','/explore/search','/explore',`/transcripts/${id}`]) revalidatePath(path)
    return {ok:true,updatedAt:z.string().parse(data),json:JSON.stringify({content:raw.content},null,2)}
  } catch (error) {
    return {ok:false,error:error instanceof z.ZodError?error.issues.map(issue=>issue.message).join('\n'):error instanceof Error?(error.message==='Forbidden'?'Administrators only.':error.message):'Could not save transcript.'}
  }
}
