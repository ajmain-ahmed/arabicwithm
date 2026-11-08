import 'server-only'
import {spokenForYouClip} from './forYouSpeech'
import {randomUUID} from 'node:crypto'
import {serviceClient} from '@/app/lib/supabase'
import {forYouRecord,normaliseForYouClip} from '@/app/lib/forYouData'
import type {ForYouClip} from '@/app/lib/forYou'

/** One eligible result, selected in SQL. One optional raw-token compatibility
 * query shares the same deadline; never enter the normal feed refill path. */
export async function loadHomeSpotlight(excludedTranscript?:string):Promise<ForYouClip|null>{
 const started=performance.now()
 // A single shared deadline accommodates occasional transport spikes without
 // introducing a feed/refill loop. Typical live selection is well below 500ms.
 const seed=randomUUID(),signal=AbortSignal.timeout(3000)
 for(const allowSourceTokens of [false,true]){
  const {data,error}=await serviceClient.rpc('home_for_you_spotlight',{p_seed:allowSourceTokens&&excludedTranscript?`${seed}:replacement`:seed,p_allow_source_tokens:allowSourceTokens}).abortSignal(signal)
  if(error){console.error('[home-spotlight]',{category:'selection_failed',code:error.code,message:error.message,details:error.details,hint:error.hint,elapsed_ms:Math.round(performance.now()-started)});throw new Error('The preview selection could not load.')}
  if(data===null)continue
  const selected=normaliseForYouClip(data)
  const clip=selected?spokenForYouClip(selected,{minSeconds:30,maxSeconds:60}):null
  if(!selected||selected.clip_end_ms-selected.clip_start_ms<30000||selected.clip_end_ms-selected.clip_start_ms>60000){
   console.warn('[home-spotlight]',{category:'invalid_selected_clip'});throw new Error('The preview selection returned invalid timing or subtitles.')
  }
  if(!clip)continue
  if(clip.video.id===excludedTranscript)continue
  console.info('[home-spotlight]',{category:'selected',youtube_id:clip.video.youtube_id,duration_seconds:(clip.clip_end_ms-clip.clip_start_ms)/1000,elapsed_ms:Math.round(performance.now()-started),...(forYouRecord(data)&&forYouRecord(data.diagnostics)?data.diagnostics:{})})
  return clip
 }
 console.warn('[home-spotlight]',{category:'no_eligible_speech_window',elapsed_ms:Math.round(performance.now()-started)})
 return null
}
