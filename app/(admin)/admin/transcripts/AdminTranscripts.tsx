'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import {Alert,Box,Button,Card,CardContent,Checkbox,LinearProgress,Dialog,DialogActions,DialogContent,DialogTitle,FormControlLabel,Stack,TextField,Typography} from '@mui/material'
import {saveAdminManualDraft,loadAdminManualDraft,deleteAdminManualDraft,loadAdminManualEnrichment,retryAdminManualEnrichment,deleteAdminTranscript,resumeAdminManualImport,prepareAdminManualImport,appendAdminManualImport,finishAdminManualImport,validateAdminManualTranscript,listAdminTranscripts,downloadAdminTranscriptJson,saveAdminTranscriptJson,moveAdminTranscriptGroup,type TranscriptRow,type TranscriptGroup,type ManualTranscriptCheck} from '@/app/actions/transcripts'
import { useAdminListCache } from "@/app/(admin)/admin/components/AdminListCacheProvider"
import TranscriptGeneration from './TranscriptGeneration'
import TranscriptDurationField from './TranscriptDurationField'
import {GroupSelector,GroupBrowser,GroupManager} from './TranscriptGroups'
import TranscriptJsonField from '@/app/(admin)/admin/components/TranscriptJsonField'
import {transcriptGenerationStatus,transcriptGenerationPending} from '@/app/lib/transcriptStatus'
import {runManualImport,type ManualImportProgress} from '@/app/lib/manualImportRunner'
import {parseVideoDuration} from '@/app/lib/transcriptTiming'

export default function AdminTranscripts(){
 const cache=useAdminListCache()
 const [searchInput,setSearchInput]=useState(''),[titleSearch,setTitleSearch]=useState('')
 const [groups,setGroups]=useState<TranscriptGroup[]>([]),[ungrouped,setUngrouped]=useState(0),[groupFilter,setGroupFilter]=useState('ungrouped'),[groupId,setGroupId]=useState(''),[manageGroups,setManageGroups]=useState(false)
 const snapshot=cache.peek<{rows:TranscriptRow[];total:number}>("transcripts:manual:0::ungrouped")
 const [rows,setRows]=useState<TranscriptRow[]>(snapshot?.rows??[]),[page,setPage]=useState(0),[total,setTotal]=useState(snapshot?.total??0),[loading,setLoading]=useState(!snapshot),[error,setError]=useState(''),[success,setSuccess]=useState(''),[refresh,setRefresh]=useState(0)
 const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[channel,setChannel]=useState(''),[transcriptJson,setTranscriptJson]=useState(''),[searchable,setSearchable]=useState(true),[busy,setBusy]=useState(false),[edit,setEdit]=useState<TranscriptRow|null>(null),[formError,setFormError]=useState('')
 const [draftId,setDraftId]=useState<string|null>(null),[draftVersion,setDraftVersion]=useState<string|null>(null),[draftLoading,setDraftLoading]=useState(false),[draftSaving,setDraftSaving]=useState(false),[resuming,setResuming]=useState(false)
 const realGroups=groups.filter(group=>group.id!=='drafts')
 const [progress,setProgress]=useState<ManualImportProgress|null>(null)
 const [enrichment,setEnrichment]=useState(''),[enrichmentDiagnostics,setEnrichmentDiagnostics]=useState('')
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
 useEffect(()=>{if(searchInput.trim()===titleSearch)return;const timer=setTimeout(()=>{setTitleSearch(searchInput.trim());if(groupFilter!=='drafts')setGroupFilter('');setPage(0)},350);return()=>clearTimeout(timer)},[searchInput,titleSearch,groupFilter])
 useEffect(()=>{let current=true;const key=`transcripts:manual:${page}:${titleSearch}:${groupFilter}`;setLoading(true);setError('');cache.load(key,()=>listAdminTranscripts(page,titleSearch,groupFilter),true).then(result=>{if(current){setRows(result.rows);setTotal(result.total);setGroups(result.groups??[]);setUngrouped(result.ungrouped??0);if(page>0&&page*30>=result.total)setPage(Math.max(0,Math.ceil(result.total/30)-1))}}).catch(e=>{if(current)setError(e.message)}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[page,titleSearch,groupFilter,refresh,cache])
 useEffect(()=>{if(!rows.some(transcriptGenerationPending))return;const timer=setInterval(()=>{if(document.visibilityState==='visible')reload()},5000);return()=>clearInterval(timer)},[rows,reload])
 async function save(){if(durationError||saving.current||busy||editLoading||draftLoading||edit&&!editVersion||!edit&&!ready)return;saving.current=true;setBusy(true);setFormError('');try{
  if(edit){
   const previous=baseline.current
   const groupOnly=previous&&previous.json===contentKey(transcriptJson)&&previous.title===title&&previous.channel===channel&&previous.url===url&&previous.searchable===searchable&&previous.duration===parseVideoDuration(duration,durationFormat)
   if(groupOnly){const result=await moveAdminTranscriptGroup(edit.id,{groupId:groupId||null,previousGroupId:previous.groupId,updatedAt:editVersion});if(!result.ok)throw new Error(result.error);setEditVersion(result.updatedAt);baseline.current={...previous,groupId:groupId||null}}
   else {const result=await saveAdminTranscriptJson(edit.id,{json:transcriptJson,title,channel,searchable,updatedAt:editVersion,duration,durationFormat,url,groupId:groupId||null});if(!result.ok)throw new Error(result.error);setTranscriptJson(result.json);setEditVersion(result.updatedAt);baseline.current={json:contentKey(result.json),title,channel,url,searchable,duration:parseVideoDuration(duration,durationFormat),groupId:groupId||null}}
   setSaved(true);setSuccess('Saved. Optional enrichment can be retried below.');reload();return
  }
  else { const result=await runManualImport({prepare:()=>prepareAdminManualImport({url,title,json:transcriptJson,searchable,duration,durationFormat,groupId:groupId||null}),append:appendAdminManualImport,finish:finishAdminManualImport},setProgress); setGroupFilter(groupId||'ungrouped');setSearchInput('');setTitleSearch('');setPage(0);let retainedDraft=false;if(draftId&&draftVersion){try{const removed=await deleteAdminManualDraft(draftId,draftVersion);retainedDraft=!removed.ok}catch{retainedDraft=true}}setSuccess((result.enrichment==='ready'?'Import completed. Transcript imported and enriched.':`Import completed. Transcript imported with ${result.enrichment==='partial'?'partial':'unavailable'} enrichment. Original content is saved.`)+(retainedDraft?' Your saved draft was retained.':'')) }
  setOpen(false);reload()
 }catch(e){setFormError(e instanceof Error?e.message:'Unable to save. Please retry.')}finally{setBusy(false);saving.current=false}}
 async function resume(row:TranscriptRow){
  if(saving.current)return;saving.current=true;setBusy(true);setResuming(true);setEdit(null);setDraftId(null);setDraftVersion(null);setTitle(row.title);setUrl(row.youtube_id);setTranscriptJson('');setProgress(null);setFormError('');setOpen(true)
  try{const result=await runManualImport({prepare:()=>resumeAdminManualImport(row.id),append:appendAdminManualImport,finish:finishAdminManualImport},setProgress);setSuccess(`Import completed. Transcript saved with ${result.enrichment} enrichment.`);setOpen(false);reload()}
  catch(error){setFormError(error instanceof Error?error.message:'Unable to resume import.')}finally{setBusy(false);saving.current=false}
 }
 async function start(row:TranscriptRow|null,initialGroup:string|null=null){setResuming(false);setDraftId(null);setDraftVersion(null);setDraftLoading(false);setProgress(null);baseline.current=null;const request=++editRequest.current;setEditVersion('');setSaved(false);setEditLoading(Boolean(row));setEdit(row);setTitle(row?.title??'');setChannel(row?.channel??'');setSearchable(row?.searchable??true);setUrl(row?.youtube_id??'');setGroupId(row?.group_id??(initialGroup==='drafts'?null:initialGroup)??'');setTranscriptJson('');setDuration('');setDurationFormat('clock');setValidation(null);setFormError('');setEnrichment('');setEnrichmentDiagnostics('');setOpen(true);if(row){try{const result=await downloadAdminTranscriptJson(row.id);const details=await loadAdminManualEnrichment(row.id);if(request===editRequest.current){setEnrichment(details?.status??'legacy');setEnrichmentDiagnostics(details?JSON.stringify(details.diagnostics,null,2):'');setTranscriptJson(result.json);setEditVersion(result.updatedAt);if(result.youtubeId!==undefined)setUrl(result.youtubeId);if(result.groupId!==undefined)setGroupId(result.groupId??'');if(result.durationSeconds!=null){const ms=Math.round(result.durationSeconds*1000);const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,seconds=((ms%60000)/1000).toFixed(ms%1000?3:0).padStart(ms%1000?6:2,'0');setDuration(h?`${h}:${String(m).padStart(2,'0')}:${seconds}`:`${m}:${seconds}`)}if(result.title!==undefined)setTitle(result.title);if(result.channel!==undefined)setChannel(result.channel??'');if(result.searchable!==undefined)setSearchable(result.searchable);baseline.current={json:contentKey(result.json),title:result.title??row.title,channel:result.channel!==undefined?result.channel??'':row.channel??'',url:result.youtubeId??row.youtube_id??'',searchable:result.searchable??row.searchable,duration:result.durationSeconds==null?undefined:Math.round(result.durationSeconds*1000),groupId:result.groupId!==undefined?result.groupId:row.group_id??null}}}catch(error){if(request===editRequest.current)setFormError(error instanceof Error?error.message:'Could not load transcript JSON.')}finally{if(request===editRequest.current)setEditLoading(false)}}}
 async function saveDraft(){
  if(busy||saving.current||draftLoading)return;saving.current=true;setBusy(true);setDraftSaving(true);setFormError('')
  try{const id=draftId??crypto.randomUUID();setDraftId(id);const result=await saveAdminManualDraft(id,{url,title,channel,json:transcriptJson,searchable,duration,durationFormat,groupId:groupId||null},draftVersion)
   if(!result.ok)throw new Error(result.error)
   setDraftVersion(result.updatedAt);setSuccess('Draft saved in Drafts.');setGroupFilter('drafts');setSearchInput('');setTitleSearch('');setPage(0);setOpen(false);reload()
  }catch(error){setFormError(error instanceof Error?error.message:'Unable to save draft.')}finally{setBusy(false);setDraftSaving(false);saving.current=false}
 }
 async function openDraft(row:TranscriptRow){
  await start(null);const request=editRequest.current;setDraftId(row.draft_id??row.id);setDraftLoading(true)
  try{const draft=await loadAdminManualDraft(row.draft_id??row.id)
   if(request!==editRequest.current)return
   const p=draft.payload;setDraftId(draft.id);setDraftVersion(draft.updatedAt);setTitle(p.title);setUrl(p.url);setChannel(p.channel);setTranscriptJson(p.json);setDuration(p.duration);setDurationFormat(p.durationFormat);setSearchable(p.searchable);setGroupId(realGroups.some(group=>group.id===p.groupId)?p.groupId??'':'')
  }catch(error){if(request===editRequest.current)setFormError(error instanceof Error?error.message:'Unable to load draft.')}finally{if(request===editRequest.current)setDraftLoading(false)}
 }
 function formatJson(){try{setTranscriptJson(JSON.stringify(JSON.parse(transcriptJson),null,2));setFormError('')}catch(error){setFormError(error instanceof Error?`Invalid JSON: ${error.message}`:'Invalid JSON.')}}
 async function download(){if(!edit||downloadBusy)return;setDownloadBusy(true);setFormError('');try{const result=await downloadAdminTranscriptJson(edit.id);const href=URL.createObjectURL(new Blob([result.json],{type:'application/json;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=href;anchor.download=result.filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),1000)}catch(error){setFormError(error instanceof Error?error.message:'Could not download transcript.')}finally{setDownloadBusy(false)}}
 async function remove(){if(!deleting)return;setDeleteBusy(true);setDeleteError('');try{
  const result=deleting.draft_id?await deleteAdminManualDraft(deleting.draft_id,deleting.draft_version??''):await deleteAdminTranscript(deleting.id)
  if(!result.ok){setDeleteError(result.error);return}
  setDeleting(null);setSuccess(deleting.draft_id?'Draft deleted.':'Transcript and its owned data deleted.');setPage(0);reload()
 }catch{setDeleteError('Unable to contact transcript deletion. Please retry.')}finally{setDeleteBusy(false)}}
 const transcriptResults=<Stack spacing={2}>
  {loading&&<Typography role="status">Loading transcripts...</Typography>}{!loading&&!error&&!rows.length&&<Typography>{titleSearch?'No transcripts match this title.':groupFilter==='ungrouped'?'No ungrouped transcripts.':groupFilter?'No transcripts in this group yet.':'No transcripts in the library.'}</Typography>}
  {rows.map(row=><Card variant="outlined" key={row.id}><CardContent><Stack direction={{xs:'column',sm:'row'}} spacing={2}>
   {row.draft_id?<Box sx={{width:140,alignSelf:"center"}}><Typography color="text.secondary">Draft</Typography></Box>:<Box component="img" src={row.thumbnail} alt="" sx={{width:140,height:80,objectFit:'cover',borderRadius:1}}/>}
   <Box sx={{flex:1,minWidth:0}}><Typography variant="h6" dir="auto">{row.title}</Typography><Typography>{row.channel??'Unknown channel'} | {row.duration_seconds==null?'Duration pending':`${Math.ceil(row.duration_seconds)} seconds`} | {row.provider}</Typography>
    <Typography role={transcriptGenerationPending(row)?'status':undefined} variant="body2">{row.draft_id?'Saved draft - not imported or published':transcriptGenerationStatus(row)}</Typography>
    <Typography variant="body2">Processing: {row.status} | English: {row.translation_status} | {row.searchable?'Search enabled':'Unpublished / search disabled'}</Typography>
    <Typography variant="caption">Created {new Date(row.created_at).toLocaleString('en-GB')} | Updated {new Date(row.updated_at).toLocaleString('en-GB')}</Typography>{row.error_code&&<Alert severity="warning">{transcriptGenerationStatus(row)}</Alert>}
   </Box><Stack>{row.draft_id?<Button onClick={()=>void openDraft(row)}>Open draft</Button>:row.provider==='manual'&&row.status==='indexing'?<Button disabled={busy} onClick={()=>void resume(row)}>Resume import</Button>:<Button onClick={()=>start(row)}>Edit / Publish</Button>}{row.status==='ready'&&<Button component={Link} href={`/transcripts/${row.id}?from=admin`}>View transcript</Button>}<Button color="error" onClick={()=>{setDeleting(row);setDeleteError('')}}>Delete</Button></Stack>
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
  <Dialog open={open} onClose={()=>{if(!busy){++editRequest.current;setOpen(false)}}} fullWidth maxWidth="md"><DialogTitle>{edit?'Edit Transcript':draftId?'Manual Import Draft':'Manual Import'}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   {draftLoading&&<Typography role="status">Loading draft...</Typography>}
   {progress&&<Box role="status"><Typography>{progress.phase}{progress.expected>0?` - ${progress.committed} / ${progress.expected} segments (${progress.percent}%)`:""}</Typography><LinearProgress variant="determinate" value={progress.percent} aria-label="Transcript import progress"/><Typography variant="caption">Committed batches are saved. Retry with the same transcript and settings to resume.</Typography></Box>}
   {formError&&<Alert severity={formError.includes('duplicate timestamp')?'warning':'error'} sx={{whiteSpace:'pre-wrap'}}>{formError}</Alert>}
   <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:2}}>
    <TextField label="Video Title" value={title} onChange={e=>{setTitle(e.target.value);setSaved(false)}} disabled={busy||draftLoading} required slotProps={{htmlInput:{dir:'auto'}}}/>
    <TextField label="YouTube URL or video ID" placeholder="https://youtu.be/... or ZBynl03Vp-w" value={url} onChange={e=>{setUrl(e.target.value);setSaved(false)}} required disabled={busy||draftLoading}/>
    <Stack spacing={1}><GroupSelector groups={realGroups} value={groupId} onChange={value=>{setGroupId(value);setSaved(false)}} disabled={busy||editLoading||draftLoading}/><Button disabled={busy||draftLoading} onClick={()=>setManageGroups(true)}>Create a group</Button></Stack>
    <TranscriptDurationField value={duration} onChange={value=>{setDuration(value);setSaved(false)}} format={durationFormat} onFormat={value=>{setDurationFormat(value);setSaved(false)}} required={checked?.ok===false&&checked.needsDuration} error={durationError} disabled={busy||draftLoading}/>

   </Box>
   {edit&&<>{editLoading?<Typography role="status">Loading transcript JSON...</Typography>:<><Box component="fieldset" disabled={busy||draftLoading} sx={{border:0,p:0,m:0,minWidth:0}}><TranscriptJsonField value={transcriptJson} onChange={value=>{setTranscriptJson(value);setSaved(false)}} /></Box><Stack direction="row" spacing={1}><Button disabled={busy||!editVersion} onClick={formatJson}>Format JSON</Button><Button disabled={busy||downloadBusy||!editVersion} onClick={()=>void download()}>{downloadBusy?'Downloading...':'Download JSON'}</Button></Stack></>}{saved&&<Alert severity="success">Saved</Alert>}{enrichment&&<><Typography>Optional enrichment: {enrichment}</Typography><Button disabled={busy} onClick={()=>void retryAdminManualEnrichment(edit.id).then(result=>{if(result.ok){setEnrichment(result.status);setSuccess(`Transcript saved; enrichment ${result.status}.`)}else setFormError(result.error)})}>Retry enrichment</Button>{enrichmentDiagnostics&&enrichmentDiagnostics!=='[]'&&<Box component="pre" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{enrichmentDiagnostics}</Box>}<Button disabled={busy} onClick={()=>void loadAdminManualEnrichment(edit.id).then(details=>{if(!details?.originalJson){setFormError('Original source snapshot is unavailable for this legacy transcript.');return}const href=URL.createObjectURL(new Blob([details.originalJson],{type:'application/json'}));const a=document.createElement('a');a.href=href;a.download='original-transcript.json';a.click();URL.revokeObjectURL(href)}).catch(e=>setFormError(e.message))}>Download original source</Button></>}</>}
   {!edit&&<><Box component="fieldset" disabled={busy||draftLoading} sx={{border:0,p:0,m:0,minWidth:0}}><TranscriptJsonField value={transcriptJson} onChange={setTranscriptJson} /></Box>
    {transcriptJson.trim()&&!durationError&&!checked&&<Typography role="status">Checking transcript timing...</Typography>}
    {checked?.ok===false&&!durationError&&<Alert severity={checked.needsDuration||checked.error.includes('duplicate timestamp')?'warning':'error'} sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{checked.error}</Alert>}
    {checked?.ok&&<Alert severity="success">{checked.segments} {checked.segments===1?'segment':'segments'} ready to import.{checked.durationSource==='youtube'?' Using the actual YouTube video duration.':checked.durationSource==='saved-video'?' Using the saved video duration.':''}</Alert>}
   </>}

   <FormControlLabel control={<Checkbox checked={searchable} disabled={busy||draftLoading} onChange={e=>{setSearchable(e.target.checked);setSaved(false)}}/>} label="Publish to the shared searchable transcript library"/>
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>{++editRequest.current;setOpen(false)}}>{edit?'Close':'Cancel'}</Button>{!edit&&!resuming&&<Button disabled={busy||draftLoading} onClick={()=>void saveDraft()}>{draftSaving?'Saving draft...':'Save draft'}</Button>}<Button disabled={busy||Boolean(durationError)||editLoading||draftLoading||Boolean(edit&&!editVersion)||!edit&&!ready} variant="contained" onClick={()=>void save()}>{busy?(draftSaving?'Saving draft...':edit?'Saving…':'Importing...'):edit?(saved?'Saved':'Save Changes'):'Import'}</Button></DialogActions></Dialog>
  {manageGroups&&<GroupManager open={manageGroups} groups={realGroups} onClose={()=>setManageGroups(false)} onSaved={async(id,created)=>{cache.invalidate('transcripts:');const result=await listAdminTranscripts(0,titleSearch,groupFilter);setGroups(result.groups??[]);setUngrouped(result.ungrouped??0);if(created&&open){setGroupId(id);setSaved(false)}if(groupFilter!=='ungrouped'&&groupFilter&&!result.groups?.some(group=>group.id===groupFilter)){setGroupFilter('');setPage(0)}if(groupId&&!result.groups?.some(group=>group.id===groupId))setGroupId('');reload()}}/>}
  <Dialog open={Boolean(deleting)} onClose={()=>{if(!deleteBusy)setDeleting(null)}} aria-labelledby="delete-transcript-title" fullWidth maxWidth="sm"><DialogTitle id="delete-transcript-title">{deleting?.draft_id?'Delete draft?':'Delete transcript?'}</DialogTitle><DialogContent><Stack spacing={2}><Typography sx={{fontWeight:600}}>{deleting?.title}</Typography><Typography>{deleting?.draft_id?'This will permanently remove the saved form draft.':'This will permanently remove this transcript and its owned segments, search data, and generation records.'}</Typography>{deleteError&&<Alert severity="error">{deleteError}</Alert>}</Stack></DialogContent><DialogActions><Button disabled={deleteBusy} onClick={()=>setDeleting(null)}>Cancel</Button><Button color="error" variant="contained" disabled={deleteBusy} onClick={()=>void remove()}>{deleteBusy?'Deleting...':'Delete'}</Button></DialogActions></Dialog>
 </Stack>
}
