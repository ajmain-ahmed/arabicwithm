'use client'

import { useState } from 'react'
import { Alert,Box,Button,Stack,Typography } from '@mui/material'
import { fetchForYouClips } from '@/app/actions/forYou'
import type { ForYouClip,ForYouToken } from '@/app/lib/forYou'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'

export function ForYouWords({tokens}:{tokens:ForYouToken[]}) {
 return <Box dir="rtl" sx={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:2,py:1}}>
  {tokens.map((token,index)=><Box key={index} component="span" sx={{display:'inline-flex',flexDirection:'column',alignItems:'center',maxWidth:'100%'}}>
   <Typography component="span" lang="ar" sx={{fontFamily:'var(--font-serif)',fontSize:'1.8rem'}}>{token.arabic}</Typography>
   {token.english&&<Typography component="span" lang="en" dir="ltr" sx={{fontFamily:'var(--font-sans)',fontSize:'.9rem',color:'text.secondary',whiteSpace:'normal',overflowWrap:'anywhere',textAlign:'center'}}>{token.english}</Typography>}
  </Box>)}
 </Box>
}

function ClipPlayer({clip}:{clip:ForYouClip}) {
 const [time,setTime]=useState(clip.clip_start_ms/1000)
 const {wrapRef,errorCode,retry}=useYouTubePlayer(clip.video.youtube_id,setTime,clip.clip_start_ms/1000,{endAt:clip.clip_end_ms/1000})
 const active=clip.segments.find(s=>s.start_seconds<=time&&s.end_seconds>time)??clip.segments[0]
 return <Stack spacing={2}>
  <Typography variant="h5" dir="auto">{clip.video.title}</Typography>
  <Box ref={wrapRef} sx={{aspectRatio:'16/9',width:'100%',bgcolor:'black',borderRadius:'10px',overflow:'hidden'}}/>
  {errorCode&&<Alert severity="warning">The video could not be loaded. <Button onClick={retry}>Retry</Button></Alert>}
  {active&&<Box sx={{textAlign:'center'}}>
   {active.tokens.length?<ForYouWords tokens={active.tokens}/>:<Typography lang="ar" dir="rtl" sx={{fontSize:'1.8rem'}}>{active.original_text}</Typography>}
   {active.english_text&&<Typography lang="en" dir="ltr">{active.english_text}</Typography>}
  </Box>}
 </Stack>
}

export default function ForYouFeed({initialClips}:{initialClips:ForYouClip[]}) {
 const [clips,setClips]=useState(initialClips),[index,setIndex]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const [excluded,setExcluded]=useState<number[]>([])
 async function next(){
  if(busy)return
  setBusy(true);setError('')
  const seen=[...excluded,...(clips[index]?.segments.map(s=>s.id)??[])]
  try{
   // Requery on every navigation; do not retain prefetched unpublished clips.
   const batch=await fetchForYouClips(crypto.randomUUID(),seen.slice(-10000),clips.slice(0,index+1).map(c=>c.video.id).slice(-100))
   setExcluded(seen.slice(-10000));setClips(batch);setIndex(0)
  }catch(e){setError(e instanceof Error?e.message:'Unable to load clips.')}finally{setBusy(false)}
 }
 return <Box sx={{maxWidth:800,mx:'auto',px:{xs:2,sm:3},py:3}}>
  {error&&<Alert severity="error">{error}</Alert>}
  {clips[index]?<ClipPlayer key={`${clips[index].video.id}:${clips[index].clip_start_ms}`} clip={clips[index]}/>:<Typography>No more clips available.</Typography>}
  <Button variant="contained" disabled={busy} onClick={()=>void next()} sx={{mt:2}}>{busy?'Loading…':clips.length?'Next clip':'Reload clips'}</Button>
 </Box>
}
