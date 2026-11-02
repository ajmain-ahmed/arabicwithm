'use client'
import {useRef,useState} from 'react'
import {Alert,Button,Dialog,DialogActions,DialogContent,DialogTitle,Typography} from '@mui/material'
import {retryAdminGeminiEnrichment,type TranscriptRow} from '@/app/actions/transcripts'

export default function GeminiEnrichmentRetry({row,onQueued}:{row:TranscriptRow;onQueued:()=>void}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const working=useRef(false)
 if(!row.enrichment_retry_kind)return null
 async function retry(){
  if(working.current)return
  working.current=true;setBusy(true);setError('')
  try{const result=await retryAdminGeminiEnrichment(row.id,row.updated_at,true);if(!result.ok){setError(result.error);return}setOpen(false);onQueued()}
  catch{setError('The request was interrupted. Refresh to check its status before retrying.')}
  finally{working.current=false;setBusy(false)}
 }
 return <><Button onClick={()=>{setError('');setOpen(true)}}>Retry Enrichment</Button>
  <Dialog open={open} onClose={()=>{if(!busy)setOpen(false)}} maxWidth="sm" fullWidth>
   <DialogTitle>Retry Enrichment</DialogTitle>
   <DialogContent>
    <Typography sx={{mb:2}}>{row.enrichment_retry_kind==='legacy'?'The transcript was generated successfully, but its enrichment request timed out before a recoverable interaction ID was saved.':'The previous enrichment interaction has ended.'}</Typography>
    <Typography sx={{mb:2}}>The raw transcript is safe. Completed enrichment batches will be kept.</Typography>
    <Alert severity="warning">Retrying will run only the enrichment step and may incur a new Gemini enrichment charge.</Alert>
    {error&&<Alert severity="error" sx={{mt:2}}>{error}</Alert>}
   </DialogContent>
   <DialogActions><Button disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={()=>void retry()}>{busy?'Queuing...':'Confirm paid enrichment retry'}</Button></DialogActions>
  </Dialog>
 </>
}
