'use client'
import {useRef,useState} from 'react'
import Link from 'next/link'
import {Alert,Box,Button,Card,CardContent,Container,Stack,TextField,Typography} from '@mui/material'
import {searchTranscriptWord,type TranscriptHit} from '@/app/actions/transcripts'
import {transcriptResultHref} from '@/app/lib/manualTranscripts'
import {transcriptTime} from '@/app/lib/transcriptNavigation'
function Highlight({text,surfaces}:{text:string;surfaces:string[]}){
 const parts=surfaces.filter(Boolean).sort((a,b)=>b.length-a.length)
 if(!parts.length)return <>{text}</>
 const regex=new RegExp(`(${parts.map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})`,'g')
 return <>{text.split(regex).map((part,index)=>parts.includes(part)?<mark key={index}>{part}</mark>:part)}</>
}
export default function TranscriptSearch(){
 const [word,setWord]=useState(''),[query,setQuery]=useState(''),[hits,setHits]=useState<TranscriptHit[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(false),[more,setMore]=useState(false)
 const revision=useRef(0)
 async function search(append=false){const current=++revision.current;const value=append?query:word.trim();setBusy(true);setError('');try{const last=append?hits.at(-1):undefined;const result=await searchTranscriptWord(value,last?.segment_id??0,last?.match_rank??0);if(current===revision.current){setHits(previous=>append?[...previous,...result]:result);setQuery(value);setMore(result.length===20);setSearched(true)}}catch(e){if(current===revision.current)setError(e instanceof Error?e.message:'Search failed.')}finally{if(current===revision.current)setBusy(false)}}
 return <Container maxWidth="md" sx={{py:4}}><Stack spacing={2}><Button component={Link} href="/explore" sx={{alignSelf:'flex-start'}}>Back to Explore</Button><Typography variant="h4">Search transcripts</Typography>
 <Box component="form" onSubmit={event=>{event.preventDefault();void search()}}><Stack direction="row" spacing={1}><TextField label="Search transcript text" value={word} onChange={e=>setWord(e.target.value)} fullWidth/><Button type="submit" variant="contained" disabled={busy||!word.trim()}>Search</Button></Stack></Box>
 {busy&&<Typography role="status">Searching...</Typography>}{error&&<Alert severity="error">{error}</Alert>}{searched&&!busy&&!error&&!hits.length&&<Typography>No matching occurrences.</Typography>}
 {hits.map(hit=><Card variant="outlined" key={hit.segment_id}><CardContent><Stack direction="row" spacing={2}><Box component="img" src={hit.thumbnail} alt="" sx={{width:100,height:60,objectFit:'cover'}}/><Box><Typography variant="h6">{hit.title}</Typography><Typography variant="caption">{hit.channel} | {hit.match_type} | {transcriptTime(Math.round(hit.start_seconds*1000))}</Typography></Box></Stack>
 {hit.previous_text&&<Typography dir="rtl" color="text.secondary">{hit.previous_text}</Typography>}<Typography dir="rtl" sx={{fontSize:'1.5rem'}}><Highlight text={hit.original_text} surfaces={hit.matched_surfaces}/></Typography>{hit.english_text&&<Typography>{hit.english_text}</Typography>}{hit.next_text&&<Typography dir="rtl" color="text.secondary">{hit.next_text}</Typography>}
 <Button component={Link} href={transcriptResultHref(hit.transcript_id,hit.start_seconds)}>Open at this moment</Button></CardContent></Card>)}
 {more&&<Button disabled={busy} onClick={()=>void search(true)}>Load more occurrences</Button>}
 </Stack></Container>
}
