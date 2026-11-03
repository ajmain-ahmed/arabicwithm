'use server'

import { getAuthenticatedUserId, guardAdmin } from '@/app/actions/auth'

async function requireForYouUser() {
 if (!(await getAuthenticatedUserId())) throw new Error('Sign in to use For You.')
}

import { z } from 'zod'
import { serviceClient } from '@/app/lib/supabase'
import { type ForYouClip, type ForYouSegment } from '@/app/lib/forYou'
import {forYouRecord,forYouId,normaliseForYouClip,normaliseForYouSegment} from '@/app/lib/forYouData'

function diagnostic(category:string,details:Record<string,unknown>={}){
 console.warn('[for-you]',{route:'/explore',category,...details})
}

async function loadForYouClips(seed: string, excluded: number[], recent: string[], groups: string[] = []): Promise<ForYouClip[]> {
 const input=z.object({seed:z.string().min(1).max(64),excluded:z.array(z.number().int().nonnegative()).max(10000),recent:z.array(z.string().uuid()).max(10000)}).parse({seed,excluded,recent})
 const excludedIds=new Set(input.excluded),recentIds=input.recent.slice(0,100),clips:ForYouClip[]=[]
 const rawSources=new Map<string,unknown>()
 for(let attempt=0;attempt<3&&clips.length<5;attempt++){
  const {data,error}=await serviceClient.rpc('transcript_for_you_groups',{p_seed:input.seed,p_excluded:[...excludedIds].slice(-10000),p_recent:recentIds.slice(0,100),p_limit:5-clips.length,p_group_ids:groups})
  if(error){diagnostic('rpc_failure',{code:error.code});throw new Error('Unable to load For You clips. Please retry.')}
  if(!Array.isArray(data)){diagnostic('invalid_batch');throw new Error('Unable to load For You clips. Please retry.')}
  if(!data.length)break
  let rejected=false,progress=false
  for(const value of data){
   if(!forYouRecord(value))continue
   const video=forYouRecord(value.video)?value.video:null
   let clip=normaliseForYouClip(value)
   // Older/unfiltered RPCs may omit source_tokens. Retrieve only selected
   // sources when the shared resolver cannot produce a usable segment.
   if(!clip&&video&&typeof video.id==='string'&&z.string().uuid().safeParse(video.id).success){
    if(!rawSources.has(video.id)){
     const {data:row,error:rawError}=await serviceClient.from('youtube_transcripts').select('raw_transcript').eq('id',video.id).eq('status','ready').eq('explore_published',true).maybeSingle()
     if(rawError){diagnostic('raw_source_failure',{transcript_id:video.id,code:rawError.code});throw new Error('Unable to load For You clips. Please retry.')}
     rawSources.set(video.id,row?.raw_transcript)
    }
    clip=normaliseForYouClip(value,rawSources.get(video.id))
   }
   if(Array.isArray(value.segments))for(const segment of value.segments){const id=forYouRecord(segment)?forYouId(segment.id):null;if(id!==null&&!excludedIds.has(id)){excludedIds.add(id);progress=true}}
   if(!clip){rejected=true;diagnostic('invalid_clip',{transcript_id:typeof video?.id==='string'&&z.string().uuid().safeParse(video.id).success?video.id:undefined,segment_ids:Array.isArray(value.segments)?value.segments.flatMap(s=>forYouRecord(s)&&forYouId(s.id)!==null?[forYouId(s.id)]:[]):[]});continue}
   if(!clips.some(item=>item.video.id===clip.video.id))clips.push(clip)
   if(!recentIds.includes(clip.video.id))recentIds.unshift(clip.video.id)
  }
  if(!rejected||!progress)break
 }
 return clips.slice(0,5)
}

/** Every batch reads the transactionally maintained live candidate index. */
export async function fetchForYouClips(seed:string,excluded:number[]=[],recent:string[]=[],groups:string[]=[]):Promise<ForYouClip[]> {
 await requireForYouUser()
 const input=z.object({seed:z.string().min(1).max(64),excluded:z.array(z.number().int().nonnegative()).max(10000),recent:z.array(z.string().uuid()).max(10000)}).safeParse({seed,excluded,recent})
 if(!input.success) throw new Error('Unable to load For You clips. Please retry.')
 z.array(z.string().uuid()).max(100).parse(groups)
 return loadForYouClips(input.data.seed,input.data.excluded,input.data.recent,groups)
}

/** Load a source once on opening a clip, never on time updates or seeks.
 * For You publication is independent of searchable-library publication. */
export async function fetchForYouTranscript(id:string):Promise<ForYouSegment[]> {
 await requireForYouUser()
 z.string().uuid().parse(id)
 const {data:video,error}=await serviceClient.from('youtube_transcripts').select('id,raw_transcript').eq('id',id).eq('status','ready').eq('explore_published',true).filter('source_origin','eq','website_admin_transcript').maybeSingle()
 if(error)throw new Error('Unable to load the source transcript.')
 if(!video)return []
 const raw=forYouRecord(video.raw_transcript)&&Array.isArray(video.raw_transcript.content)?video.raw_transcript.content:[]
 const segments:ForYouSegment[]=[]
 for(let after=-1;;){
  const {data,error}=await serviceClient.from('transcript_segments').select('id,position,original_text,english_text,start_seconds,end_seconds,canonical_paragraph').eq('transcript_id',id).gt('position',after).order('position').limit(500)
  if(error)throw new Error('Unable to load the source transcript.')
  if(!Array.isArray(data)){diagnostic('invalid_full_batch',{transcript_id:id});throw new Error('Unable to load the source transcript.')}
  const batch=data
  for(const segment of batch){const safe=normaliseForYouSegment(segment,forYouRecord(segment)?raw[Number(segment.position)]:undefined);if(safe)segments.push(safe);else diagnostic('invalid_full_segment',{transcript_id:id,segment_id:forYouRecord(segment)?forYouId(segment.id):null})}
  if(batch.length<500)break
  const last=batch[batch.length-1]
  const next=forYouRecord(last)?last.position:null
  if(typeof next!=='number'||!Number.isSafeInteger(next)||next<=after){diagnostic('invalid_full_position',{transcript_id:id});break}
  after=next
 }
 return segments
}


export async function fetchForYouGroups(): Promise<{id:string;name:string}[]> {
 await requireForYouUser()
 const {data,error}=await serviceClient.from('transcript_groups').select('id,name').order('name')
 if(error)throw new Error('Unable to load content groups.')
 return data ?? []
}

export interface ForYouDiagnostics {
 totalTranscripts:number; adminTranscripts:number; publishedTranscripts:number;
 eligibleTranscripts:number; eligibleSegments:number; uniqueVideos:number;
 sources:{id:string;title:string;youtubeId:string;published:boolean;eligibleSegments:number;excludedSegments:number;invalidSegments:number;errorCode:string|null;reasons:string[]}[]
}
export async function fetchForYouDiagnostics():Promise<ForYouDiagnostics>{
 await guardAdmin()
 const {data,error}=await serviceClient.rpc('website_for_you_diagnostics')
 if(error)throw new Error('Unable to load For You diagnostics. Check the live feed migration.')
 return data as unknown as ForYouDiagnostics
}
