'use server'

import { z } from 'zod'
import { serviceClient } from '@/app/lib/supabase'
import { forYouTokens,type ForYouClip } from '@/app/lib/forYou'

/** No Next cache or persisted clip rows: every batch checks current publication. */
export async function fetchForYouClips(seed:string,excluded:number[]=[],recent:string[]=[]):Promise<ForYouClip[]> {
 const input=z.object({seed:z.string().min(1).max(64),excluded:z.array(z.number().int().nonnegative()).max(10000),recent:z.array(z.string().uuid()).max(100)}).parse({seed,excluded,recent})
 const {data,error}=await serviceClient.rpc('transcript_for_you_groups',{p_seed:input.seed,p_excluded:input.excluded,p_recent:input.recent,p_limit:5,p_group_ids:[]})
 if(error)throw new Error('Unable to load For You clips. Please retry.')
 const clips=(data??[]) as unknown as ForYouClip[]
 if(!clips.length)return []
 // Canonical projections require complete dictionary metadata; raw source tokens
 // preserve valid glosses when a segment only has partial enrichment.
 const {data:sources,error:sourceError}=await serviceClient.from('youtube_transcripts').select('id,raw_transcript').in('id',clips.map(c=>c.video.id))
 if(sourceError)throw new Error('Unable to load transcript words. Please retry.')
 const byId=new Map((sources??[]).map(s=>[s.id,s.raw_transcript]))
 return clips.map(clip=>{
  const raw=byId.get(clip.video.id)
  const content=raw&&typeof raw==='object'&&!Array.isArray(raw)&&Array.isArray(raw.content)?raw.content:[]
  return {...clip,segments:clip.segments.map(segment=>({...segment,tokens:forYouTokens(segment.canonical_paragraph,content[segment.position])}))}
 })
}
