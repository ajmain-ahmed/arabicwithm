"use server"
import { randomUUID } from 'node:crypto'
import { unstable_cache } from 'next/cache'
import { serviceClient } from '@/app/lib/supabase'
import { extractMemoryCards, type MemoryEpisodeInput } from '@/app/lib/memory'
import { normalizeNewTranscript, isNewTranscript } from '@/app/lib/cartoons'
import { extractPuzzleVocabulary, type PuzzleVocabularySource } from '@/app/lib/transcriptPuzzles'
import type { MemoryLibrary } from './memory'
import { z } from 'zod'
// Only metadata is shared. Content edits invalidate the existing catalogue tag.
const sources = unstable_cache(async()=>{
 const {data,error}=await serviceClient.from('episodes').select('id,show_id,slug,title,level').not('transcript','is',null).not('transcript','eq','[]').order('id').limit(256)
 if(error)throw new Error('Practice sources are temporarily unavailable.')
 return data ?? []
},['learn-sources-v2-nonempty'],{revalidate:300,tags:['cartoons-public']})
const preparedSource = unstable_cache(async(id:string)=>{
 const columns=['id','show_id','slug','title','level',...Array.from({length:32},(_,i)=>`b${i}:transcript->${i},l${i}:transcript->scriptBlocks->${i}`)].join(',')
 const {data,error}=await serviceClient.from('episodes').select(columns).eq('id',id).single()
 if(error||!data)throw new Error('This practice source could not load. Please retry.')
 const row=data as unknown as Record<string,unknown>
 const {data:show,error:showError}=await serviceClient.from('shows').select('id,slug,title').eq('id',String(row.show_id)).single()
 if(showError||!show)throw new Error('This practice source could not load. Please retry.')
 const modern=Array.from({length:32},(_,i)=>row[`b${i}`]).filter(Boolean)
 const legacy=Array.from({length:32},(_,i)=>row[`l${i}`]).filter(Boolean)
 const episode:MemoryEpisodeInput={id,showId:show.id,showSlug:show.slug,showTitle:show.title,episodeSlug:String(row.slug),episodeTitle:String(row.title),level:row.level?String(row.level):undefined,transcript:modern.length?modern:{scriptBlocks:legacy}}
 const blocks=isNewTranscript(episode.transcript)?normalizeNewTranscript(episode.transcript).scriptBlocks:[]
 const words=extractPuzzleVocabulary(blocks.map(b=>({timestamp:b.timestamp,arabic:b.arabicDiacritic,arabicPlain:b.arabicPlain,translation:b.english||b.title,words:b.words})),24)
 const cards=extractMemoryCards(episode).slice(0,5)
 // The shared cache contains compact teaching data, never transcript JSON.
 return {id,showId:show.id,showSlug:show.slug,showTitle:show.title,episodeSlug:episode.episodeSlug,episodeTitle:episode.episodeTitle,words,cards}
},['learn-source-v1'],{revalidate:300,tags:['cartoons-public']})
async function sample(exclude?:string, minimumWords?:number){
 if(exclude && !z.string().uuid().safeParse(exclude).success)throw new Error('Invalid practice source.')
 const rows=(await sources()).filter(r=>r.id!==exclude)
 for(let attempt=0;attempt<4&&rows.length;attempt++){
  const row=rows.splice(Math.floor(Math.random()*rows.length),1)[0]
  const prepared=await preparedSource(row.id)
  if(minimumWords!==undefined?prepared.words.length>=minimumWords:prepared.cards.length>0)return prepared
 }
 return null
}
export async function fetchLearnMemory(exclude?:string):Promise<MemoryLibrary>{
 const episode=await sample(exclude)
 const cards=episode?.cards??[]
 return {cards,shows:[],scope:'episode',scopeTitle:episode?.episodeTitle??'Memory',selectedEpisodeId:episode?.id,selectedShowId:episode?.showId,missingScope:false,recommendedCardCount:5,availableCardCount:cards.length,newOnly:false}
}
export async function fetchLearnPuzzle(exclude?:string, minimum=6):Promise<PuzzleVocabularySource|null>{
 if(!z.number().int().min(4).max(10).safeParse(minimum).success)throw new Error('Invalid puzzle size.')
 const episode=await sample(exclude?.replace(/^episode:/,''),minimum)
 if(!episode)return null
 const words=episode.words
 if(words.length<minimum)return null
 return {type:'episode',id:episode.id,puzzleId:randomUUID(),title:episode.showTitle,subtitle:episode.episodeTitle,href:`/cartoons/${encodeURIComponent(episode.showSlug)}/${encodeURIComponent(episode.episodeSlug)}`,words}
}
