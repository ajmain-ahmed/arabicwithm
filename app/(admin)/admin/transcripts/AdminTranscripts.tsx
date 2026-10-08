'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {Alert,Box,Button,Card,CardContent,Checkbox,Dialog,DialogActions,DialogContent,DialogTitle,FormControlLabel,Stack,TextField,Typography} from '@mui/material'
import {deleteAdminTranscript,importAdminManualTranscriptResult,validateAdminManualTranscript,listAdminTranscripts,downloadAdminTranscriptJson,saveAdminTranscriptJson,moveAdminTranscriptGroup,type TranscriptRow,type TranscriptGroup,type ManualTranscriptCheck} from '@/app/actions/transcripts'
import { useAdminListCache } from "@/app/(admin)/admin/components/AdminListCacheProvider"
import TranscriptGeneration from './TranscriptGeneration'
import TranscriptDurationField from './TranscriptDurationField'
import {GroupSelector,GroupBrowser,GroupManager} from './TranscriptGroups'
import TranscriptJsonField from '@/app/(admin)/admin/components/TranscriptJsonField'
import {transcriptGenerationStatus,transcriptGenerationPending} from '@/app/lib/transcriptStatus'
import {parseVideoDuration} from '@/app/lib/transcriptTiming'

export default function AdminTranscripts(){
 const cache=useAdminListCache()
 const [searchInput,setSearchInput]=useState(''),[titleSearch,setTitleSearch]=useState('')
 const [groups,setGroups]=useState<TranscriptGroup[]>([]),[ungrouped,setUngrouped]=useState(0),[groupFilter,setGroupFilter]=useState('ungrouped'),[groupId,setGroupId]=useState(''),[manageGroups,setManageGroups]=useState(false)
 const snapshot=cache.peek<{rows:TranscriptRow[];total:number}>("transcripts:manual:0::ungrouped")
 const [rows,setRows]=useState<TranscriptRow[]>(snapshot?.rows??[]),[page,setPage]=useState(0),[total,setTotal]=useState(snapshot?.total??0),[loading,setLoading]=useState(!snapshot),[error,setError]=useState(''),[success,setSuccess]=useState(''),[refresh,setRefresh]=useState(0)
 const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[channel,setChannel]=useState(''),[transcriptJson,setTranscriptJson]=useState(''),[searchable,setSearchable]=useState(true),[busy,setBusy]=useState(false),[edit,setEdit]=useState<TranscriptRow|null>(null),[formError,setFormError]=useState('')
 const [editLoading,setEditLoading]=useState(false),[editVersion,setEditVersion]=useState(''),[saved,setSaved]=useState(false),[downloadBusy,setDownloadBusy]=useState(false)
 const editRequest=useRef(0),saving=useRef(false)
 const baseline=useRef<{json:string;title:string;channel:string;url:string;searchable:boolean;duration:number|undefined;groupId:string|null}|null>(null)
 function contentKey(json:string){try{return JSON.stringify(JSON.parse(json))}catch{return json}}
 const [duration,setDuration]=useState(''),[durationFormat,setDurationFormat]=useState<'clock'|'minutes'>('clock')
 const [validation,setValidation]=useState<{url:string;json:string;duration:string;durationFormat:string;result:ManualTranscriptCheck}|null>(null)
 let durationError=''
 try {parseVideoDuration(duration,durationFormat)}catch(error){durationError=error instanceof Error?error.message:'Enter MM:SS or HH:MM:SS.'}
 const checked=validation?.url===url&&validation.json===transcriptJson&&validation.duration===duration&&validation.durationFormat===durationFormat?validation.result:null
 const ready=checked?.ok&&!durationError&&Boolean(title.trim())
 useEffect(()=>{
  if(!open||edit||!transcriptJson.trim()||durationError)return
  let active=true
  const timer=setTimeout(()=>{void validateAdminManualTranscript({url,json:transcriptJson,duration,durationFormat}).then(result=>{if(active)setValidation({url,json:transcriptJson,duration,durationFormat,result})}).catch(()=>{if(active)setValidation({url,json:transcriptJson,duration,durationFormat,result:{ok:false,error:'Unable to check the transcript. Change an input to retry.',needsDuration:false}})})},750)
  return()=>{active=false;clearTimeout(timer)}
 },[open,edit,url,transcriptJson,duration,durationFormat,durationError])
 const [deleting,setDeleting]=useState<TranscriptRow|null>(null),[deleteBusy,setDeleteBusy]=useState(false),[deleteError,setDeleteError]=useState('')
 const reload=useCallback(()=>{cache.invalidate("transcripts:");setRefresh(v=>v+1)},[cache])
 useEffect(()=>{if(searchInput.trim()===titleSearch)return;const timer=setTimeout(()=>{setTitleSearch(searchInput.trim());setGroupFilter('');setPage(0)},350);return()=>clearTimeout(timer)},[searchInput,titleSearch])
 useEffect(()=>{let current=true;const key=`transcripts:manual:${page}:${titleSearch}:${groupFilter}`;setLoading(true);setError('');cache.load(key,()=>listAdminTranscripts(page,titleSearch,groupFilter),true).then(result=>{if(current){setRows(result.rows);setTotal(result.total);setGroups(result.groups??[]);setUngrouped(result.ungrouped??0);if(page>0&&page*30>=result.total)setPage(Math.max(0,Math.ceil(result.total/30)-1))}}).catch(e=>{if(current)setError(e.message)}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[page,titleSearch,groupFilter,refresh,cache])
 useEffect(()=>{if(!rows.some(transcriptGenerationPending))return;const timer=setInterval(()=>{if(document.visibilityState==='visible')reload()},5000);return()=>clearInterval(timer)},[rows,reload])
 async function save(){if(durationError||saving.current||busy||editLoading||edit&&!editVersion||!edit&&!ready)return;saving.current=true;setBusy(true);setFormError('');try{
  if(edit){
   const previous=baseline.current
   const groupOnly=previous&&previous.json===contentKey(transcriptJson)&&previous.title===title&&previous.channel===channel&&previous.url===url&&previous.searchable===searchable&&previous.duration===parseVideoDuration(duration,durationFormat)
   if(groupOnly){const result=await moveAdminTranscriptGroup(edit.id,{groupId:groupId||null,previousGroupId:previous.groupId,updatedAt:editVersion});if(!result.ok)throw new Error(result.error);setEditVersion(result.updatedAt);baseline.current={...previous,groupId:groupId||null}}
   else {const result=await saveAdminTranscriptJson(edit.id,{json:transcriptJson,title,channel,searchable,updatedAt:editVersion,duration,durationFormat,url,groupId:groupId||null});if(!result.ok)throw new Error(result.error);setTranscriptJson(result.json);setEditVersion(result.updatedAt);baseline.current={json:contentKey(result.json),title,channel,url,searchable,duration:parseVideoDuration(duration,durationFormat),groupId:groupId||null}}
   setSaved(true);setSuccess('Saved');reload();return
  }
  else { const result=await importAdminManualTranscriptResult({url,title,json:transcriptJson,searchable,duration,durationFormat,groupId:groupId||null});if(!result.ok)throw new Error(result.error);setGroupFilter(groupId||'ungrouped');setSearchInput('');setTitleSearch('');setPage(0) }
  setOpen(false);setSuccess(edit?'Transcript settings saved.':'Transcript imported.');reload()
 }catch(e){setFormError(e instanceof Error?e.message:'Unable to save. Please retry.')}finally{setBusy(false);saving.current=false}}
 async function start(row:TranscriptRow|null,initialGroup:string|null=null){baseline.current=null;const request=++editRequest.current;setEditVersion('');setSaved(false);setEditLoading(Boolean(row));setEdit(row);setTitle(row?.title??'');setChannel(row?.channel??'');setSearchable(row?.searchable??true);setUrl(row?.youtube_id??'');setGroupId(row?.group_id??initialGroup??'');setTranscriptJson('');setDuration('');setDurationFormat('clock');setValidation(null);setFormError('');setOpen(true);if(row){try{const result=await downloadAdminTranscriptJson(row.id);if(request===editRequest.current){setTranscriptJson(result.json);setEditVersion(result.updatedAt);if(result.youtubeId!==undefined)setUrl(result.youtubeId);if(result.groupId!==undefined)setGroupId(result.groupId??'');if(result.durationSeconds!=null){const ms=Math.round(result.durationSeconds*1000);const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,seconds=((ms%60000)/1000).toFixed(ms%1000?3:0).padStart(ms%1000?6:2,'0');setDuration(h?`${h}:${String(m).padStart(2,'0')}:${seconds}`:`${m}:${seconds}`)}if(result.title!==undefined)setTitle(result.title);if(result.channel!==undefined)setChannel(result.channel??'');if(result.searchable!==undefined)setSearchable(result.searchable);baseline.current={json:contentKey(result.json),title:result.title??row.title,channel:result.channel!==undefined?result.channel??'':row.channel??'',url:result.youtubeId??row.youtube_id??'',searchable:result.searchable??row.searchable,duration:result.durationSeconds==null?undefined:Math.round(result.durationSeconds*1000),groupId:result.groupId!==undefined?result.groupId:row.group_id??null}}}catch(error){if(request===editRequest.current)setFormError(error instanceof Error?error.message:'Could not load transcript JSON.')}finally{if(request===editRequest.current)setEditLoading(false)}}}
 function formatJson(){try{setTranscriptJson(JSON.stringify(JSON.parse(transcriptJson),null,2));setFormError('')}catch(error){setFormError(error instanceof Error?`Invalid JSON: ${error.message}`:'Invalid JSON.')}}
 async function download(){if(!edit||downloadBusy)return;setDownloadBusy(true);setFormError('');try{const result=await downloadAdminTranscriptJson(edit.id);const href=URL.createObjectURL(new Blob([result.json],{type:'application/json;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=href;anchor.download=result.filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),1000)}catch(error){setFormError(error instanceof Error?error.message:'Could not download transcript.')}finally{setDownloadBusy(false)}}
 async function remove(){if(!deleting)return;setDeleteBusy(true);setDeleteError('');try{
  const result=await deleteAdminTranscript(deleting.id)
  if(!result.ok){setDeleteError(result.error);return}
  setDeleting(null);setSuccess('Transcript and its owned data deleted.');setPage(0);reload()
 }catch{setDeleteError('Unable to contact transcript deletion. Please retry.')}finally{setDeleteBusy(false)}}
 const transcriptResults=<Stack spacing={2}>
  {loading&&<Typography role="status">Loading transcripts...</Typography>}{!loading&&!error&&!rows.length&&<Typography>{titleSearch?'No transcripts match this title.':groupFilter==='ungrouped'?'No ungrouped transcripts.':groupFilter?'No transcripts in this group yet.':'No transcripts in the library.'}</Typography>}
  {rows.map(row=><Card variant="outlined" key={row.id}><CardContent><Stack direction={{xs:'column',sm:'row'}} spacing={2}>
   <Box component="img" src={row.thumbnail} alt="" sx={{width:140,height:80,objectFit:'cover',borderRadius:1}}/>
   <Box sx={{flex:1,minWidth:0}}><Typography variant="h6" dir="auto">{row.title}</Typography><Typography>{row.channel??'Unknown channel'} | {row.duration_seconds==null?'Duration pending':`${Math.ceil(row.duration_seconds)} seconds`} | {row.provider}</Typography>
    <Typography role={transcriptGenerationPending(row)?'status':undefined} variant="body2">{transcriptGenerationStatus(row)}</Typography>
    <Typography variant="body2">Processing: {row.status} | English: {row.translation_status} | {row.searchable?'Search enabled':'Unpublished / search disabled'}</Typography>
    <Typography variant="caption">Created {new Date(row.created_at).toLocaleString('en-GB')} | Updated {new Date(row.updated_at).toLocaleString('en-GB')}</Typography>{row.error_code&&<Alert severity="warning">{transcriptGenerationStatus(row)}</Alert>}
   </Box><Stack><Button onClick={()=>start(row)}>Edit / Publish</Button>{row.status==='ready'&&<Button component={Link} href={`/transcripts/${row.id}?from=admin`}>View transcript</Button>}<Button color="error" onClick={()=>{setDeleting(row);setDeleteError('')}}>Delete</Button></Stack>
  </Stack></CardContent></Card>)}
  <Stack direction="row" spacing={2}><Button disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography>Page {page+1} | {total} transcripts</Typography><Button disabled={(page+1)*30>=total||loading} onClick={()=>setPage(p=>p+1)}>Next</Button></Stack>
 </Stack>
 return <Stack spacing={2}>
  <Stack direction="row" spacing={2} sx={{justifyContent:'space-between',flexWrap:'wrap'}}><Typography variant="h4">Transcripts</Typography><Box><Button onClick={reload} disabled={loading}>Refresh</Button><Button variant="contained" onClick={()=>start(null)}>Add Transcript</Button></Box></Stack>
  <TranscriptGeneration/>
  <Stack direction="row" spacing={1} sx={{alignItems:'center'}}><TextField fullWidth type="search" label="Search transcripts by title" placeholder="Search titles or group names" value={searchInput} onChange={event=>setSearchInput(event.target.value)} slotProps={{htmlInput:{maxLength:300}}}/>{searchInput&&<Button onClick={()=>{setSearchInput('');setTitleSearch('');setGroupFilter('');setPage(0)}}>Clear</Button>}</Stack>
  <Stack direction={{xs:'column',sm:'row'}} spacing={1}><Button onClick={()=>setManageGroups(true)}>Create Group</Button><Button onClick={()=>setManageGroups(true)}>Manage Groups</Button><GroupSelector groups={groups} value={groupFilter} onChange={value=>{setGroupFilter(value);setPage(0)}} label="Filter by group" all/>{groupFilter&&<Button onClick={()=>{setGroupFilter('');setPage(0)}}>Clear filter</Button>}</Stack>
  <GroupBrowser key={groupFilter} onAdd={id=>void start(null,id)} results={transcriptResults} groups={groups} ungrouped={ungrouped} filter={groupFilter} onFilter={value=>{setGroupFilter(value);setPage(0)}}/>

  {success&&<Alert severity="success" onClose={()=>setSuccess('')}>{success}</Alert>}{error&&<Alert severity="error" action={<Button onClick={reload}>Retry</Button>}>{error}</Alert>}
  {!groupFilter&&transcriptResults}
  <Dialog open={open} onClose={()=>{if(!busy){++editRequest.current;setOpen(false)}}} fullWidth maxWidth="md"><DialogTitle>{edit?'Edit Transcript':'Manual Import'}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   {formError&&<Alert severity={formError.includes('duplicate timestamp')?'warning':'error'} sx={{whiteSpace:'pre-wrap'}}>{formError}</Alert>}
   <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:2}}>
    <TextField label="Video Title" value={title} onChange={e=>{setTitle(e.target.value);setSaved(false)}} disabled={busy} required slotProps={{htmlInput:{dir:'auto'}}}/>
    <TextField label="YouTube URL or video ID" placeholder="https://youtu.be/... or ZBynl03Vp-w" value={url} onChange={e=>{setUrl(e.target.value);setSaved(false)}} required disabled={busy}/>
    <Stack spacing={1}><GroupSelector groups={groups} value={groupId} onChange={value=>{setGroupId(value);setSaved(false)}} disabled={busy||editLoading}/><Button disabled={busy} onClick={()=>setManageGroups(true)}>Create a group</Button></Stack>
    <TranscriptDurationField value={duration} onChange={value=>{setDuration(value);setSaved(false)}} format={durationFormat} onFormat={value=>{setDurationFormat(value);setSaved(false)}} required={checked?.ok===false&&checked.needsDuration} error={durationError} disabled={busy}/>

   </Box>
   {edit&&<>{editLoading?<Typography role="status">Loading transcript JSON...</Typography>:<><Box component="fieldset" disabled={busy} sx={{border:0,p:0,m:0,minWidth:0}}><TranscriptJsonField value={transcriptJson} onChange={value=>{setTranscriptJson(value);setSaved(false)}} /></Box><Stack direction="row" spacing={1}><Button disabled={busy||!editVersion} onClick={formatJson}>Format JSON</Button><Button disabled={busy||downloadBusy||!editVersion} onClick={()=>void download()}>{downloadBusy?'Downloading...':'Download JSON'}</Button></Stack></>}{saved&&<Alert severity="success">Saved</Alert>}</>}
   {!edit&&<><TranscriptJsonField value={transcriptJson} onChange={setTranscriptJson} />
    {transcriptJson.trim()&&!durationError&&!checked&&<Typography role="status">Checking transcript timing...</Typography>}
    {checked?.ok===false&&!durationError&&<Alert severity={checked.needsDuration||checked.error.includes('duplicate timestamp')?'warning':'error'} sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{checked.error}</Alert>}
    {checked?.ok&&<Alert severity="success">{checked.segments} {checked.segments===1?'segment':'segments'} ready to import.{checked.durationSource==='youtube'?' Using the actual YouTube video duration.':checked.durationSource==='saved-video'?' Using the saved video duration.':''}</Alert>}
   </>}

   <FormControlLabel control={<Checkbox checked={searchable} disabled={busy} onChange={e=>{setSearchable(e.target.checked);setSaved(false)}}/>} label="Publish to the shared searchable transcript library"/>
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>{++editRequest.current;setOpen(false)}}>{edit?'Close':'Cancel'}</Button><Button disabled={busy||Boolean(durationError)||editLoading||Boolean(edit&&!editVersion)||!edit&&!ready} variant="contained" onClick={()=>void save()}>{busy?(edit?'Saving…':'Importing...'):edit?(saved?'Saved':'Save Changes'):'Import'}</Button></DialogActions></Dialog>
  {manageGroups&&<GroupManager open={manageGroups} groups={groups} onClose={()=>setManageGroups(false)} onSaved={async(id,created)=>{cache.invalidate('transcripts:');const result=await listAdminTranscripts(0,titleSearch,groupFilter);setGroups(result.groups??[]);setUngrouped(result.ungrouped??0);if(created&&open){setGroupId(id);setSaved(false)}if(groupFilter!=='ungrouped'&&groupFilter&&!result.groups?.some(group=>group.id===groupFilter)){setGroupFilter('');setPage(0)}if(groupId&&!result.groups?.some(group=>group.id===groupId))setGroupId('');reload()}}/>}
  <Dialog open={Boolean(deleting)} onClose={()=>{if(!deleteBusy)setDeleting(null)}} aria-labelledby="delete-transcript-title" fullWidth maxWidth="sm"><DialogTitle id="delete-transcript-title">Delete transcript?</DialogTitle><DialogContent><Stack spacing={2}><Typography sx={{fontWeight:600}}>{deleting?.title}</Typography><Typography>This will permanently remove this transcript and its owned segments, search data, and generation records.</Typography>{deleteError&&<Alert severity="error">{deleteError}</Alert>}</Stack></DialogContent><DialogActions><Button disabled={deleteBusy} onClick={()=>setDeleting(null)}>Cancel</Button><Button color="error" variant="contained" disabled={deleteBusy} onClick={()=>void remove()}>{deleteBusy?'Deleting...':'Delete'}</Button></DialogActions></Dialog>
 </Stack>
}
