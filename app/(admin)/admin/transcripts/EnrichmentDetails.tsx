'use client'

import {useRef,useState} from 'react'
import {Alert,Box,Button,Stack,Typography} from '@mui/material'
import {loadAdminManualEnrichment,retryAdminManualEnrichment} from '@/app/actions/transcripts'

type Details=Awaited<ReturnType<typeof loadAdminManualEnrichment>>

/** Optional diagnostics never block loading or saving the transcript editor. */
export default function EnrichmentDetails({id}:{id:string}){
 const [details,setDetails]=useState<Details>(null),[loading,setLoading]=useState(false),[retrying,setRetrying]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const loaded=useRef(false),working=useRef(false)
 async function load(){
  if(loaded.current||working.current)return
  working.current=true;setLoading(true);setError('')
  try{setDetails(await loadAdminManualEnrichment(id));loaded.current=true}
  catch{setError('Could not load enrichment details. Please try again.')}
  finally{working.current=false;setLoading(false)}
 }
 async function retry(){
  if(working.current)return
  working.current=true;setRetrying(true);setError('');setMessage('')
  try{
   const result=await retryAdminManualEnrichment(id)
   if(!result.ok){setError(result.error);return}
   setDetails(current=>current?{...current,status:result.status}:current)
   setMessage(result.status==='ready'?'Enrichment completed.':`Retry completed; optional enrichment remains ${result.status}. Imported transcript content is retained.`)
   try{setDetails(await loadAdminManualEnrichment(id));loaded.current=true}
   catch{setError('Retry completed, but details could not refresh. Reopen this transcript to reload them.')}
  }catch{setError('Enrichment retry failed. Please try again.')}
  finally{working.current=false;setRetrying(false)}
 }
 function downloadOriginal(){
  if(!details?.originalJson)return
  const href=URL.createObjectURL(new Blob([details.originalJson],{type:'application/json;charset=utf-8'}))
  const anchor=document.createElement('a');anchor.href=href;anchor.download='original-transcript.json';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),1000)
 }
 return <Box component="details" onToggle={event=>{if(event.currentTarget.open)void load()}} sx={{minWidth:0}}>
  <Box component="summary" sx={{cursor:'pointer',py:1}}>Enrichment Details</Box>
  <Stack spacing={1} sx={{pt:1}}>
   <Typography variant="body2" color="text.secondary">Optional processing status is separate from the imported transcript and its token data.</Typography>
   {loading&&<Typography role="status">Loading enrichment details…</Typography>}
   {error&&<Alert severity="error">{error}</Alert>}{message&&<Alert severity="info">{message}</Alert>}
   {!loading&&loaded.current&&<Typography>Optional enrichment: {details?.status??'No recorded status'}</Typography>}
   {details?.diagnostics&&JSON.stringify(details.diagnostics)!=='[]'&&<Box component="details"><Box component="summary" sx={{cursor:'pointer'}}>View token details</Box><Box component="pre" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:320,overflow:'auto',fontSize:12}}>{JSON.stringify(details.diagnostics,null,2)}</Box></Box>}
   <Stack direction={{xs:'column',sm:'row'}} spacing={1}>
    <Button disabled={loading||retrying} onClick={()=>void retry()}>{retrying?'Retrying…':'Retry Enrichment'}</Button>
    {!loaded.current&&!loading&&<Button onClick={()=>void load()}>Reload details</Button>}
    {details?.originalJson&&<Button disabled={retrying} onClick={downloadOriginal}>Download original source</Button>}
   </Stack>
  </Stack>
 </Box>
}
