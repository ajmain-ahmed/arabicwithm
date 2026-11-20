'use client'

import EnglishForYouSegment from '@/app/explore/EnglishForYouSegment'
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react'
import {Box,Button,Typography} from '@mui/material'
import {fetchHomeForYouSpotlight} from '@/app/actions/forYou'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import {segmentAtTime,type ForYouClip} from '@/app/lib/forYou'
import GuestForYouAllowance from '@/app/explore/GuestForYouAllowance'
import {useForYouMeter} from '@/app/explore/ForYouMeterContext'
import {getExploreSoundPreference,setExploreSoundPreference,subscribeToExploreSoundPreference} from '@/app/lib/explore'
import SpotlightPlayerFrame from './SpotlightPlayerFrame'

export type SoundControl={muted:boolean;ready:boolean;toggle:()=>void}
type SoundReporter=(control:SoundControl|null)=>void
function SpotlightPlayer({clip,onUnavailable,onSound}:{clip:ForYouClip;onUnavailable:(id:string)=>void;onSound:SoundReporter}){
 const [time,setTime]=useState(clip.clip_start_ms/1000)
 const sample=useForYouMeter()
 const soundEnabled=useSyncExternalStore(subscribeToExploreSoundPreference,getExploreSoundPreference,()=>true)
 const {wrapRef,isReady,isPlaying,playbackRate,pauseVideo,errorCode,retry,isMuted,getSoundMuted,mute,playWithSound}=useYouTubePlayer(clip.video.youtube_id,updateTime,clip.clip_start_ms/1000,{requireTimeUpdates:true,replayClipOnNativePlay:true,autoplay:false,muted:!soundEnabled,verifySoundState:true,onNativeMuteChange:muted=>setExploreSoundPreference(!muted),endAt:clip.clip_end_ms/1000})
 const toggle=useCallback(()=>{
  const muted=getSoundMuted()
  setExploreSoundPreference(muted)
  if(muted)playWithSound();else mute()
 },[getSoundMuted,playWithSound,mute])
 useEffect(()=>{onSound({muted:isMuted,ready:isReady,toggle});return()=>onSound(null)},[isMuted,isReady,toggle,onSound])
 useEffect(()=>{if(!soundEnabled)mute()},[soundEnabled,mute])
 function updateTime(seconds:number){setTime(seconds);sample?.({time:seconds,playing:isReady&&isPlaying,rate:playbackRate,pause:pauseVideo})}
 const line=segmentAtTime(clip.segments,time)
 useEffect(()=>{if(errorCode!==null&&[5,100,101,150,153].includes(errorCode))onUnavailable(clip.video.id)},[errorCode,clip.video.id,onUnavailable])
 return <>
  <SpotlightPlayerFrame videoId={clip.video.youtube_id} subtitle={clip.video.source_language==='en'&&line?<EnglishForYouSegment line={line} settings={{meanings:true,sentence:true}} time={time}/>:<>
   <Typography lang="ar" dir="rtl" sx={{fontFamily:'var(--font-serif)',fontSize:{xs:22,md:26},lineHeight:1.6,textAlign:'center'}}>{line?.original_text??'\u00a0'}</Typography>
   {line?.english_text&&<Typography lang="en" sx={{fontSize:13,color:'var(--awm-muted)',mt:.5,textAlign:'center'}}>{line.english_text}</Typography>}
  </>}><Box ref={wrapRef} data-spotlight-ready={isReady} data-spotlight-playing={isPlaying} data-spotlight-time={time} data-spotlight-start={clip.clip_start_ms/1000} data-spotlight-end={clip.clip_end_ms/1000} sx={{position:'absolute',inset:0}}/></SpotlightPlayerFrame>
  {errorCode&&<Box role="alert" sx={{mt:2,textAlign:'center'}}><Typography>The YouTube preview could not load (error {errorCode}).</Typography><Button onClick={retry}>Retry player</Button></Box>}
 </>
}
function SpotlightContent({initialClip,initialError=false,discover=false,onSound}:{initialClip:ForYouClip|null;initialError?:boolean;discover?:boolean;onSound:SoundReporter}){
 const [clip,setClip]=useState(initialClip),[error,setError]=useState(initialError),[busy,setBusy]=useState(discover&&!initialClip)
 const discovery=useRef<Promise<ForYouClip|null>|null>(null)
 useEffect(()=>{
  if(!discover||initialClip)return
  let active=true
  // Repeated effects share one request; late results cannot update an unmounted player.
  discovery.current??=fetchHomeForYouSpotlight()
  void discovery.current.then(next=>{if(active){setClip(next);setError(false)}}).catch(()=>{if(active)setError(true)}).finally(()=>{if(active)setBusy(false)})
  return()=>{active=false}
 },[discover,initialClip])
 const replaced=useRef(false)
 const replaceUnavailable=useCallback((id:string)=>{
  if(replaced.current)return
  replaced.current=true
  setBusy(true)
  void fetchHomeForYouSpotlight(id).then(next=>{setClip(next);setError(!next)}).catch(()=>setError(true)).finally(()=>setBusy(false))
 },[])
 async function retry(){setBusy(true);try{setClip(await fetchHomeForYouSpotlight());setError(false)}catch{setError(true)}finally{setBusy(false)}}
 return clip?<SpotlightPlayer key={`${clip.video.id}:${clip.clip_start_ms}`} clip={clip} onUnavailable={replaceUnavailable} onSound={onSound}/>:<Box role={error?'alert':'status'} sx={{py:2,textAlign:'center'}}>{busy?'Loading a preview\u2026':error?'The preview could not load. Please retry or explore For You.':'No eligible Arabic preview is available right now. Explore more in For You.'}{error&&<Button disabled={busy} onClick={()=>void retry()}>Retry preview</Button>}</Box>
}
export default function DeferredSpotlightContent({ guest, ...props }: { guest: boolean; initialClip: ForYouClip | null; initialError?: boolean; discover?: boolean; onSound: SoundReporter }) {
 return guest ? <GuestForYouAllowance home><SpotlightContent {...props}/></GuestForYouAllowance> : <SpotlightContent {...props}/>
}
