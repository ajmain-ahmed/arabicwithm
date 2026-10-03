'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {Alert,Box,Button,Card,CardContent,Checkbox,Dialog,DialogActions,DialogContent,DialogTitle,FormControlLabel,Stack,Tab,Tabs,TextField,Typography} from '@mui/material'
import {addAdminYouTubeTranscript,importAdminManualTranscript,listAdminTranscripts,updateAdminTranscript,type TranscriptRow} from '@/app/actions/transcripts'

export default function AdminTranscripts(){
 const [rows,setRows]=useState<TranscriptRow[]>([]),[page,setPage]=useState(0),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState(''),[refresh,setRefresh]=useState(0)
 const [open,setOpen]=useState(false),[tab,setTab]=useState(0),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[channel,setChannel]=useState(''),[arabic,setArabic]=useState(''),[english,setEnglish]=useState(''),[searchable,setSearchable]=useState(false),[busy,setBusy]=useState(false),[edit,setEdit]=useState<TranscriptRow|null>(null),[formError,setFormError]=useState('')
 const reload=useCallback(()=>setRefresh(v=>v+1),[])
 useEffect(()=>{let current=true;setLoading(true);setError('');listAdminTranscripts(page).then(result=>{if(current){setRows(result.rows);setTotal(result.total)}}).catch(e=>{if(current)setError(e.message)}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[page,refresh])
 useEffect(()=>{if(!rows.some(r=>['queued','processing','indexing'].includes(r.status)))return;const timer=setInterval(()=>{if(document.visibilityState==='visible')reload()},15000);return()=>clearInterval(timer)},[rows,reload])
 async function save(){setBusy(true);setFormError('');try{
  if(edit)await updateAdminTranscript(edit.id,{title,channel,searchable})
  else if(tab===0)await addAdminYouTubeTranscript(url)
  else await importAdminManualTranscript({url,title,channel,arabic,english,searchable})
  setOpen(false);setSuccess(edit?'Transcript settings saved.':'Canonical transcript added or reused. Processing jobs will update automatically.');reload()
 }catch(e){setFormError(e instanceof Error?e.message:'Unable to save. Please retry.')}finally{setBusy(false)}}
 async function readFile(file:File|undefined,translation=false){if(!file)return;try{if(file.size>1048576)throw new Error('Transcript files must be at most 1 MB.');const text=await file.text();if(translation)setEnglish(text);else setArabic(text)}catch(e){setFormError(e instanceof Error?e.message:'Unable to read file.')}}
 function start(row:TranscriptRow|null){setEdit(row);setTitle(row?.title??'');setChannel(row?.channel??'');setSearchable(row?.searchable??false);setUrl('');setArabic('');setEnglish('');setTab(0);setFormError('');setOpen(true)}
 return <Stack spacing={2}>
  <Stack direction="row" spacing={2} sx={{justifyContent:'space-between',flexWrap:'wrap'}}><Typography variant="h4">Transcripts</Typography><Box><Button onClick={reload} disabled={loading}>Refresh</Button><Button variant="contained" onClick={()=>start(null)}>Add Transcript</Button></Box></Stack>
  {success&&<Alert severity="success" onClose={()=>setSuccess('')}>{success}</Alert>}{error&&<Alert severity="error" action={<Button onClick={reload}>Retry</Button>}>{error}</Alert>}
  {loading&&<Typography role="status">Loading transcripts...</Typography>}{!loading&&!error&&!rows.length&&<Typography>No transcripts in this page of the library.</Typography>}
  {rows.map(row=><Card variant="outlined" key={row.id}><CardContent><Stack direction={{xs:'column',sm:'row'}} spacing={2}>
   <Box component="img" src={row.thumbnail} alt="" sx={{width:140,height:80,objectFit:'cover',borderRadius:1}}/>
   <Box sx={{flex:1,minWidth:0}}><Typography variant="h6">{row.title}</Typography><Typography>{row.channel??'Unknown channel'} | {row.duration_seconds==null?'Duration pending':`${Math.ceil(row.duration_seconds)} seconds`} | {row.provider}</Typography>
    <Typography variant="body2">Processing: {row.status} | English: {row.translation_status} | {row.searchable?'Search enabled':'Unpublished / search disabled'}</Typography>
    <Typography variant="caption">Created {new Date(row.created_at).toLocaleString('en-GB')} | Updated {new Date(row.updated_at).toLocaleString('en-GB')}</Typography>{row.error_code&&<Alert severity="warning">{row.error_code}</Alert>}
   </Box><Stack><Button onClick={()=>start(row)}>Edit / Publish</Button>{row.status==='ready'&&row.searchable&&<Button component={Link} href={`/transcripts/${row.id}`}>View transcript</Button>}</Stack>
  </Stack></CardContent></Card>)}
  <Stack direction="row" spacing={2}><Button disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography>Page {page+1} | {total} transcripts</Typography><Button disabled={(page+1)*30>=total||loading} onClick={()=>setPage(p=>p+1)}>Next</Button></Stack>
  <Dialog open={open} onClose={()=>{if(!busy)setOpen(false)}} fullWidth maxWidth="md"><DialogTitle>{edit?'Edit Transcript':'Add Transcript'}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   {formError&&<Alert severity="error">{formError}</Alert>}
   {!edit&&<><Tabs value={tab} onChange={(_,value)=>{setTab(value);setFormError('')}}><Tab label="Paste YouTube URL"/><Tab label="Manual Import"/></Tabs><TextField label="YouTube URL" value={url} onChange={e=>setUrl(e.target.value)} required/>{tab===0&&<Typography variant="body2">Uses the configured import provider. Existing canonical videos are reused. Supadata remains the default.</Typography>}</>}
   {(edit||tab===1)&&<><TextField label="Video title" value={title} onChange={e=>setTitle(e.target.value)} required/><TextField label="Channel / source" value={channel} onChange={e=>setChannel(e.target.value)}/></>}
   {!edit&&tab===1&&<><Typography variant="body2">SRT, WebVTT or explicit start and end ranges with milliseconds. Untimed text cannot be imported. No provider is called for manual imports.</Typography>
    <Button component="label">Choose Arabic SRT / VTT<input hidden type="file" accept=".srt,.vtt,.txt" onChange={e=>void readFile(e.target.files?.[0])}/></Button><TextField label="Timed Arabic transcript" multiline rows={7} value={arabic} onChange={e=>setArabic(e.target.value)}/>
    <Button component="label">Choose optional English SRT / VTT<input hidden type="file" accept=".srt,.vtt,.txt" onChange={e=>void readFile(e.target.files?.[0],true)}/></Button><TextField label="Optional English transcript (matching cue times)" multiline rows={4} value={english} onChange={e=>setEnglish(e.target.value)}/></>}
   {(edit||tab===1)&&<FormControlLabel control={<Checkbox checked={searchable} onChange={e=>setSearchable(e.target.checked)}/>} label="Publish to the shared searchable transcript library"/>}
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy} variant="contained" onClick={()=>void save()}>{busy?'Saving...':edit?'Save':tab===0?'Queue import':'Import timed transcript'}</Button></DialogActions></Dialog>
 </Stack>
}
