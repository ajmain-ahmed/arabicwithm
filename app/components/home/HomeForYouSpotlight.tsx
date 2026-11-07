'use client'

import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {Box,Button,Paper,Typography} from '@mui/material'
import {useAuth} from '@/app/AuthContext'
import {fetchHomeForYouSpotlight} from '@/app/actions/forYou'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import {segmentAtTime,type ForYouClip} from '@/app/lib/forYou'
import GuestForYouAllowance from '@/app/explore/GuestForYouAllowance'
import {useForYouMeter} from '@/app/explore/ForYouMeterContext'
import SpotlightPlayerFrame from './SpotlightPlayerFrame'

function SpotlightPlayer({clip}:{clip:ForYouClip}){
 const [time,setTime]=useState(clip.clip_start_ms/1000)
 const sample=useForYouMeter()
 const {wrapRef,isReady,isPlaying,playbackRate,pauseVideo,errorCode,retry}=useYouTubePlayer(clip.video.youtube_id,updateTime,clip.clip_start_ms/1000,{requireTimeUpdates:true,replayClipOnNativePlay:true,autoplay:true,muted:true,mutedAutoplayFallback:true,endAt:clip.clip_end_ms/1000})
 function updateTime(seconds:number){setTime(seconds);sample?.({time:seconds,playing:isReady&&isPlaying,rate:playbackRate,pause:pauseVideo})}
 const line=segmentAtTime(clip.segments,time)
 return <>
  <SpotlightPlayerFrame videoId={clip.video.youtube_id} subtitle={<>
   <Typography lang="ar" dir="rtl" sx={{fontFamily:'var(--font-serif)',fontSize:{xs:22,md:26},lineHeight:1.6,textAlign:'center'}}>{line?.original_text??'\u00a0'}</Typography>
   {line?.english_text&&<Typography lang="en" sx={{fontSize:13,color:'var(--awm-muted)',mt:.5,textAlign:'center'}}>{line.english_text}</Typography>}
  </>}><Box ref={wrapRef} sx={{position:'absolute',inset:0}}/></SpotlightPlayerFrame>
  {errorCode&&<Box role="alert" sx={{mt:2,textAlign:'center'}}><Typography>The YouTube preview could not load (error {errorCode}).</Typography><Button onClick={retry}>Retry player</Button></Box>}
 </>
}
function SpotlightContent(){
 const [clip,setClip]=useState<ForYouClip|null>(),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;fetchHomeForYouSpotlight().then(result=>{if(active){setClip(result);setError(false)}}).catch(()=>{if(active){setError(true);setClip(null)}});return()=>{active=false}},[retry])
 return clip?<SpotlightPlayer clip={clip}/>:<Box role="status" sx={{py:4,textAlign:'center'}}>{clip===undefined?'Loading a preview\u2026':error?'The preview could not load.':'No eligible Arabic previews are available yet.'}{error&&<Button onClick={()=>{setClip(undefined);setRetry(value=>value+1)}}>Retry preview</Button>}</Box>
}
export default function HomeForYouSpotlight(){
 const router=useRouter()
 const {user,loading}=useAuth()
 return <Paper component="section" aria-labelledby="home-for-you-title" data-home-spotlight variant="outlined" sx={{my:{xs:2.5,md:3.25},p:{xs:2,md:3},borderRadius:'14px',borderColor:'color-mix(in srgb, var(--awm-gold) 25%, transparent)',bgcolor:'var(--awm-white)'}}>
  <Box data-spotlight-header sx={{display:{xs:'flex',sm:'grid'},flexDirection:'column',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:{xs:.75,sm:0},mb:2}}>
   <Typography component="h2" id="home-for-you-title" sx={{gridColumn:2,textAlign:'center',fontFamily:'var(--font-heading)',fontSize:{xs:22,md:28},fontWeight:600}}>For You Spotlight</Typography>
   <Button type="button" variant="contained" onClick={()=>router.push("/explore?view=foryou")} size="small" sx={{gridColumn:3,justifySelf:'start',ml:{sm:2},px:2,textTransform:'none',bgcolor:'#046154',color:'#fff','&:hover':{bgcolor:'#034c42'}}}>Watch More</Button>
  </Box>
  {loading?<Box role="status" sx={{py:4,textAlign:'center'}}>Loading a preview\u2026</Box>:user?<SpotlightContent/>:<GuestForYouAllowance home><SpotlightContent/></GuestForYouAllowance>}
 </Paper>
}
