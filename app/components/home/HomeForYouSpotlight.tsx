'use client'

import EnglishForYouSegment from '@/app/explore/EnglishForYouSegment'
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react'
import {useRouter} from 'next/navigation'
import {Box,Button,IconButton,Paper,Typography} from '@mui/material'
import {useAuth} from '@/app/AuthContext'
import {fetchHomeForYouSpotlight} from '@/app/actions/forYou'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import {segmentAtTime,type ForYouClip} from '@/app/lib/forYou'
import GuestForYouAllowance from '@/app/explore/GuestForYouAllowance'
import {useForYouMeter} from '@/app/explore/ForYouMeterContext'
import {VolumeOff,VolumeUp} from '@mui/icons-material'
import {getExploreSoundPreference,setExploreSoundPreference,subscribeToExploreSoundPreference} from '@/app/lib/explore'
import SpotlightPlayerFrame from './SpotlightPlayerFrame'

type SoundControl={muted:boolean;ready:boolean;toggle:()=>void}
type SoundReporter=(control:SoundControl|null)=>void
function SpotlightPlayer({clip,onUnavailable,onSound}:{clip:ForYouClip;onUnavailable:(id:string)=>void;onSound:SoundReporter}){
 const [time,setTime]=useState(clip.clip_start_ms/1000)
 const sample=useForYouMeter()
 const soundEnabled=useSyncExternalStore(subscribeToExploreSoundPreference,getExploreSoundPreference,()=>true)
 const restored=useRef(false)
 const {wrapRef,isReady,isPlaying,playbackRate,pauseVideo,errorCode,retry,isMuted,getSoundMuted,mute,playWithSound,syncSoundIntent}=useYouTubePlayer(clip.video.youtube_id,updateTime,clip.clip_start_ms/1000,{requireTimeUpdates:true,replayClipOnNativePlay:true,autoplay:true,muted:!soundEnabled,verifySoundState:true,onNativeMuteChange:muted=>setExploreSoundPreference(!muted),mutedAutoplayFallback:true,endAt:clip.clip_end_ms/1000})
 const toggle=useCallback(()=>{
  restored.current=true
  const muted=getSoundMuted()
  setExploreSoundPreference(muted)
  if(muted)playWithSound();else mute()
 },[getSoundMuted,playWithSound,mute])
 useEffect(()=>{onSound({muted:isMuted,ready:isReady,toggle});return()=>onSound(null)},[isMuted,isReady,toggle,onSound])
 useEffect(()=>{if(!soundEnabled)mute()},[soundEnabled,mute])
 useEffect(()=>{
  if(!isReady)return
  const restore=(event:Event)=>{
   if(!event.isTrusted||restored.current||(event.target instanceof Element&&event.target.closest('[data-spotlight-sound]')))return
   syncSoundIntent()
   if(!getExploreSoundPreference()||!getSoundMuted())return
   restored.current=true
   playWithSound()
  }
  document.addEventListener('pointerdown',restore)
  document.addEventListener('keydown',restore)
  return()=>{document.removeEventListener('pointerdown',restore);document.removeEventListener('keydown',restore)}
 },[isReady,getSoundMuted,playWithSound,syncSoundIntent])
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
function SpotlightContent({initialClip,initialError=false,onSound}:{initialClip:ForYouClip|null;initialError?:boolean;onSound:SoundReporter}){
 const [clip,setClip]=useState(initialClip),[error,setError]=useState(initialError),[busy,setBusy]=useState(false)
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
export default function HomeForYouSpotlight({initialClip=null,initialError=false}:{initialClip?:ForYouClip|null;initialError?:boolean}){
 const [sound,setSound]=useState<SoundControl|null>(null)
 const [near,setNear]=useState(false)
 const section=useRef<HTMLDivElement|null>(null)
 const router=useRouter()
 const {user,loading}=useAuth()
 useEffect(()=>{
  const element=section.current
  if(!element||near)return
  if(typeof IntersectionObserver==='undefined'){queueMicrotask(()=>setNear(true));return}
  const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setNear(true);observer.disconnect()}},{rootMargin:'0px'})
  observer.observe(element)
  return()=>observer.disconnect()
 },[near])
 return <Paper ref={section} component="section" aria-labelledby="home-for-you-title" data-home-spotlight variant="outlined" sx={{my:{xs:2.5,md:3.25},p:{xs:2,md:3},borderRadius:'14px',borderColor:'color-mix(in srgb, var(--awm-gold) 25%, transparent)',bgcolor:'var(--awm-white)'}}>
  <Box data-spotlight-header sx={{display:{xs:'flex',md:'grid'},flexDirection:'row',flexWrap:'nowrap',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:{xs:1,md:0},mb:2}}>
   <Typography component="h2" id="home-for-you-title" sx={{gridColumn:2,textAlign:{xs:'left',md:'center'},fontFamily:'var(--font-heading)',fontSize:{xs:16,sm:22,md:28},minWidth:0,lineHeight:1.15,fontWeight:600}}>For You Spotlight</Typography>
   <Box sx={{gridColumn:3,justifySelf:'start',ml:{xs:'auto',md:2},display:'flex',alignItems:'center',gap:.75,flexShrink:0}}>
   <Button type="button" variant="contained" onClick={()=>router.push("/explore?view=foryou")} size="small" sx={{px:{xs:1,md:2},'@media (max-width:899.95px)':{minWidth:0,fontSize:12},textTransform:'none',bgcolor:'#046154',color:'#fff','&:hover':{bgcolor:'#034c42'}}}>Watch More<Box component="span" aria-hidden sx={{display:{xs:'inline',md:'none'},ml:.5}}>→</Box></Button>
   <IconButton data-spotlight-sound aria-label={sound?.muted?'Unmute For You Spotlight':'Mute For You Spotlight'} disabled={!sound?.ready} onClick={()=>sound?.toggle()} sx={{width:32,height:32,borderRadius:'50%',border:'1px solid var(--awm-gold)',color:'var(--awm-bark)',bgcolor:'var(--awm-cream-light)','&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2},'& svg':{fontSize:18}}}>{sound?.muted?<VolumeOff/>:<VolumeUp/>}</IconButton>
   </Box>
  </Box>
  {loading?<Box role="status" sx={{py:2,textAlign:'center'}}>Loading a preview\u2026</Box>:initialClip&&!near?<Box data-spotlight-deferred sx={{width:{xs:'100%',sm:'65%',md:'50%'},mx:'auto',aspectRatio:'16 / 9',borderRadius:'10px',overflow:'hidden',bgcolor:'#000'}}><Box component="img" src={`https://i.ytimg.com/vi/${initialClip.video.youtube_id}/hqdefault.jpg`} alt="For You video preview" loading="lazy" decoding="async" sx={{display:'block',width:'100%',height:'100%',objectFit:'cover'}}/></Box>:user?<SpotlightContent initialClip={initialClip} initialError={initialError} onSound={setSound}/>:<GuestForYouAllowance home><SpotlightContent initialClip={initialClip} initialError={initialError} onSound={setSound}/></GuestForYouAllowance>}
 </Paper>
}
