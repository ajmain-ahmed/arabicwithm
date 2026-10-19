'use server'

import { z } from 'zod'
import { unstable_cache } from 'next/cache'
import { serviceClient } from '@/app/lib/supabase'
import { forYouTokens, hourlySeed, type ForYouClip } from '@/app/lib/forYou'

async function loadForYouClips(seed: string, excluded: number[], recent: string[]): Promise<ForYouClip[]> {
 const input=z.object({seed:z.string().min(1).max(64),excluded:z.array(z.number().int().nonnegative()).max(10000),recent:z.array(z.string().uuid()).max(100)}).parse({seed,excluded,recent})
 const {data,error}=await serviceClient.rpc('transcript_for_you_groups',{p_seed:input.seed,p_excluded:input.excluded,p_recent:input.recent,p_limit:5,p_group_ids:[]})
 if(error)throw new Error('Unable to load For You clips. Please retry.')
 const clips=(data??[]) as unknown as ForYouClip[]
 if(!clips.length)return []
 // The RPC returns the raw source tokens for the selected segments, so no
 // full raw-transcript pull is needed here.
 return clips.map(clip=>({...clip,segments:clip.segments.map(segment=>({...segment,tokens:forYouTokens(segment.canonical_paragraph,Array.isArray(segment.source_tokens)?{tokens:segment.source_tokens}:undefined)}))}))
}

const fetchInitialForYouClips = unstable_cache(
  async (seed: string) => loadForYouClips(seed, [], []),
  ['for-you-initial'],
  { revalidate: 180 },
)

/** No persisted clip rows: every batch checks current publication (via the
    5-minute candidate cache inside the RPC). */
export async function fetchForYouClips(seed:string,excluded:number[]=[],recent:string[]=[]):Promise<ForYouClip[]> {
 const input=z.object({seed:z.string().min(1).max(64),excluded:z.array(z.number().int().nonnegative()).max(10000),recent:z.array(z.string().uuid()).max(100)}).safeParse({seed,excluded,recent})
 if(!input.success) throw new Error('Unable to load For You clips. Please retry.')
 if(input.data.excluded.length===0&&input.data.recent.length===0) return fetchInitialForYouClips(input.data.seed)
 return loadForYouClips(input.data.seed,input.data.excluded,input.data.recent)
}

export { hourlySeed }
