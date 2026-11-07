import 'server-only'
import {transcriptSourceLanguages} from './transcriptSourceLanguage.server'
import {spokenForYouClip} from './forYouSpeech'
import {randomUUID} from 'node:crypto'
import {serviceClient} from '@/app/lib/supabase'
import {normaliseForYouClip} from '@/app/lib/forYouData'
import type {ForYouClip} from '@/app/lib/forYou'

/** One eligible result, selected in SQL. One optional raw-token compatibility
 * query shares the same deadline; never enter the normal feed refill path. */
export async function loadHomeSpotlight():Promise<ForYouClip|null>{
 const seed=randomUUID(),signal=AbortSignal.timeout(1500)
 for(const allowSourceTokens of [false,true]){
  const {data,error}=await serviceClient.rpc('home_for_you_spotlight',{p_seed:seed,p_allow_source_tokens:allowSourceTokens}).abortSignal(signal)
  if(error){console.warn('[home-spotlight]',{category:'selection_failed',code:error.code});throw new Error('The preview selection could not load.')}
  if(data===null)continue
  const selected=normaliseForYouClip(data)
  const clip=selected?spokenForYouClip(selected,{minSeconds:30,maxSeconds:60}):null
  if(!selected||selected.clip_end_ms-selected.clip_start_ms<30000||selected.clip_end_ms-selected.clip_start_ms>60000){
   console.warn('[home-spotlight]',{category:'invalid_selected_clip'});throw new Error('The preview selection returned invalid timing or subtitles.')
  }
  if(!clip)continue
  const languages=await transcriptSourceLanguages([clip.video.id],signal)
  return {...clip,video:{...clip.video,source_language:languages.get(clip.video.id)??'ar'}}
 }
 return null
}
