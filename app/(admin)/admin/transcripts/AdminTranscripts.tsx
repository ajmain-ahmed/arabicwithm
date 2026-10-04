'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {Alert,Box,Button,Card,CardContent,Checkbox,Dialog,DialogActions,DialogContent,DialogTitle,FormControlLabel,Stack,TextField,Typography} from '@mui/material'
import {generateAdminTranscript,deleteAdminTranscript,importAdminManualTranscriptResult,listAdminTranscripts,updateAdminTranscript,type TranscriptRow} from '@/app/actions/transcripts'
import { useAdminListCache } from "@/app/(admin)/admin/components/AdminListCacheProvider"
import TranscriptJsonField from '@/app/(admin)/admin/components/TranscriptJsonField'
import {transcriptGenerationStatus,transcriptGenerationPending} from '@/app/lib/transcriptStatus'

export default function AdminTranscripts(){
 const cache=useAdminListCache()
 const snapshot=cache.peek<{rows:TranscriptRow[];total:number}>("transcripts:0")
 const [rows,setRows]=useState<TranscriptRow[]>(snapshot?.rows??[]),[page,setPage]=useState(0),[total,setTotal]=useState(snapshot?.total??0),[loading,setLoading]=useState(!snapshot),[error,setError]=useState(''),[success,setSuccess]=useState(''),[refresh,setRefresh]=useState(0)
 const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[channel,setChannel]=useState(''),[transcriptJson,setTranscriptJson]=useState(''),[searchable,setSearchable]=useState(true),[busy,setBusy]=useState(false),[edit,setEdit]=useState<TranscriptRow|null>(null),[formError,setFormError]=useState('')
 const [generationUrl,setGenerationUrl]=useState(''),[generating,setGenerating]=useState(false),[deleting,setDeleting]=useState<TranscriptRow|null>(null),[deleteBusy,setDeleteBusy]=useState(false),[deleteError,setDeleteError]=useState('')
 const reload=useCallback(()=>{cache.invalidate("transcripts:");setRefresh(v=>v+1)},[cache])
 useEffect(()=>{let current=true;setLoading(!cache.peek(`transcripts:${page}`));setError('');cache.load(`transcripts:${page}`,()=>listAdminTranscripts(page)).then(result=>{if(current){setRows(result.rows);setTotal(result.total)}}).catch(e=>{if(current)setError(e.message)}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[page,refresh,cache])
 useEffect(()=>{if(!rows.some(transcriptGenerationPending))return;const timer=setInterval(()=>{if(document.visibilityState==='visible')reload()},5000);return()=>clearInterval(timer)},[rows,reload])
 async function save(){setBusy(true);setFormError('');try{
  if(edit)await updateAdminTranscript(edit.id,{title,channel,searchable})
  else { const result=await importAdminManualTranscriptResult({url,title,json:transcriptJson,searchable});if(!result.ok)throw new Error(result.error) }
  setOpen(false);setSuccess(edit?'Transcript settings saved.':'Transcript imported.');reload()
 }catch(e){setFormError(e instanceof Error?e.message:'Unable to save. Please retry.')}finally{setBusy(false)}}
 function start(row:TranscriptRow|null){setEdit(row);setTitle(row?.title??'');setChannel(row?.channel??'');setSearchable(row?.searchable??true);setUrl('');setTranscriptJson('');setFormError('');setOpen(true)}
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
  <Dialog open={open} onClose={()=>{if(!busy)setOpen(false)}} fullWidth maxWidth="md"><DialogTitle>{edit?'Edit Transcript':'Manual Import'}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   {formError&&<Alert severity="error">{formError}</Alert>}
   {!edit&&<TextField label="YouTube URL" value={url} onChange={e=>setUrl(e.target.value)} required/>}
   <TextField label="Video Title" value={title} onChange={e=>setTitle(e.target.value)} required/>{edit&&<TextField label="Channel / source" value={channel} onChange={e=>setChannel(e.target.value)}/>}
   {!edit&&<TranscriptJsonField value={transcriptJson} onChange={setTranscriptJson} />}
   <FormControlLabel control={<Checkbox checked={searchable} onChange={e=>setSearchable(e.target.checked)}/>} label="Publish to the shared searchable transcript library"/>
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy} variant="contained" onClick={()=>void save()}>{busy?'Saving...':edit?'Save':'Import'}</Button></DialogActions></Dialog>
  <Dialog open={Boolean(deleting)} onClose={()=>{if(!deleteBusy)setDeleting(null)}} aria-labelledby="delete-transcript-title" fullWidth maxWidth="sm"><DialogTitle id="delete-transcript-title">Delete transcript?</DialogTitle><DialogContent><Stack spacing={2}><Typography sx={{fontWeight:600}}>{deleting?.title}</Typography><Typography>This will permanently remove this transcript and its owned segments, search data, and generation records.</Typography>{deleteError&&<Alert severity="error">{deleteError}</Alert>}</Stack></DialogContent><DialogActions><Button disabled={deleteBusy} onClick={()=>setDeleting(null)}>Cancel</Button><Button color="error" variant="contained" disabled={deleteBusy} onClick={()=>void remove()}>{deleteBusy?'Deleting...':'Delete'}</Button></DialogActions></Dialog>
 </Stack>
}
