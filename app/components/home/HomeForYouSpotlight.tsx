'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Button, IconButton, Paper, Typography } from '@mui/material'
import { VolumeOff, VolumeUp } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import type { ForYouClip } from '@/app/lib/forYou'
import type { SoundControl } from './SpotlightContent'

// Player, transcript analysis and metering are loaded only near the section.
const SpotlightContent = dynamic(() => import('./SpotlightContent'), { ssr: false, loading: () => <Box role="status"><UiText>{"Loading a preview..."}</UiText></Box> })

export default function HomeForYouSpotlight({initialClip=null,initialError=false,discover=false}:{initialClip?:ForYouClip|null;initialError?:boolean;discover?:boolean}){
 const {t:awmT}=useWebsiteLocale()

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
   <Typography component="h2" id="home-for-you-title" sx={{gridColumn:2,textAlign:{xs:'left',md:'center'},fontFamily:'var(--font-heading)',fontSize:{xs:16,sm:22,md:28},minWidth:0,lineHeight:1.15,fontWeight:600}}><UiText>{"For You Spotlight"}</UiText></Typography>
   <Box sx={{gridColumn:3,justifySelf:'start',ml:{xs:'auto',md:2},display:'flex',alignItems:'center',gap:.75,flexShrink:0}}>
   <Button type="button" variant="contained" onClick={()=>router.push("/explore?view=foryou")} size="small" sx={{px:{xs:1,md:2},'@media (max-width:899.95px)':{minWidth:0,fontSize:12},textTransform:'none',bgcolor:'#046154',color:'#fff','&:hover':{bgcolor:'#034c42'}}}><UiText>{"Watch More"}</UiText><Box component="span" aria-hidden sx={{display:{xs:'inline',md:'none'},ml:.5}}>→</Box></Button>
   <IconButton data-spotlight-sound aria-label={sound?.muted?awmT("Unmute For You Spotlight"):awmT("Mute For You Spotlight")} disabled={!sound?.ready} onClick={()=>sound?.toggle()} sx={{width:32,height:32,borderRadius:'50%',border:'1px solid var(--awm-gold)',color:'var(--awm-bark)',bgcolor:'var(--awm-cream-light)','&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2},'& svg':{fontSize:18}}}>{sound?.muted?<VolumeOff/>:<VolumeUp/>}</IconButton>
   </Box>
  </Box>
  {!near ? <Box data-spotlight-deferred sx={{width:{xs:'100%',sm:'65%',md:'50%'},mx:'auto',aspectRatio:'16 / 9',borderRadius:'10px',overflow:'hidden',bgcolor:'#000'}}>{initialClip && <Box component="img" src={`https://i.ytimg.com/vi/${initialClip.video.youtube_id}/hqdefault.jpg`} alt={awmT("For You video preview")} loading="lazy" decoding="async" sx={{display:'block',width:'100%',height:'100%',objectFit:'cover'}}/>}</Box> : loading ? <Box role="status" sx={{py:2,textAlign:'center'}}><UiText>{"Loading a preview..."}</UiText></Box> : <SpotlightContent guest={!user} initialClip={initialClip} initialError={initialError} discover={discover} onSound={setSound}/>}

 </Paper>
}
