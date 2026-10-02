'use client'
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { editSuggestion, listSuggestions, reviewCatalogue, reviewSuggestion } from '@/app/actions/reviews'
import type { ContentSuggestion, ReviewType, SuggestionInput, SuggestionStatus } from '@/app/lib/reviews'
import type { Json } from '@/app/lib/supabase/database.types'

const blank: SuggestionInput={arabic:'',english:'',comment:'',reason:''}
export default function SuggestionsList({admin}:{admin:boolean}){
 const [status,setStatus]=useState<SuggestionStatus>('pending'),[type,setType]=useState<ReviewType|''>(''),[author,setAuthor]=useState(''),[authorFilter,setAuthorFilter]=useState('')
 const [parent,setParent]=useState(''),[target,setTarget]=useState(''),[since,setSince]=useState(''),[until,setUntil]=useState('')
 const [parents,setParents]=useState<{id:string;title:string}[]>([]),[targets,setTargets]=useState<{id:string;title:string}[]>([])
 const [page,setPage]=useState(0),[revision,setRevision]=useState(0),[rows,setRows]=useState<(ContentSuggestion & {author_name?:string})[]>([]),[total,setTotal]=useState(0),[loadedKey,setLoadedKey]=useState('')
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState<ContentSuggestion|null>(null),[input,setInput]=useState(blank)
 const [response,setResponse]=useState(''),[tokens,setTokens]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState<Json|undefined>()
 const key=JSON.stringify([admin,status,type,authorFilter,parent,target,since,until,page,revision])
 useEffect(()=>{let active=true;listSuggestions(admin,{status,type:type||undefined,author:authorFilter||undefined,parent:parent||undefined,target:target||undefined,since:since?new Date(`${since}T00:00:00Z`).toISOString():undefined,until:until?new Date(`${until}T23:59:59.999Z`).toISOString():undefined},page).then(x=>{if(active){setRows(x.suggestions);setTotal(x.total);setLoadedKey(key);setError('')}}).catch(e=>{if(active){setError(e.message);setLoadedKey(key)}});return()=>{active=false}},[admin,status,type,authorFilter,parent,target,since,until,page,revision,key])
 useEffect(()=>{let active=true;if(type)reviewCatalogue(type).then(x=>{if(active)setParents(x)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[type])
 useEffect(()=>{let active=true;if(type&&parent)reviewCatalogue(type,parent).then(x=>{if(active)setTargets(x)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[type,parent])
 const open=(s:ContentSuggestion)=>{setSelected(s);setInput({arabic:s.suggested_arabic??'',english:s.suggested_english??'',comment:s.comment,reason:s.reason});setResponse(s.admin_response??'');setTokens(JSON.stringify((s.original_block as {tokens?:Json})?.tokens??[],null,2));setConflict(undefined);setError('');setNotice('')}
 const act=async(action:'save'|'withdraw'|'accept'|'reject'|'reply')=>{
  if(!selected)return;setBusy(true);setError('')
  try{
   if(action==='save'||action==='withdraw')await editSuggestion(selected.id,action==='withdraw',input)
   else { const replacement=action==='accept'&&selected.suggested_arabic&&selected.suggested_arabic!==selected.original_arabic?JSON.parse(tokens):null; const result=await reviewSuggestion(selected.id,action,response,replacement);if(!result.ok){setConflict(result.current??null);setError(result.message??'Source changed');return} }
   setSelected(null);setRevision(x=>x+1);setNotice(action==='withdraw'?'Suggestion withdrawn and retained in history.':'Saved.')
  }catch(e){setError(e instanceof Error?e.message:'Unable to save')}finally{setBusy(false)}
 }
 return <Stack spacing={2}>
  <Tabs value={status} variant="scrollable" onChange={(_,v)=>{setStatus(v);setPage(0)}}>{(['pending','accepted','rejected','withdrawn'] as const).map(s=><Tab value={s} key={s} label={s}/>)}</Tabs>
  {admin&&<Stack spacing={2}>
   <TextField select label="Content type" value={type} onChange={e=>{setType(e.target.value as ReviewType|'');setParent('');setTarget('');setPage(0);setParents([]);setTargets([])}}><MenuItem value="">All content</MenuItem><MenuItem value="book">Books</MenuItem><MenuItem value="show">Shows</MenuItem></TextField>
   {type&&<TextField select label={type==='book'?'Book':'Show'} value={parent} onChange={e=>{setParent(e.target.value);setTarget('');setPage(0);setTargets([])}}><MenuItem value="">All</MenuItem>{parents.map(x=><MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}</TextField>}
   {parent&&<TextField select label={type==='book'?'Chapter':'Episode'} value={target} onChange={e=>{setTarget(e.target.value);setPage(0)}}><MenuItem value="">All</MenuItem>{targets.map(x=><MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}</TextField>}
   <Stack direction={{xs:'column',sm:'row'}} spacing={1}><TextField label="Editor account ID" value={author} onChange={e=>setAuthor(e.target.value)} fullWidth/><Button onClick={()=>{setAuthorFilter(author.trim());setPage(0)}}>Filter editor</Button></Stack>
   <Stack direction="row" spacing={2}><TextField type="date" label="From" slotProps={{inputLabel:{shrink:true}}} value={since} onChange={e=>{setSince(e.target.value);setPage(0)}}/><TextField type="date" label="Through" slotProps={{inputLabel:{shrink:true}}} value={until} onChange={e=>{setUntil(e.target.value);setPage(0)}}/></Stack>
  </Stack>}
  {error&&<Alert severity="error">{error}</Alert>}{notice&&<Alert severity="success">{notice}</Alert>}
  <Typography>{loadedKey===key?`${total} suggestions`:'Loading suggestions…'}</Typography>
  {loadedKey===key&&rows.map(s=><Card key={s.id} variant="outlined"><CardContent><Stack spacing={1}>
   <Typography sx={{fontWeight:700}}>{s.location} · Line {s.line_index+1}</Typography><Chip label={s.status} size="small" sx={{alignSelf:'start'}}/>
   {admin&&<Typography variant="caption" sx={{overflowWrap:'anywhere'}}>Editor: {s.author_name??s.author_id} · {s.author_id}</Typography>}
   <Typography dir="rtl">{s.original_arabic}</Typography><Typography>{s.original_english}</Typography>
   {s.suggested_arabic&&<Typography dir="rtl">Proposed: {s.suggested_arabic}</Typography>}{s.suggested_english&&<Typography>Proposed: {s.suggested_english}</Typography>}
   <Typography>{s.comment}</Typography><Typography>{s.reason}</Typography><Typography variant="caption">{new Date(s.created_at).toLocaleString('en-GB')}</Typography>
   {s.admin_response&&<Typography>Admin response: {s.admin_response}</Typography>}
   <Button sx={{alignSelf:'start'}} onClick={()=>open(s)}>{admin?'Review / Reply':s.status==='pending'?'Edit / Withdraw':'View details'}</Button>
  </Stack></CardContent></Card>)}
  {loadedKey===key&&total===0&&<Typography>No suggestions match these filters.</Typography>}
  <Stack direction="row" spacing={2}><Button disabled={!page||loadedKey!==key} onClick={()=>setPage(x=>x-1)}>Previous</Button><Typography>Page {page+1}</Typography><Button disabled={(page+1)*25>=total||loadedKey!==key} onClick={()=>setPage(x=>x+1)}>Next</Button></Stack>
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
   {admin?<><Button disabled={busy} onClick={()=>act('reply')}>Save Reply</Button>{selected?.status==='pending'&&<><Button disabled={busy} onClick={()=>act('reject')}>Confirm Reject</Button><Button disabled={busy||conflict!==undefined} onClick={()=>act('accept')}>Confirm Accept</Button></>}</>:selected?.status==='pending'&&<><Button disabled={busy} onClick={()=>act('withdraw')}>Confirm Withdraw</Button><Button disabled={busy} onClick={()=>act('save')}>Save changes</Button></>}
  </DialogActions></Dialog>
 </Stack>
}

