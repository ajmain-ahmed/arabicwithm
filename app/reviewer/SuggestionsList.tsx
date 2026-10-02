'use client'
import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { editSuggestion, listSuggestions, reviewCatalogue, reviewSuggestion } from '@/app/actions/reviews'
import type { ContentSuggestion, ReviewType, SuggestionInput, SuggestionStatus } from '@/app/lib/reviews'
import type { Json } from '@/app/lib/supabase/database.types'
import { DownloadOutlined, PictureAsPdfOutlined, TableViewOutlined } from '@mui/icons-material'
import ChapterNavigator from '@/app/reviewer/ChapterNavigator'
import ReviewActionButton from '@/app/reviewer/ReviewActionButton'
import { reviewUnitLabel, type ReviewCatalogueItem } from '@/app/lib/reviewLabels'
import { useContentPageTop } from '@/app/lib/useContentPageTop'

const blank: SuggestionInput={arabic:'',english:'',comment:'',reason:''}
export default function SuggestionsList({admin,scopeRequired=false}:{admin:boolean;scopeRequired?:boolean}){
 const [status,setStatus]=useState<SuggestionStatus>('pending'),[type,setType]=useState<ReviewType|''>(scopeRequired?'book':''),[author,setAuthor]=useState(''),[authorFilter,setAuthorFilter]=useState('')
 const [parent,setParent]=useState(''),[target,setTarget]=useState(''),[since,setSince]=useState(''),[until,setUntil]=useState('')
 const [parents,setParents]=useState<ReviewCatalogueItem[]>([]),[targets,setTargets]=useState<ReviewCatalogueItem[]>([])
 const [page,setPage]=useState(0),[revision,setRevision]=useState(0),[rows,setRows]=useState<(ContentSuggestion & {author_name?:string;unit_label?:string})[]>([]),[total,setTotal]=useState(0),[loadedKey,setLoadedKey]=useState('')
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState<ContentSuggestion|null>(null),[input,setInput]=useState(blank)
 const [response,setResponse]=useState(''),[tokens,setTokens]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState<Json|undefined>()
 const [download,setDownload]=useState('')
 const [loadFailure,setLoadFailure]=useState(false)
 const needsScope=scopeRequired&&!parent
 const key=JSON.stringify([admin,status,type,authorFilter,parent,target,since,until,page,revision])
 const contentTop=useContentPageTop(key,loadedKey===key&&!loadFailure&&!needsScope)
 const actionInFlight=useRef(false)
 useEffect(()=>{let active=true;if(needsScope)return;listSuggestions(admin,{status,type:type||undefined,author:authorFilter||undefined,parent:parent||undefined,target:target||undefined,since:since?new Date(`${since}T00:00:00Z`).toISOString():undefined,until:until?new Date(`${until}T23:59:59.999Z`).toISOString():undefined},page).then(x=>{if(active){setRows(x.suggestions);setTotal(x.total);setLoadFailure(false);setLoadedKey(key);setError('')}}).catch(e=>{if(active){setRows([]);setTotal(0);setLoadFailure(true);setError(e.message);setLoadedKey(key)}});return()=>{active=false}},[admin,status,type,authorFilter,parent,target,since,until,page,revision,key,needsScope])
 useEffect(()=>{let active=true;if(type)reviewCatalogue(type).then(x=>{if(active)setParents(x)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[type])
 useEffect(()=>{let active=true;if(type&&parent)reviewCatalogue(type,parent).then(x=>{if(active)setTargets(x)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[type,parent])
 const open=(s:ContentSuggestion)=>{setSelected(s);setInput({arabic:s.suggested_arabic??'',english:s.suggested_english??'',comment:s.comment,reason:s.reason});setResponse(s.admin_response??'');setTokens(JSON.stringify((s.original_block as {tokens?:Json})?.tokens??[],null,2));setConflict(undefined);setError('');setNotice('')}
 const exportFile=async(format:'csv'|'pdf'|'json')=>{
  if(!type||!parent)return
  setDownload(format);setError('')
  try{
   const query=new URLSearchParams({format,type,parent})
   if(target)query.set('target',target)
   if(format!=='json'){
    query.set('status',status)
    if(authorFilter)query.set('author',authorFilter)
    if(since)query.set('since',new Date(`${since}T00:00:00Z`).toISOString())
    if(until)query.set('until',new Date(`${until}T23:59:59.999Z`).toISOString())
   }
   const response=await fetch('/api/reviewer/export?'+query,{cache:'no-store'})
   if(!response.ok){const data=await response.json();throw new Error(data.error??'Download failed')}
   const file=await response.blob(),url=URL.createObjectURL(file),link=document.createElement('a')
   const encoded=response.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''([^;]+)/)?.[1]
   link.href=url;link.download=encoded?decodeURIComponent(encoded):`awm-export.${format}`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
   setNotice('Download ready.')
  }catch(e){setError(e instanceof Error?e.message:'Unable to download')}finally{setDownload('')}
 }
 const act=async(action:'save'|'withdraw'|'accept'|'reject'|'reply')=>{
  if(!selected||actionInFlight.current)return;actionInFlight.current=true;setBusy(true);setError('')
  try{
   if(action==='save'||action==='withdraw')await editSuggestion(selected.id,action==='withdraw',input)
   else { const replacement=action==='accept'&&selected.suggested_arabic&&selected.suggested_arabic!==selected.original_arabic?JSON.parse(tokens):null; const result=await reviewSuggestion(selected.id,action,response,replacement);if(!result.ok){setConflict(result.current??null);setError(result.message??'Source changed');return} }
   setSelected(null);setRevision(x=>x+1);setNotice(action==='withdraw'?'Suggestion withdrawn and retained in history.':action==='accept'?'Suggestion accepted.':action==='reject'?'Suggestion rejected.':'Saved.')
  }catch(e){setError(e instanceof Error?e.message:'Unable to save')}finally{actionInFlight.current=false;setBusy(false)}
 }
 return <Stack spacing={2}>
  <Tabs value={status} variant="scrollable" onChange={(_,v)=>{setStatus(v);setPage(0)}}>{(['pending','accepted','rejected','withdrawn'] as const).map(s=><Tab value={s} key={s} label={s}/>)}</Tabs>
  {admin&&<Stack spacing={2}>
   <TextField select label="Content type" value={type} onChange={e=>{setType(e.target.value as ReviewType|'');setParent('');setTarget('');setPage(0);setParents([]);setTargets([])}}><MenuItem value="">All content</MenuItem><MenuItem value="book">Books</MenuItem><MenuItem value="show">Shows</MenuItem></TextField>
   {type&&<TextField select label={type==='book'?'Book':'Show'} value={parent} onChange={e=>{setParent(e.target.value);setTarget('');setPage(0);setTargets([])}}><MenuItem value="">All</MenuItem>{parents.map(x=><MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}</TextField>}
   {parent&&<ChapterNavigator units={targets} value={target} label={type==='book'?'Chapter':'Episode'} emptyLabel="All" onChange={id=>{setTarget(id);setPage(0);contentTop.requestScroll()}}/>}
   <Stack direction={{xs:'column',sm:'row'}} spacing={1}><TextField label="Editor account ID" value={author} onChange={e=>setAuthor(e.target.value)} fullWidth/><Button onClick={()=>{setAuthorFilter(author.trim());setPage(0)}}>Filter editor</Button></Stack>
   <Stack direction={{xs:'column',sm:'row'}} spacing={2}><TextField type="date" label="From" slotProps={{inputLabel:{shrink:true}}} value={since} onChange={e=>{setSince(e.target.value);setPage(0)}}/><TextField type="date" label="Through" slotProps={{inputLabel:{shrink:true}}} value={until} onChange={e=>{setUntil(e.target.value);setPage(0)}}/></Stack>
   {type&&parent&&<Card variant="outlined"><CardContent><Stack spacing={1}>
    <Typography variant="h6">{parents.find(p=>p.id===parent)?.title??'Selected content'}{target?` → ${targets.find(t=>t.id===target)?reviewUnitLabel(targets.find(t=>t.id===target)!):'Selected unit'}`:' · All chapters / episodes'}</Typography>
    <Typography variant="body2">Suggestion exports include all matching {status} suggestions across pages. Source JSON contains the current saved content and metadata; the original upload file is not archived.</Typography>
    <Stack direction={{xs:'column',sm:'row'}} spacing={1}><ReviewActionButton startIcon={<TableViewOutlined/>} disabled={Boolean(download)} loading={download==='csv'} onClick={()=>exportFile('csv')}>Export Suggestions · CSV</ReviewActionButton><ReviewActionButton startIcon={<PictureAsPdfOutlined/>} disabled={Boolean(download)} loading={download==='pdf'} onClick={()=>exportFile('pdf')}>Export Suggestions · PDF</ReviewActionButton><ReviewActionButton startIcon={<DownloadOutlined/>} disabled={Boolean(download)} loading={download==='json'} onClick={()=>exportFile('json')}>Download Source · JSON</ReviewActionButton></Stack>
    {download&&<Typography role="status">Preparing {download.toUpperCase()}…</Typography>}
   </Stack></CardContent></Card>}
  </Stack>}
  {error&&<Alert severity="error" action={<Button onClick={()=>setRevision(x=>x+1)}>Retry</Button>}>{error}</Alert>}{notice&&<Alert severity="success">{notice}</Alert>}
  <Box ref={contentTop.ref}><Typography>{needsScope?'Choose a book or show to manage its suggestions.':loadedKey!==key?'Loading suggestions…':loadFailure?'Suggestions could not be loaded.':`${total} suggestions`}</Typography></Box>
  {!needsScope&&loadedKey===key&&rows.map(s=><Card key={s.id} variant="outlined"><CardContent><Stack spacing={1}>
   <Typography sx={{fontWeight:700}}>{s.location}{s.unit_label?` · ${s.unit_label}`:''} · Line {s.line_index+1}</Typography><Chip label={s.status} size="small" sx={{alignSelf:'start'}}/>
   {admin&&<Typography variant="caption" sx={{overflowWrap:'anywhere'}}>Editor: {s.author_name??s.author_id} · {s.author_id}</Typography>}
   <Typography dir="rtl">{s.original_arabic}</Typography><Typography>{s.original_english}</Typography>
   {s.suggested_arabic&&<Typography dir="rtl">Proposed: {s.suggested_arabic}</Typography>}{s.suggested_english&&<Typography>Proposed: {s.suggested_english}</Typography>}
   <Typography>{s.comment}</Typography><Typography>{s.reason}</Typography><Typography variant="caption">{new Date(s.created_at).toLocaleString('en-GB')}</Typography>
   {s.admin_response&&<Typography>Admin response: {s.admin_response}</Typography>}
   <Button sx={{alignSelf:'start'}} onClick={()=>open(s)}>{admin?'Review / Reply':s.status==='pending'?'Edit / Withdraw':'View details'}</Button>
  </Stack></CardContent></Card>)}
  {!needsScope&&!error&&loadedKey===key&&total===0&&<Typography>No suggestions match these filters.</Typography>}
  <Stack direction="row" spacing={2}><Button disabled={!page||loadedKey!==key} onClick={()=>{setPage(x=>x-1);contentTop.requestScroll()}}>Previous</Button><Typography>Page {page+1}</Typography><Button disabled={(page+1)*25>=total||loadedKey!==key} onClick={()=>{setPage(x=>x+1);contentTop.requestScroll()}}>Next</Button></Stack>
  <Dialog open={Boolean(selected)} onClose={()=>!busy&&setSelected(null)} maxWidth="md" fullWidth><DialogTitle>{selected?.location} · Line {(selected?.line_index??0)+1}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   {error&&<Alert severity="error">{error}</Alert>}
   <Typography>Original Arabic</Typography><Typography dir="rtl">{selected?.original_arabic}</Typography><Typography>Original English</Typography><Typography>{selected?.original_english}</Typography>
   {admin?<>
    <Typography dir="rtl">Proposed Arabic: {selected?.suggested_arabic??'Unchanged'}</Typography><Typography>Proposed English: {selected?.suggested_english??'Unchanged'}</Typography><Typography>Comment: {selected?.comment}<br/>Reason: {selected?.reason}</Typography>
    {conflict!==undefined&&<><Alert severity="warning">SOURCE CHANGED — acceptance is blocked. Request a new suggestion against the current source.</Alert><Typography>Current canonical block</Typography><Box component="pre" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(conflict,null,2)}</Box></>}
    {selected?.suggested_arabic&&selected.suggested_arabic!==selected.original_arabic&&selected.status==='pending'&&<><Alert severity="info">Review annotated replacement tokens before accepting Arabic changes. Preserve dictionary matches; each token needs Arabic, POS and lowercase CEFR. The joined Arabic must match the proposal.</Alert><TextField label="Annotated replacement tokens (JSON array)" multiline minRows={8} value={tokens} onChange={e=>setTokens(e.target.value)}/></>}
    <TextField label="Admin response" multiline value={response} onChange={e=>setResponse(e.target.value)}/>
   </>:<>
    {(['arabic','english','comment','reason'] as const).map(f=><TextField key={f} label={{arabic:'Suggested Arabic',english:'Suggested English',comment:'Comment',reason:'Reason'}[f]} multiline value={input[f]} disabled={selected?.status!=='pending'} onChange={e=>setInput(x=>({...x,[f]:e.target.value}))}/>) }
    {selected?.admin_response&&<Typography>Admin response: {selected.admin_response}</Typography>}
   </>}
   {selected?.reviewed_at&&<Typography variant="caption">Reviewed: {new Date(selected.reviewed_at).toLocaleString('en-GB')} · {selected.reviewed_by}</Typography>}
  </Stack></DialogContent><DialogActions sx={{flexWrap:'wrap'}}><Button disabled={busy} onClick={()=>setSelected(null)}>Close</Button>
   {admin?<><ReviewActionButton disabled={busy} onClick={()=>act('reply')}>Save Reply</ReviewActionButton>{selected?.status==='pending'&&<><ReviewActionButton color="error" disabled={busy} onClick={()=>act('reject')}>Reject</ReviewActionButton><ReviewActionButton variant="contained" disabled={busy||conflict!==undefined} onClick={()=>act('accept')}>Accept</ReviewActionButton></>}</>:selected?.status==='pending'&&<><Button disabled={busy} onClick={()=>act('withdraw')}>Confirm Withdraw</Button><Button disabled={busy||![input.arabic,input.english,input.comment].some(x=>x.trim())} onClick={()=>act('save')}>Save changes</Button></>}
  </DialogActions></Dialog>
 </Stack>
}

