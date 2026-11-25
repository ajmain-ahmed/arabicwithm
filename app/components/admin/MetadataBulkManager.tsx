'use client'
import {useState,useSyncExternalStore} from 'react'
import {Alert,Box,Button,Stack,TextField,Typography} from '@mui/material'
import {exportAdminMetadata,importAdminMetadataDrafts,previewAdminMetadataImport} from '@/app/actions/localisationBulk'
import {bulkEntities,parseBulkFile,type BulkFile,type BulkResult} from '@/app/lib/localisation/bulk'
import LocalisationEditor from './LocalisationEditor'
import {useVerifiedAccountAccess} from '@/app/AccountAccessContext'

const subscribeHydration=()=>()=>{}
export default function MetadataBulkManager(){
 const mounted=useSyncExternalStore(subscribeHydration,()=>true,()=>false),{loading:accessLoading}=useVerifiedAccountAccess()
 // Await the existing initial account response before accepting form input.
 // Server guardAdmin remains the authorization boundary on every operation.
 const hydrated=mounted&&!accessLoading
 const [entity,setEntity]=useState<BulkFile['entity']>('book'),[cursor,setCursor]=useState<string>(),[finished,setFinished]=useState(false)
 const [text,setText]=useState(''),[results,setResults]=useState<BulkResult[]|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const [review,setReview]=useState<{entity:BulkFile['entity'];id:string}|null>(null)
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work()}catch(e){setError(e instanceof Error?e.message:'Unable to process batch. Retry available.')}finally{setBusy(false)}}
 async function download(){const batch=await exportAdminMetadata({entity,after:cursor});const blob=new Blob([JSON.stringify(batch.file,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`awm-ar-${entity}-${cursor??'start'}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setCursor(batch.next??undefined);setFinished(!batch.next);setMessage(`Scanned ${batch.scanned} records; ${batch.file.rows.length} pending fields exported; ${batch.protectedFields} existing fields preserved; ${batch.conflicts} stale translations need manual review.`)}
 const ready=results?.filter(row=>row.result==='ready').length??0
 return <Box dir="ltr" lang="en"><Typography variant="h4" component="h1">Arabic metadata translations</Typography><Alert severity="info" sx={{my:2}}>£0 translation provider cost. Automatic APIs and paid fallbacks are disabled. Export missing metadata, fill only the Arabic values using your own free/offline workflow, then preview and import drafts. Manual review and approval remain available in each content editor.</Alert>
 {error&&<Alert severity="error" role="alert">{error}</Alert>}{message&&<Alert severity="info">{message}</Alert>}
 <Stack spacing={2} sx={{my:3,maxWidth:900}}><label htmlFor="awm-metadata-entity">Content type</label><select id="awm-metadata-entity" value={entity} disabled={busy||!hydrated} onChange={e=>{setEntity(e.target.value as BulkFile['entity']);setCursor(undefined);setFinished(false)}} style={{padding:12,fontFamily:'inherit',fontSize:'inherit',color:'var(--awm-bark)',background:'var(--awm-white)',border:'1px solid var(--awm-gold)',borderRadius:10}}>{bulkEntities.map(item=><option key={item} value={item}>{item}</option>)}</select><Stack direction="row" spacing={1}><Button data-export-entity={entity} disabled={busy||!hydrated||finished} onClick={()=>void run(download)}>Export {cursor?'next':'first'} batch (up to 50 records)</Button><Button disabled={busy||!hydrated} onClick={()=>{setCursor(undefined);setFinished(false)}}>Restart export</Button></Stack>
 <Typography>Keep format, entity, IDs, fields, source and sourceHash unchanged. Fill arabic only. Blank Arabic values stay pending. Existing drafts, approved translations and authored Arabic are never replaced by bulk import. Import batches contain at most 100 fields / 1 MB.</Typography>
 <Button component="label" disabled={busy||!hydrated}>Load completed JSON<input hidden type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];if(!file)return;setResults(null);if(file.size>1_000_000){setError('Import exceeds 1 MB.');return}void run(async()=>{setText(await file.text())});e.target.value=''}}/></Button>
 <TextField label="Translation JSON" multiline minRows={8} value={text} onChange={e=>{setText(e.target.value);setResults(null)}} disabled={busy||!hydrated}/><Stack direction="row" spacing={1}><Button disabled={busy||!hydrated||!text} onClick={()=>void run(async()=>setResults(await previewAdminMetadataImport(text)))}>Preview import</Button><Button disabled={busy||!hydrated||!ready} onClick={()=>void run(async()=>{setResults(await importAdminMetadataDrafts(text));setMessage('Import finished. New translations are drafts; review before approving.')})}>Import {ready} new drafts</Button></Stack>
 {results&&<Box sx={{overflowX:'auto'}}><table><thead><tr><th>Record</th><th>Field</th><th>Result</th><th>Review</th></tr></thead><tbody>{results.map(row=><tr key={`${row.id}:${row.field}`}><td>{row.id}</td><td>{row.field}</td><td>{row.result}</td><td><Button onClick={()=>setReview({entity:parseBulkFile(text).entity,id:row.id})}>Edit / approve</Button></td></tr>)}</tbody></table></Box>}
 {review&&<LocalisationEditor key={`${review.entity}:${review.id}`} {...review}/>}
 </Stack></Box>
}
