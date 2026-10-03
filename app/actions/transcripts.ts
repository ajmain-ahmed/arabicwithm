'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedAccess, guardAdmin } from '@/app/actions/auth'
import { serviceClient } from '@/app/lib/supabase'
import type { Json } from '@/app/lib/supabase/database.types'
import { normaliseManualTranscript, transcriptVideoId } from '@/app/lib/manualTranscripts'

export interface TranscriptRow {id:string;youtube_id:string;canonical_url:string;title:string;channel:string|null;thumbnail:string;duration_seconds:number|null;provider:string;status:string;translation_status:string;searchable:boolean;created_at:string;updated_at:string;error_code:string|null}
export interface TranscriptSegment {id:number;position:number;original_text:string;english_text:string|null;start_seconds:number;end_seconds:number}
export interface TranscriptHit {segment_id:number;transcript_id:string;youtube_id:string;title:string;channel:string|null;thumbnail:string;start_seconds:number;end_seconds:number;original_text:string;english_text:string|null;matched_surfaces:string[];match_type:string;match_rank:number;previous_text:string|null;next_text:string|null}
const columns='id,youtube_id,canonical_url,title,channel,thumbnail,duration_seconds,provider,status,translation_status,searchable,created_at,updated_at,error_code'
async function adminIdentity():Promise<string> {const access=await getAuthenticatedAccess();if(!access?.admin) throw new Error('Forbidden');return access.userId}
export async function listAdminTranscripts(page=0):Promise<{rows:TranscriptRow[];total:number}> {
  await guardAdmin();z.number().int().min(0).max(100000).parse(page)
  const {data,error,count}=await serviceClient.from('youtube_transcripts').select(columns,{count:'exact'}).order('created_at',{ascending:false}).order('id').range(page*30,page*30+29)
  if(error)throw new Error('Unable to load transcripts. Please retry.')
  return {rows:data??[],total:count??0}
}
export async function addAdminYouTubeTranscript(input:string):Promise<string> {
  const actor=await adminIdentity(),id=transcriptVideoId(input)
  // Saved canonical work is always reused, even if the operator is on cooldown.
  const {data:existing,error:lookupError}=await serviceClient.from('youtube_transcripts').select('id').eq('youtube_id',id).maybeSingle()
  if(lookupError)throw new Error('Unable to check the canonical library.')
  if(existing)return existing.id
  const {data,error}=await serviceClient.rpc('register_youtube_transcript',{p_user:actor,p_youtube_id:id})
  if(error)throw new Error(/limit/.test(error.message)?'Import quota reached. Please try later.':'Unable to queue transcript import.')
  revalidatePath('/admin/transcripts');return data
}
export async function importAdminManualTranscript(input:{url:string;title:string;channel:string;arabic:string;english?:string;searchable:boolean}):Promise<string> {
  const actor=await adminIdentity()
  const value=z.object({url:z.string().max(2048),title:z.string().trim().min(1).max(300),channel:z.string().trim().max(300),arabic:z.string().max(1048576),english:z.string().max(1048576).optional(),searchable:z.boolean()}).parse(input)
  const id=transcriptVideoId(value.url)
  const raw=normaliseManualTranscript(value.arabic,value.english)
  const {data,error}=await serviceClient.rpc('admin_import_youtube_transcript',{p_actor:actor,p_youtube_id:id,p_title:value.title,p_channel:value.channel,p_raw:raw as unknown as Json,p_searchable:value.searchable})
  if(error)throw new Error('Unable to import the timed transcript. Existing canonical content has not been replaced.')
  revalidatePath('/admin/transcripts');return data
}
export async function updateAdminTranscript(id:string,input:{title:string;channel:string;searchable:boolean}):Promise<void> {
  await guardAdmin();z.string().uuid().parse(id)
  const value=z.object({title:z.string().trim().min(1).max(300),channel:z.string().trim().max(300),searchable:z.boolean()}).parse(input)
  const {data:video,error:readError}=await serviceClient.from('youtube_transcripts').select('status').eq('id',id).single()
  if(readError||!video)throw new Error('Transcript not found.')
  if(value.searchable&&video.status!=='ready')throw new Error('Wait for processing to finish before publishing.')
  const {error}=await serviceClient.from('youtube_transcripts').update({...value,updated_at:new Date().toISOString()}).eq('id',id)
  if(error)throw new Error('Unable to save transcript settings.')
  revalidatePath('/admin/transcripts');revalidatePath(`/transcripts/${id}`)
}
export async function searchTranscriptWord(word:string,after=0,rank=0):Promise<TranscriptHit[]> {
  const query=z.string().trim().min(1).max(200).parse(word)
  if(/\s/.test(query))throw new Error('Search one Arabic word at a time.')
  z.number().int().min(0).parse(after);z.number().int().min(0).max(3).parse(rank)
  const {data,error}=await serviceClient.rpc('search_transcript_word',{p_word:query,p_after:after,p_after_rank:rank,p_limit:20})
  if(error)throw new Error('Unable to search the shared transcript library.')
  return data as unknown as TranscriptHit[]
}
export async function loadPublicTranscript(id:string,after=-1,seconds?:number):Promise<{video:TranscriptRow;segments:TranscriptSegment[]}|null> {
  z.string().uuid().parse(id);z.number().int().min(-1).parse(after)
  // Service reads always explicitly enforce the existing public corpus boundary.
  const {data:video,error}=await serviceClient.from('youtube_transcripts').select(columns).eq('id',id).eq('status','ready').eq('searchable',true).maybeSingle()
  if(error)throw new Error('Unable to load transcript.')
  if(!video)return null
  if(seconds!==undefined&&after===-1){
    z.number().finite().min(0).max(43200).parse(seconds)
    const {data:anchor,error:anchorError}=await serviceClient.from('transcript_segments').select('position').eq('transcript_id',id).lte('start_seconds',seconds).order('start_seconds',{ascending:false}).order('position',{ascending:false}).limit(1).maybeSingle()
    if(anchorError)throw new Error('Unable to locate transcript timestamp.')
    after=Math.max(0,(anchor?.position??0)-15)-1
  }
  const {data:segments,error:segmentError}=await serviceClient.from('transcript_segments').select('id,position,original_text,english_text,start_seconds,end_seconds').eq('transcript_id',id).gt('position',after).order('position',{ascending:true}).limit(100)
  if(segmentError)throw new Error('Unable to load transcript segments.')
  return {video,segments:segments??[]}
}
