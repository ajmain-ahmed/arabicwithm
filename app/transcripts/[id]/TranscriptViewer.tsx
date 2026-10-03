'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {Alert,Box,Button,Container,Stack,Typography} from '@mui/material'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import {loadPublicTranscript,type TranscriptRow,type TranscriptSegment} from '@/app/actions/transcripts'
export default function TranscriptViewer({video,initialSegments,start}:{video:TranscriptRow;initialSegments:TranscriptSegment[];start:number}){
 const [segments,setSegments]=useState(initialSegments),[time,setTime]=useState(start),[busy,setBusy]=useState(false),[error,setError]=useState(''),[more,setMore]=useState(initialSegments.length===100)
 const {wrapRef,seekTo,isReady,errorCode,retry}=useYouTubePlayer(video.youtube_id,setTime,start,{autoplay:false})
 useEffect(()=>{setSegments(initialSegments);setMore(initialSegments.length===100)},[initialSegments])
 async function loadEarlier(){setBusy(true);setError('');try{const first=segments[0]?.position??0;const data=await loadPublicTranscript(video.id,Math.max(0,first-100)-1);if(!data)throw new Error('Transcript is no longer published.');setSegments(previous=>[...data.segments.filter(segment=>segment.position<first),...previous])}catch(e){setError(e instanceof Error?e.message:'Unable to load earlier segments.')}finally{setBusy(false)}}
 async function loadMore(){setBusy(true);setError('');try{const data=await loadPublicTranscript(video.id,segments.at(-1)?.position??-1);if(!data)throw new Error('Transcript is no longer published.');setSegments(previous=>[...previous,...data.segments]);setMore(data.segments.length===100)}catch(e){setError(e instanceof Error?e.message:'Unable to load more segments.')}finally{setBusy(false)}}
 return <Container maxWidth="md" sx={{py:4}}><Stack spacing={2}><Button component={Link} href="/explore/search" sx={{alignSelf:'flex-start'}}>Back to transcript search</Button><Typography variant="h4">{video.title}</Typography><Typography>{video.channel}</Typography>
 <Box ref={wrapRef} sx={{width:'100%',aspectRatio:'16/9'}}/>{errorCode&&<Alert severity="warning" action={<Button onClick={retry}>Retry</Button>}>Unable to load YouTube playback.</Alert>}
 <Typography variant="body2">English translation: {video.translation_status}</Typography>
 {(segments[0]?.position??0)>0&&<Button disabled={busy} onClick={()=>void loadEarlier()}>Load earlier transcript</Button>}
 {segments.map(segment=><Box key={segment.id} sx={{p:2,borderRadius:2,bgcolor:time>=segment.start_seconds&&time<segment.end_seconds?'var(--awm-cream)':'transparent'}}>
 <Button disabled={!isReady} onClick={()=>seekTo(segment.start_seconds)}>{segment.start_seconds.toFixed(3)} s</Button><Typography dir="rtl" sx={{fontSize:'1.5rem',whiteSpace:'pre-wrap'}}>{segment.original_text}</Typography>{segment.english_text&&<Typography sx={{whiteSpace:'pre-wrap'}}>{segment.english_text}</Typography>}
 </Box>)}{error&&<Alert severity="error">{error}</Alert>}{more&&<Button disabled={busy} onClick={()=>void loadMore()}>{busy?'Loading...':'Load more transcript'}</Button>}
 </Stack></Container>
}
