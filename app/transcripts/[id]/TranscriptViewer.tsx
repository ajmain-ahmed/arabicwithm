'use client'
import LocalisedContent from '@/app/components/LocalisedContent'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'

import AwmPageError from '@/app/components/AwmPageError'
import {boundedRead} from '@/app/lib/readRecovery'
import EnglishForYouSegment from '@/app/explore/EnglishForYouSegment'
import {sourceLanguage} from '@/app/lib/transcriptSourceLanguage'
import {useState} from 'react'
import Link from 'next/link'
import {Alert,Box,Button,Container,Stack,Typography} from '@mui/material'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import {downloadAdminTranscriptJson,loadAdminTranscript,loadPublicTranscript,type TranscriptRow,type TranscriptSegment} from '@/app/actions/transcripts'
import {transcriptReturn,transcriptTime,type TranscriptOrigin} from '@/app/lib/transcriptNavigation'
export default function TranscriptViewer({video,initialSegments,start,origin='search'}:{video:TranscriptRow;initialSegments:TranscriptSegment[];start:number;origin?:TranscriptOrigin}){
 const {t:awmT}=useWebsiteLocale()

 const englishSource=sourceLanguage(video.source_language)==='en'
 const [downloading,setDownloading]=useState(false)
 const back=transcriptReturn(origin),loader=origin==='admin'?loadAdminTranscript:loadPublicTranscript
 const [segments,setSegments]=useState(initialSegments),[time,setTime]=useState(start),[busy,setBusy]=useState(false),[error,setError]=useState(''),[more,setMore]=useState(initialSegments.length===100)
 const [previousInitialSegments,setPreviousInitialSegments]=useState(initialSegments)
 if(previousInitialSegments!==initialSegments){setPreviousInitialSegments(initialSegments);setSegments(initialSegments);setMore(initialSegments.length===100)}
 const {wrapRef,seekTo,isReady,errorCode,retry}=useYouTubePlayer(video.youtube_id,setTime,start,{autoplay:false})
 async function loadEarlier(){setBusy(true);setError('');try{const first=segments[0]?.position??0;const data=await boundedRead(loader(video.id,Math.max(0,first-100)-1));if(!data)throw new Error('Transcript is no longer available.');setSegments(previous=>[...data.segments.filter(segment=>segment.position<first),...previous])}catch(e){console.error('[transcript read]',e);setError('Unable to load earlier transcript. Please retry.')}finally{setBusy(false)}}
 async function loadMore(){setBusy(true);setError('');try{const data=await boundedRead(loader(video.id,segments.at(-1)?.position??-1));if(!data)throw new Error('Transcript is no longer available.');setSegments(previous=>[...previous,...data.segments]);setMore(data.segments.length===100)}catch(e){console.error('[transcript read]',e);setError('Unable to load more transcript. Please retry.')}finally{setBusy(false)}}
 async function download(){setDownloading(true);setError('');try{
  const result=await downloadAdminTranscriptJson(video.id)
  const url=URL.createObjectURL(new Blob([result.json],{type:'application/json;charset=utf-8'}))
  const link=document.createElement('a');link.href=url;link.download=result.filename;document.body.appendChild(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
 }catch(e){console.error('[transcript download]',e);setError('Unable to download transcript. Please retry.')}finally{setDownloading(false)}}
 return <Container maxWidth="md" sx={{py:4}}><Stack spacing={2}><Button component={Link} href={back.href} sx={{alignSelf:'flex-start'}}><UiText>{back.label}</UiText></Button><Typography component="h1" variant="h4"><LocalisedContent original={video.title} arabic={video.titleAr}/></Typography>{origin==='admin'&&<Button disabled={downloading} onClick={()=>void download()} sx={{alignSelf:'flex-start'}}>{downloading?awmT("Downloading..."):awmT("Download JSON")}</Button>}<Typography>{video.channel}</Typography>
 <Box ref={wrapRef} sx={{width:'100%',aspectRatio:'16/9'}}/>{errorCode&&<Alert severity="warning" action={<Button onClick={retry}><UiText>{"Retry"}</UiText></Button>}><UiText>{"Unable to load YouTube playback."}</UiText></Alert>}
 <Typography variant="body2">{awmT(englishSource?'Arabic translation:':'English translation:')}{' '}{awmT(video.translation_status)}</Typography>
 {(segments[0]?.position??0)>0&&<Button disabled={busy} onClick={()=>void loadEarlier()}><UiText>{"Load earlier transcript"}</UiText></Button>}
 {segments.map(segment=>{const startMs=segment.start_ms??Math.round(segment.start_seconds*1000),endMs=segment.end_seconds===null?null:segment.end_ms??Math.round(segment.end_seconds*1000);return <Box key={segment.id} sx={{p:2,borderRadius:2,bgcolor:Math.round(time*1000)>=startMs&&(endMs===null?segment.position===segments.filter(s=>s.start_seconds<=time).at(-1)?.position:Math.round(time*1000)<endMs)?'var(--awm-cream)':'transparent'}}>
 <Button disabled={!isReady} onClick={()=>seekTo(startMs/1000)}>{transcriptTime(startMs)}</Button>{englishSource?<EnglishForYouSegment line={{tokens:segment.tokens??[],translation:segment.translation}} settings={{meanings:true,sentence:true}} time={time}/>:<><Typography dir="rtl" sx={{fontSize:'1.5rem',whiteSpace:'pre-wrap'}}>{segment.original_text}</Typography>{segment.english_text&&<Typography lang="en" dir="ltr" sx={{whiteSpace:'pre-wrap'}}>{segment.english_text}</Typography>}</>}
 </Box>})}{error&&<AwmPageError/>}{more&&<Button disabled={busy} onClick={()=>void loadMore()}>{busy?awmT("Loading..."):awmT("Load more transcript")}</Button>}
 </Stack></Container>
}
