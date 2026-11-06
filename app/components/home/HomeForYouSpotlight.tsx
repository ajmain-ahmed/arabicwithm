'use client'

import {useEffect,useRef,useState,useSyncExternalStore} from 'react'
import Link from 'next/link'
import {Box,Button,Paper,Typography} from '@mui/material'
import {fetchHomeForYouSpotlight} from '@/app/actions/forYou'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import {segmentAtTime,type ForYouClip} from '@/app/lib/forYou'
import {getExploreSoundPreference,setExploreSoundPreference,subscribeToExploreSoundPreference} from '@/app/lib/explore'

const FOR_YOU_HREF='/explore?view=foryou'

function SpotlightPlayer({clip}:{clip:ForYouClip}){
 const sound=useSyncExternalStore(subscribeToExploreSoundPreference,getExploreSoundPreference,()=>true)
 const [time,setTime]=useState(clip.clip_start_ms/1000),[ended,setEnded]=useState(false)
 const stop=useRef<()=>void>(()=>{})
 const finished=useRef(false)
 const {wrapRef,pauseVideo,mute,isReady,isPlaying,isMuted,errorCode,seekTo,playVideo,getSoundMuted,playWithSound}=useYouTubePlayer(clip.video.youtube_id,seconds=>{
  setTime(seconds)
  if(seconds>=clip.clip_end_ms/1000&&!finished.current){finished.current=true;setEnded(true);stop.current()}
  else if(seconds<clip.clip_end_ms/1000&&finished.current){finished.current=false;setEnded(false)}
 },clip.clip_start_ms/1000,{requireTimeUpdates:true,autoplay:true,muted:!sound,audibleAutoplay:true,mutedAutoplayFallback:true,verifySoundState:true,endAt:clip.clip_end_ms/1000,onEnded:()=>{if(!finished.current){finished.current=true;setEnded(true);stop.current()}}})
 useEffect(()=>{stop.current=pauseVideo},[pauseVideo])
 useEffect(()=>{if(!sound)mute()},[sound,mute])
 const line=segmentAtTime(clip.segments,time)
 return <Box data-spotlight-video={clip.video.youtube_id}>
  <Box sx={{aspectRatio:'16 / 9',position:'relative',bgcolor:'#000',borderRadius:'10px',overflow:'hidden','& iframe':{width:'100%',height:'100%'}}}>
   <Box ref={wrapRef} sx={{position:'absolute',inset:0}}/>
   {/* The intentional picture link leaves the centre play button, top chrome
       and bottom controls/timeline to the iframe. Never wrap the player in a link. */}
   <Box component={Link} href={FOR_YOU_HREF} prefetch={false} aria-label="Open For You from video preview" data-spotlight-video-link sx={{position:'absolute',left:8,top:'22%',bottom:'45%',width:'24%',maxWidth:140,zIndex:2,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'8px',textDecoration:'none',color:'#fff',cursor:'pointer',background:'linear-gradient(90deg, #0005, transparent)','&:hover':{background:'#0006'},'&:focus-visible':{outline:'2px solid var(--awm-gold-light)',outlineOffset:-2}}}>
    <Typography component="span" sx={{color:'inherit',fontSize:{xs:11,md:13},fontWeight:700,lineHeight:1.4,p:.5,borderRadius:1,bgcolor:'#0009',textAlign:'center'}}>For You ↗</Typography>
   </Box>
  </Box>
  <Box role="group" aria-label="Spotlight playback" sx={{display:'flex',gap:1,flexWrap:'wrap',py:1}}>
   <Button disabled={!isReady} onClick={()=>{if(ended){setEnded(false);seekTo(clip.clip_start_ms/1000)}else if(isPlaying)pauseVideo();else playVideo()}}>{ended?'Replay':isPlaying?'Pause':'Play'}</Button>
   <Button disabled={!isReady} onClick={()=>{const muted=getSoundMuted();setExploreSoundPreference(muted);if(muted)playWithSound();else mute()}}>{isMuted?'Unmute':'Mute'}</Button>
  </Box>
  <Box data-spotlight-subtitle aria-label="Current subtitle" sx={{minHeight:72,px:2,py:1.25,borderRadius:'10px',bgcolor:'var(--awm-cream-light)',border:'1px solid color-mix(in srgb, var(--awm-gold) 20%, transparent)',overflowWrap:'anywhere'}}>
   <Typography lang="ar" dir="rtl" sx={{fontFamily:'var(--font-serif)',fontSize:{xs:22,md:26},lineHeight:1.6}}>{line?.original_text??'\u00a0'}</Typography>
   {line?.english_text&&<Typography lang="en" sx={{fontSize:13,color:'var(--awm-muted)',mt:.5}}>{line.english_text}</Typography>}
  </Box>
  {errorCode&&<Typography role="status" sx={{mt:1}}>This preview is unavailable. Open For You to discover more.</Typography>}
 </Box>
}

export default function HomeForYouSpotlight(){
 const [clip,setClip]=useState<ForYouClip|null>(),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;fetchHomeForYouSpotlight().then(result=>{if(active){setClip(result);setError(false)}}).catch(()=>{if(active){setError(true);setClip(null)}});return()=>{active=false}},[retry])
 return <Paper component="section" aria-labelledby="home-for-you-title" data-home-spotlight variant="outlined" sx={{my:{xs:2.5,md:3.25},p:{xs:2,md:3},borderRadius:'14px',borderColor:'color-mix(in srgb, var(--awm-gold) 25%, transparent)',bgcolor:'var(--awm-white)'}}>
  <Typography component="h2" id="home-for-you-title" sx={{fontFamily:'var(--font-heading)',fontSize:{xs:22,md:28},fontWeight:600,mb:2}}>For You Spotlight</Typography>
  <Box sx={{display:'grid',gridTemplateColumns:{xs:'minmax(0,1fr)',md:'minmax(0,3fr) minmax(0,2fr)'},gap:{xs:2,md:4},alignItems:'center'}}>
   <Box sx={{minWidth:0}}>{clip?<SpotlightPlayer clip={clip}/>:<Box role="status" sx={{py:4,textAlign:'center'}}>{clip===undefined?'Loading a preview…':error?'The preview couldn’t load.':'No previews available yet.'}{error&&<Button onClick={()=>{setClip(undefined);setRetry(value=>value+1)}}>Retry preview</Button>}</Box>}</Box>
   <Box><Typography sx={{fontFamily:'var(--font-heading)',fontSize:24,mb:1}}>A little Arabic, every day</Typography><Typography sx={{color:'var(--awm-muted)',mb:2}}>Discover short clips with Arabic subtitles.</Typography><Button component={Link} href={FOR_YOU_HREF} variant="contained" sx={{textTransform:'none',minHeight:44}}>Go to For You</Button></Box>
  </Box>
 </Paper>
}
