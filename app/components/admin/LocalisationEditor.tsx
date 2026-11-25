'use client'
import {useEffect,useState} from 'react'
import {Alert,Box,Button,Stack,TextField,Typography} from '@mui/material'
import {fetchAdminLocalisations,saveAdminLocalisation} from '@/app/actions/localisations'
import Link from 'next/link'
import type {MetadataEntity} from '@/app/lib/localisation/metadata.server'
type Loaded=Awaited<ReturnType<typeof fetchAdminLocalisations>>
export default function LocalisationEditor({entity,id}:{entity:MetadataEntity;id:string}){
 const [data,setData]=useState<Loaded|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[drafts,setDrafts]=useState<Record<string,string>>({})
 const load=async()=>{const result=await fetchAdminLocalisations({entity,id});setData(result);setDrafts(Object.fromEntries(result.translations.map(row=>[row.field,row.value])))}
 useEffect(()=>{let active=true;fetchAdminLocalisations({entity,id}).then(result=>{if(active){setData(result);setDrafts(Object.fromEntries(result.translations.map(row=>[row.field,row.value])))}}).catch(()=>{if(active)setError('Unable to load Arabic metadata. Retry after saving the content.')});return()=>{active=false}},[entity,id])
 const run=async(work:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError('');try{await work();await load()}catch(e){setError(e instanceof Error?e.message:'Unable to save translation.')}finally{setBusy(false)}}
 return <Box dir="ltr" lang="en" sx={{mt:2}}><Typography variant="h6">Arabic metadata</Typography>{error&&<Alert severity="warning">{error}</Alert>}
 <Alert severity="info">Automatic APIs are disabled for £0 cost. Edit Arabic here or <Link href="/admin/translations">export/import missing metadata</Link>.</Alert>
 {!data&&!error&&<Typography>Loading translations…</Typography>}
 {data&&(['title','description'] as const).map(field=>{
  const original=field==='title'?data.source.title:data.source.description;if(!original)return null
  const current=data.translations.find(row=>row.field===field)
  if(field==='title'&&data.source.titleAr)return <Alert key={field} severity="info">Authored Arabic title: <span dir="rtl" lang="ar">{data.source.titleAr}</span>. Edit it in the existing Arabic title field.</Alert>
  return <Stack key={field} spacing={1} sx={{my:2}}><Typography>{field==='title'?'English / original title':'English / original description'}: {original}</Typography><Typography>Status: {current?.source_hash!==undefined&&current.source_hash!==data.sourceHashes[field]?'Source changed — review required':current?.status==='approved'?'Translated':current?'Draft — awaiting review':'Pending'}</Typography><TextField label={`Arabic ${field}`} value={drafts[field]??''} onChange={event=>setDrafts(value=>({...value,[field]:event.target.value}))} multiline minRows={field==='description'?3:1} slotProps={{htmlInput:{dir:'rtl',lang:'ar'}}}/><Stack direction="row" spacing={1}>{[false,true].map(approve=><Button key={String(approve)} disabled={busy||!drafts[field]?.trim()} onClick={()=>void run(()=>saveAdminLocalisation({entity,id,field,arabic:drafts[field],approve,expectedSourceHash:data.sourceHashes[field],expectedUpdatedAt:current?.updated_at??null}))}>{approve?'Approve Arabic translation':'Save draft'}</Button>)}</Stack></Stack>
 })}</Box>
}
