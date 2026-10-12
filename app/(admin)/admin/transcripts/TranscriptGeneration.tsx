'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {Alert,Button,Card,CardContent,Checkbox,FormControlLabel,Stack,TextField,Typography} from '@mui/material'
import {generateAdminTranscript,loadAdminGeneration,saveAdminGeneratedTranscript,type TranscriptRow} from '@/app/actions/transcripts'
import TranscriptJsonField from '@/app/(admin)/admin/components/TranscriptJsonField'
import {transcriptGenerationError} from '@/app/lib/transcriptStatus'

export default function TranscriptGeneration(){
 const [input,setInput]=useState(''),[id,setId]=useState(''),[video,setVideo]=useState<TranscriptRow|null>(null),[json,setJson]=useState(''),[title,setTitle]=useState(''),[publish,setPublish]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[run,setRun]=useState(0)
 const request=useRef(0),saving=useRef(false)
 useEffect(()=>{
  if(!id)return
  let active=true,timer:ReturnType<typeof setTimeout>|undefined
  async function poll(){try{const result=await loadAdminGeneration(id);if(!active)return;setVideo(result.video);if(result.video.error_code)setError(transcriptGenerationError(result.video.error_code));if(result.json!==null){setJson(result.json);setTitle(result.video.title);setPublish(result.video.searchable);setMessage('JSON ready to review. Saving applies your edits and publication choice.')}else if(result.video.error_code){setError(transcriptGenerationError(result.video.error_code))}if(result.json===null&&result.video.status!=='failed')timer=setTimeout(()=>void poll(),5000)}catch(error){if(active)setError(error instanceof Error?error.message:'Unable to load generation status.')}}
  void poll();return()=>{active=false;clearTimeout(timer)}
 },[id,run])
 async function generate(){const current=++request.current;setBusy(true);setError('');setMessage('');try{const result=await generateAdminTranscript(input);if(current!==request.current)return;if(!result.ok){setError(result.error);return}setJson('');setVideo(null);setId(result.id);setRun(value=>value+1);setMessage(result.duplicate?'Reusing this video’s saved transcript. No new provider request was submitted.':'Generation queued. The draft stays unpublished until you review and save it.')}catch{setError('Unable to contact transcript generation. Please retry.')}finally{setBusy(false)}}
 async function save(){if(!video||saving.current)return;saving.current=true;setBusy(true);setError('');try{const result=await saveAdminGeneratedTranscript(video.id,{json,title,searchable:publish,updatedAt:video.updated_at});if(!result.ok){setError(result.error);return}setVideo({...video,updated_at:result.updatedAt,searchable:publish});setJson(result.json);setMessage('Generated transcript saved.')}catch{setError('Unable to save generated transcript. Your edits are still here.')}finally{saving.current=false;setBusy(false)}}
 function download(){const href=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=href;anchor.download='generated-transcript.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(href),1000)}
 return <Card variant="outlined"><CardContent><Stack spacing={2}>
  <Typography component="h2" variant="h6">Generate Transcript</Typography>
  <Stack direction={{xs:'column',sm:'row'}} spacing={1}><TextField fullWidth label="Generate from YouTube URL or video ID" value={input} onChange={event=>setInput(event.target.value)} disabled={busy}/><Button variant="contained" disabled={busy||!input.trim()} onClick={()=>void generate()}>Generate Transcript</Button></Stack>
  {error&&<Alert severity="error">{error}</Alert>}{message&&<Alert severity="info">{message}</Alert>}
  {id&&!json&&<Typography role="status">{video?.status==='failed'?'Generation failed.':`Generation status: ${video?.status??'loading'}`}</Typography>}
  {json&&video&&<><TextField label="Generated video title" value={title} onChange={event=>setTitle(event.target.value)} disabled={busy} slotProps={{htmlInput:{dir:'auto'}}}/><TranscriptJsonField value={json} onChange={setJson}/><FormControlLabel control={<Checkbox checked={publish} onChange={event=>setPublish(event.target.checked)} disabled={busy}/>} label="Publish reviewed transcript to the shared library"/><Stack direction="row" spacing={1}><Button variant="contained" disabled={busy||!title.trim()} onClick={()=>void save()}>Save reviewed JSON</Button><Button onClick={download}>Download generated JSON</Button><Button component={Link} href={`/transcripts/${video.id}?from=admin`}>View transcript</Button><Button disabled={busy} onClick={()=>{setId('');setJson('');setVideo(null)}}>Close review</Button></Stack></>}
 </Stack></CardContent></Card>
}
