'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {Alert,Box,Button,Card,CardContent,Checkbox,Dialog,DialogActions,DialogContent,DialogTitle,FormControlLabel,Stack,TextField,Typography} from '@mui/material'
import {generateAdminTranscript,deleteAdminTranscript,importAdminManualTranscriptResult,validateAdminManualTranscript,listAdminTranscripts,downloadAdminTranscriptJson,saveAdminTranscriptJson,type TranscriptRow,type ManualTranscriptCheck} from '@/app/actions/transcripts'
import { useAdminListCache } from "@/app/(admin)/admin/components/AdminListCacheProvider"
import TranscriptJsonField from '@/app/(admin)/admin/components/TranscriptJsonField'
import {transcriptGenerationStatus,transcriptGenerationPending} from '@/app/lib/transcriptStatus'
import {parseVideoDuration} from '@/app/lib/transcriptTiming'

export default function AdminTranscripts(){
 const cache=useAdminListCache()
 const snapshot=cache.peek<{rows:TranscriptRow[];total:number}>("transcripts:0")
 const [rows,setRows]=useState<TranscriptRow[]>(snapshot?.rows??[]),[page,setPage]=useState(0),[total,setTotal]=useState(snapshot?.total??0),[loading,setLoading]=useState(!snapshot),[error,setError]=useState(''),[success,setSuccess]=useState(''),[refresh,setRefresh]=useState(0)
 const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[channel,setChannel]=useState(''),[transcriptJson,setTranscriptJson]=useState(''),[searchable,setSearchable]=useState(true),[busy,setBusy]=useState(false),[edit,setEdit]=useState<TranscriptRow|null>(null),[formError,setFormError]=useState('')
 const [editLoading,setEditLoading]=useState(false),[editVersion,setEditVersion]=useState(''),[saved,setSaved]=useState(false),[downloadBusy,setDownloadBusy]=useState(false)
 const editRequest=useRef(0),saving=useRef(false)
 const [duration,setDuration]=useState('')
 const [validation,setValidation]=useState<{url:string;json:string;duration:string;result:ManualTranscriptCheck}|null>(null)
 let durationError=''
 try {parseVideoDuration(duration)}catch(error){durationError=error instanceof Error?error.message:'Enter MM:SS or HH:MM:SS.'}
 const checked=validation?.url===url&&validation.json===transcriptJson&&validation.duration===duration?validation.result:null
 const ready=checked?.ok&&!durationError&&Boolean(title.trim())
 useEffect(()=>{
  if(!open||edit||!transcriptJson.trim()||durationError)return
  let active=true
  const timer=setTimeout(()=>{void validateAdminManualTranscript({url,json:transcriptJson,duration}).then(result=>{if(active)setValidation({url,json:transcriptJson,duration,result})}).catch(()=>{if(active)setValidation({url,json:transcriptJson,duration,result:{ok:false,error:'Unable to check the transcript. Change an input to retry.',needsDuration:false}})})},750)
  return()=>{active=false;clearTimeout(timer)}
 },[open,edit,url,transcriptJson,duration,durationError])
 const [generationUrl,setGenerationUrl]=useState(''),[generating,setGenerating]=useState(false),[deleting,setDeleting]=useState<TranscriptRow|null>(null),[deleteBusy,setDeleteBusy]=useState(false),[deleteError,setDeleteError]=useState('')
 const reload=useCallback(()=>{cache.invalidate("transcripts:");setRefresh(v=>v+1)},[cache])
 useEffect(()=>{let current=true;setLoading(!cache.peek(`transcripts:${page}`));setError('');cache.load(`transcripts:${page}`,()=>listAdminTranscripts(page)).then(result=>{if(current){setRows(result.rows);setTotal(result.total)}}).catch(e=>{if(current)setError(e.message)}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[page,refresh,cache])
 useEffect(()=>{if(!rows.some(transcriptGenerationPending))return;const timer=setInterval(()=>{if(document.visibilityState==='visible')reload()},5000);return()=>clearInterval(timer)},[rows,reload])
 async function save(){if(saving.current||busy||editLoading||edit&&!editVersion||!edit&&!ready)return;saving.current=true;setBusy(true);setFormError('');try{
  if(edit){const result=await saveAdminTranscriptJson(edit.id,{json:transcriptJson,title,channel,searchable,updatedAt:editVersion});if(!result.ok)throw new Error(result.error);setTranscriptJson(result.json);setEditVersion(result.updatedAt);setSaved(true);setSuccess('Saved');reload();return}
  else { const result=await importAdminManualTranscriptResult({url,title,json:transcriptJson,searchable,duration});if(!result.ok)throw new Error(result.error) }
  setOpen(false);setSuccess(edit?'Transcript settings saved.':'Transcript imported.');reload()
 }catch(e){setFormError(e instanceof Error?e.message:'Unable to save. Please retry.')}finally{setBusy(false);saving.current=false}}
 async function start(row:TranscriptRow|null){const request=++editRequest.current;setEditVersion('');setSaved(false);setEditLoading(Boolean(row));setEdit(row);setTitle(row?.title??'');setChannel(row?.channel??'');setSearchable(row?.searchable??true);setUrl('');setTranscriptJson('');setDuration('');setValidation(null);setFormError('');setOpen(true);if(row){try{const result=await downloadAdminTranscriptJson(row.id);if(request===editRequest.current){setTranscriptJson(result.json);setEditVersion(result.updatedAt);if(result.title!==undefined)setTitle(result.title);if(result.channel!==undefined)setChannel(result.channel??'');if(result.searchable!==undefined)setSearchable(result.searchable)}}catch(error){if(request===editRequest.current)setFormError(error instanceof Error?error.message:'Could not load transcript JSON.')}finally{if(request===editRequest.current)setEditLoading(false)}}}
 function formatJson(){try{setTranscriptJson(JSON.stringify(JSON.parse(transcriptJson),null,2));setFormError('')}catch(error){setFormError(error instanceof Error?`Invalid JSON: ${error.message}`:'Invalid JSON.')}}
 async function download(){if(!edit||downloadBusy)return;setDownloadBusy(true);setFormError('');try{const result=await downloadAdminTranscriptJson(edit.id);const href=URL.createObjectURL(new Blob([result.json],{type:'application/json;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=href;anchor.download=result.filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),1000)}catch(error){setFormError(error instanceof Error?error.message:'Could not download transcript.')}finally{setDownloadBusy(false)}}
 async function generate(){setGenerating(true);setError('');setSuccess('');try{
  const result=await generateAdminTranscript(generationUrl)
  if(!result.ok){setError(result.error);return}
  setSuccess(result.duplicate?'This YouTube video already has a transcript. No duplicate was created or existing content replaced.':'Generation queued. Arabic transcription, English translation, saving, and search publication run automatically.')
  setGenerationUrl('');setPage(0);reload()
 }catch{setError('Unable to contact transcript generation. Please retry.')}finally{setGenerating(false)}}
 async function remove(){if(!deleting)return;setDeleteBusy(true);setDeleteError('');try{
  const result=await deleteAdminTranscript(deleting.id)
  if(!result.ok){setDeleteError(result.error);return}
  setDeleting(null);setSuccess('Transcript and its owned data deleted.');setPage(0);reload()
 }catch{setDeleteError('Unable to contact transcript deletion. Please retry.')}finally{setDeleteBusy(false)}}
 return <Stack spacing={2}>
  <Stack direction="row" spacing={2} sx={{justifyContent:'space-between',flexWrap:'wrap'}}><Typography variant="h4">Transcripts</Typography><Box><Button onClick={reload} disabled={loading}>Refresh</Button><Button variant="contained" onClick={()=>start(null)}>Add Transcript</Button></Box></Stack>
  <Card variant="outlined"><CardContent><Typography component="h2" variant="h6" sx={{mb:2}}>Generate Transcript</Typography><Box component="form" onSubmit={event=>{event.preventDefault();void generate()}}><Stack direction={{xs:'column',sm:'row'}} spacing={2}><TextField label="YouTube URL" placeholder="https://youtube.com/watch?v=..." value={generationUrl} onChange={event=>setGenerationUrl(event.target.value)} disabled={generating} required fullWidth/><Button type="submit" variant="contained" disabled={generating||!generationUrl.trim()} sx={{whiteSpace:'nowrap'}}>{generating?'Preparing video...':'Generate Transcript'}</Button></Stack></Box><Typography variant="body2" sx={{mt:1}} color="text.secondary">Arabic transcription and English translation are saved and published automatically when complete.</Typography></CardContent></Card>
  {success&&<Alert severity="success" onClose={()=>setSuccess('')}>{success}</Alert>}{error&&<Alert severity="error" action={<Button onClick={reload}>Retry</Button>}>{error}</Alert>}
  {loading&&<Typography role="status">Loading transcripts...</Typography>}{!loading&&!error&&!rows.length&&<Typography>No transcripts in this page of the library.</Typography>}
  {rows.map(row=><Card variant="outlined" key={row.id}><CardContent><Stack direction={{xs:'column',sm:'row'}} spacing={2}>
   <Box component="img" src={row.thumbnail} alt="" sx={{width:140,height:80,objectFit:'cover',borderRadius:1}}/>
   <Box sx={{flex:1,minWidth:0}}><Typography variant="h6">{row.title}</Typography><Typography>{row.channel??'Unknown channel'} | {row.duration_seconds==null?'Duration pending':`${Math.ceil(row.duration_seconds)} seconds`} | {row.provider}</Typography>
    <Typography role={transcriptGenerationPending(row)?'status':undefined} variant="body2">{transcriptGenerationStatus(row)}</Typography>
    <Typography variant="body2">Processing: {row.status} | English: {row.translation_status} | {row.searchable?'Search enabled':'Unpublished / search disabled'}</Typography>
    <Typography variant="caption">Created {new Date(row.created_at).toLocaleString('en-GB')} | Updated {new Date(row.updated_at).toLocaleString('en-GB')}</Typography>{row.error_code&&<Alert severity="warning">{transcriptGenerationStatus(row)}</Alert>}
   </Box><Stack><Button onClick={()=>start(row)}>Edit / Publish</Button>{row.status==='ready'&&<Button component={Link} href={`/transcripts/${row.id}?from=admin`}>View transcript</Button>}<Button color="error" onClick={()=>{setDeleting(row);setDeleteError('')}}>Delete</Button></Stack>
  </Stack></CardContent></Card>)}
  <Stack direction="row" spacing={2}><Button disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography>Page {page+1} | {total} transcripts</Typography><Button disabled={(page+1)*30>=total||loading} onClick={()=>setPage(p=>p+1)}>Next</Button></Stack>
  <Dialog open={open} onClose={()=>{if(!busy){++editRequest.current;setOpen(false)}}} fullWidth maxWidth="md"><DialogTitle>{edit?'Edit Transcript':'Manual Import'}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   {formError&&<Alert severity="error" sx={{whiteSpace:'pre-wrap'}}>{formError}</Alert>}
   {!edit&&<TextField label="YouTube URL or video ID" placeholder="https://youtu.be/... or ZBynl03Vp-w" value={url} onChange={e=>setUrl(e.target.value)} required disabled={busy}/>}
   <TextField label="Video Title" value={title} onChange={e=>{setTitle(e.target.value);setSaved(false)}} disabled={busy} required/>{edit&&<TextField label="Channel / source" value={channel} onChange={e=>{setChannel(e.target.value);setSaved(false)}} disabled={busy}/>}
   {edit&&<>{editLoading?<Typography role="status">Loading transcript JSON...</Typography>:<><Box component="fieldset" disabled={busy} sx={{border:0,p:0,m:0,minWidth:0}}><TranscriptJsonField value={transcriptJson} onChange={value=>{setTranscriptJson(value);setSaved(false)}} /></Box><Stack direction="row" spacing={1}><Button disabled={busy||!editVersion} onClick={formatJson}>Format JSON</Button><Button disabled={busy||downloadBusy||!editVersion} onClick={()=>void download()}>{downloadBusy?'Downloading...':'Download JSON'}</Button></Stack></>}{saved&&<Alert severity="success">Saved</Alert>}</>}
   {!edit&&<><TranscriptJsonField value={transcriptJson} onChange={setTranscriptJson} /><TextField label="Video duration" placeholder="MM:SS or HH:MM:SS" value={duration} onChange={event=>setDuration(event.target.value)} required={checked?.ok===false&&checked.needsDuration} error={Boolean(durationError)} helperText={durationError||'Examples: 10:57, 42:15, 1:03:22. Only needed when the final end cannot be determined from the transcript or saved video metadata.'} disabled={busy}/>
    {transcriptJson.trim()&&!durationError&&!checked&&<Typography role="status">Checking transcript timing...</Typography>}
    {checked?.ok===false&&!durationError&&<Alert severity={checked.needsDuration?'warning':'error'}>{checked.error}</Alert>}
    {checked?.ok&&<Alert severity="success">{checked.segments} {checked.segments===1?'segment':'segments'} ready to import.{checked.durationSource==='saved-video'?' Using the saved video duration.':''}</Alert>}
   </>}
   <FormControlLabel control={<Checkbox checked={searchable} disabled={busy} onChange={e=>{setSearchable(e.target.checked);setSaved(false)}}/>} label="Publish to the shared searchable transcript library"/>
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>{++editRequest.current;setOpen(false)}}>{edit?'Close':'Cancel'}</Button><Button disabled={busy||editLoading||Boolean(edit&&!editVersion)||!edit&&!ready} variant="contained" onClick={()=>void save()}>{busy?(edit?'Saving…':'Importing...'):edit?(saved?'Saved':'Save Changes'):'Import'}</Button></DialogActions></Dialog>
  <Dialog open={Boolean(deleting)} onClose={()=>{if(!deleteBusy)setDeleting(null)}} aria-labelledby="delete-transcript-title" fullWidth maxWidth="sm"><DialogTitle id="delete-transcript-title">Delete transcript?</DialogTitle><DialogContent><Stack spacing={2}><Typography sx={{fontWeight:600}}>{deleting?.title}</Typography><Typography>This will permanently remove this transcript and its owned segments, search data, and generation records.</Typography>{deleteError&&<Alert severity="error">{deleteError}</Alert>}</Stack></DialogContent><DialogActions><Button disabled={deleteBusy} onClick={()=>setDeleting(null)}>Cancel</Button><Button color="error" variant="contained" disabled={deleteBusy} onClick={()=>void remove()}>{deleteBusy?'Deleting...':'Delete'}</Button></DialogActions></Dialog>
 </Stack>
}
