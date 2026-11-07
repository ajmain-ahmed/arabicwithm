'use server'

import { getAuthenticatedUserId, guardAdmin } from '@/app/actions/auth'

async function requireForYouUser() {
 if (!(await getAuthenticatedUserId())) throw new Error('Sign in to use For You.')
}

import { forYouGroupPool } from '@/app/lib/forYouGroups'
import { headers } from 'next/headers'
import { rateLimit } from '@/app/lib/rateLimit'
import { z } from 'zod'
import { serviceClient } from '@/app/lib/supabase'
import {loadHomeSpotlight} from '@/app/lib/homeSpotlight.server'
import { type ForYouClip, type ForYouSegment } from '@/app/lib/forYou'
import {forYouRecord,forYouId,normaliseForYouClip,normaliseForYouSegment} from '@/app/lib/forYouData'

function diagnostic(category:string,details:Record<string,unknown>={}){
 console.warn('[for-you]',{route:'/explore',category,...details})
}

async function allowForYouRead(){
 if(await getAuthenticatedUserId())return
 const ip=(await headers()).get('x-forwarded-for')?.split(',')[0]??'local'
 if(!rateLimit(`guest-for-you:${ip}`,120,60000).ok)throw new Error('Please try For You again shortly.')
}

async function loadForYouClips(seed: string, excluded: number[], recent: string[], groups: string[] = [], language:'ar'|'en'='ar', limit=5): Promise<ForYouClip[]> {
 const input=z.object({seed:z.string().min(1).max(64),excluded:z.array(z.number().int().nonnegative()).max(10000),recent:z.array(z.string().uuid()).max(10000)}).parse({seed,excluded,recent})
 const excludedIds=new Set(input.excluded),recentIds=input.recent.slice(0,100),clips:ForYouClip[]=[]
 const pool=await forYouGroupPool(language,groups)
 if(pool.empty)return []
 const rawSources=new Map<string,unknown>()
 const deadline=Date.now()+8000
 while(clips.length<limit){
  if(Date.now()>deadline||excludedIds.size>10000)throw new Error('Unable to complete For You filtering. Please retry or narrow your groups.')
  const {data,error}=await serviceClient.rpc('transcript_for_you_groups',{p_seed:input.seed,p_excluded:[...excludedIds].slice(-10000),p_recent:recentIds.slice(0,100),p_limit:limit-clips.length,p_group_ids:pool.groups})
  if(error){diagnostic('rpc_failure',{code:error.code});throw new Error('Unable to load For You clips. Please retry.')}
  if(!Array.isArray(data)){diagnostic('invalid_batch');throw new Error('Unable to load For You clips. Please retry.')}
  if(!data.length)break
  let rejected=false,progress=false
  for(const value of data){
   if(!forYouRecord(value))continue
   const video=forYouRecord(value.video)?value.video:null
   if(!video||typeof video.id!=='string')continue
   if(!pool.accepts(video.id)){
    // Skip every candidate of a rejected source, not just its opening clip.
    // Existing RPC remains responsible for publication, quality and randomness.
    for(let offset=0;;offset+=500){
     const {data:ids,error:skipError}=await serviceClient.from('for_you_candidates').select('segment_id').eq('transcript_id',video.id).order('segment_id').range(offset,offset+499)
     if(skipError||!ids)throw new Error('Unable to load For You clips. Please retry.')
     for(const row of ids)if(!excludedIds.has(row.segment_id)){excludedIds.add(row.segment_id);progress=true}
     if(ids.length<500)break
    }
    if(Array.isArray(value.segments))for(const segment of value.segments){const id=forYouRecord(segment)?forYouId(segment.id):null;if(id!==null&&!excludedIds.has(id)){excludedIds.add(id);progress=true}}
    rejected=true
    continue
   }
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
 return clips.slice(0,limit)
}

/** Every batch reads the transactionally maintained live candidate index. */
export async function fetchForYouClips(seed:string,excluded:number[]=[],recent:string[]=[],groups:string[]=[],language:'ar'|'en'='ar'):Promise<ForYouClip[]> {
 await allowForYouRead()
 const input=z.object({seed:z.string().min(1).max(64),excluded:z.array(z.number().int().nonnegative()).max(10000),recent:z.array(z.string().uuid()).max(10000)}).safeParse({seed,excluded,recent})
 if(!input.success) throw new Error('Unable to load For You clips. Please retry.')
 z.array(z.string().uuid()).max(100).parse(groups)
 z.enum(['ar','en']).parse(language)
 return loadForYouClips(input.data.seed,input.data.excluded,input.data.recent,groups,language)
}

/** Load a source once on opening a clip, never on time updates or seeks.
 * For You publication is independent of searchable-library publication. */
export async function fetchForYouTranscript(id:string):Promise<ForYouSegment[]> {
 await allowForYouRead()
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

/** Public promotional excerpt only: no Auth, profile, usage or progress calls. */
export async function fetchHomeForYouSpotlight():Promise<ForYouClip|null>{
 const ip=(await headers()).get('x-forwarded-for')?.split(',')[0]??'local'
 if(!rateLimit(`home-spotlight:${ip}`,60,60000).ok)throw new Error('Please try the preview again shortly.')
 return loadHomeSpotlight()
}
