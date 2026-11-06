'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {Box,Button,Paper,Typography} from '@mui/material'
import {useAuth} from '@/app/AuthContext'
import {fetchHomeForYouSpotlight} from '@/app/actions/forYou'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import {segmentAtTime,type ForYouClip} from '@/app/lib/forYou'
import GuestForYouAllowance from '@/app/explore/GuestForYouAllowance'
import {useForYouMeter} from '@/app/explore/ForYouMeterContext'

function SpotlightPlayer({clip}:{clip:ForYouClip}){
 const [time,setTime]=useState(clip.clip_start_ms/1000)
 const sample=useForYouMeter()
 const {wrapRef,isReady,isPlaying,playbackRate,pauseVideo,errorCode,retry}=useYouTubePlayer(clip.video.youtube_id,updateTime,clip.clip_start_ms/1000,{requireTimeUpdates:true,replayClipOnNativePlay:true,autoplay:true,muted:true,mutedAutoplayFallback:true,endAt:clip.clip_end_ms/1000})
 function updateTime(seconds:number){setTime(seconds);sample?.({time:seconds,playing:isReady&&isPlaying,rate:playbackRate,pause:pauseVideo})}
 const line=segmentAtTime(clip.segments,time)
 return <>
  <Box data-spotlight-video={clip.video.youtube_id} sx={{width:{xs:'100%',md:'60%'},mx:'auto',aspectRatio:'16 / 9',position:'relative',bgcolor:'#000',borderRadius:'10px',overflow:'hidden','& iframe':{width:'100%',height:'100%'}}}><Box ref={wrapRef} sx={{position:'absolute',inset:0}}/></Box>
  <Box data-spotlight-subtitle aria-label="Current subtitle" sx={{width:{xs:'100%',md:'82%'},boxSizing:'border-box',mx:'auto',mt:2,minHeight:80,px:2,py:1.25,borderRadius:'10px',bgcolor:'var(--awm-cream-light)',border:'1px solid color-mix(in srgb, var(--awm-gold) 20%, transparent)',overflowWrap:'anywhere'}}>
   <Typography lang="ar" dir="rtl" sx={{fontFamily:'var(--font-serif)',fontSize:{xs:22,md:26},lineHeight:1.6}}>{line?.original_text??'\u00a0'}</Typography>
   {line?.english_text&&<Typography lang="en" sx={{fontSize:13,color:'var(--awm-muted)',mt:.5}}>{line.english_text}</Typography>}
  </Box>
  {errorCode&&<Box role="alert" sx={{mt:2,textAlign:'center'}}><Typography>The YouTube preview could not load (error {errorCode}).</Typography><Button onClick={retry}>Retry player</Button></Box>}
 </>
}
function SpotlightContent(){
 const [clip,setClip]=useState<ForYouClip|null>(),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;fetchHomeForYouSpotlight().then(result=>{if(active){setClip(result);setError(false)}}).catch(()=>{if(active){setError(true);setClip(null)}});return()=>{active=false}},[retry])
 return clip?<SpotlightPlayer clip={clip}/>:<Box role="status" sx={{py:4,textAlign:'center'}}>{clip===undefined?'Loading a preview\u2026':error?'The preview could not load.':'No eligible Arabic previews are available yet.'}{error&&<Button onClick={()=>{setClip(undefined);setRetry(value=>value+1)}}>Retry preview</Button>}</Box>
}
export default function HomeForYouSpotlight(){
 const {user,loading}=useAuth()
 return <Paper component="section" aria-labelledby="home-for-you-title" data-home-spotlight variant="outlined" sx={{my:{xs:2.5,md:3.25},p:{xs:2,md:3},borderRadius:'14px',borderColor:'color-mix(in srgb, var(--awm-gold) 25%, transparent)',bgcolor:'var(--awm-white)'}}>
  <Box sx={{display:'flex',alignItems:'center',gap:2,flexWrap:'wrap',mb:2}}><Typography component="h2" id="home-for-you-title" sx={{fontFamily:'var(--font-heading)',fontSize:{xs:22,md:28},fontWeight:600}}>For You Spotlight</Typography><Button component={Link} href="/explore?view=foryou" size="small" sx={{textTransform:'none'}}>Go to For You →</Button></Box>
  {loading?<Box role="status" sx={{py:4,textAlign:'center'}}>Loading a preview\u2026</Box>:user?<SpotlightContent/>:<GuestForYouAllowance home><SpotlightContent/></GuestForYouAllowance>}
 </Paper>
}
