'use client'
import { useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { loadReviewSource, reviewCatalogue, submitSuggestion } from '@/app/actions/reviews'
import type { ReviewSource, ReviewType, SuggestionInput } from '@/app/lib/reviews'
import SuggestionsList from '@/app/reviewer/SuggestionsList'
import type { Json } from '@/app/lib/supabase/database.types'

const empty: SuggestionInput={arabic:'',english:'',comment:'',reason:''}
export default function ReviewerWorkspace(){
 const [tab,setTab]=useState<ReviewType|'mine'>('book'),[parent,setParent]=useState(''),[target,setTarget]=useState('')
 const [parents,setParents]=useState<{id:string;title:string}[]>([]),[targets,setTargets]=useState<{id:string;title:string}[]>([])
 const [source,setSource]=useState<ReviewSource|null>(null),[line,setLine]=useState<number|null>(null),[input,setInput]=useState(empty)
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[page,setPage]=useState(0)
 useEffect(()=>{let active=true;if(tab!=='mine')reviewCatalogue(tab).then(x=>{if(active)setParents(x)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[tab])
 useEffect(()=>{let active=true;if(tab!=='mine'&&parent)reviewCatalogue(tab,parent).then(x=>{if(active)setTargets(x)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[tab,parent])
 useEffect(()=>{let active=true;if(tab!=='mine'&&target)loadReviewSource(tab,target).then(x=>{if(active){setSource(x);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[tab,target])
 const submit=async()=>{if(tab==='mine'||line===null||!source)return;setBusy(true);setError('');try{await submitSuggestion(tab,target,line,source.document as unknown as Json,input);setLine(null);setNotice('Suggestion submitted. Canonical content is unchanged.')}catch(e){setError(e instanceof Error?e.message:'Unable to submit')}finally{setBusy(false)}}
 return <Stack spacing={2}>
  <Typography variant="h4">Reviewer</Typography>
  <Tabs value={tab} onChange={(_,v)=>{setTab(v);setParent('');setTarget('');setParents([]);setTargets([]);setSource(null);setPage(0);setNotice('');setError('')}}><Tab label="Books" value="book"/><Tab label="Shows" value="show"/><Tab label="My Suggestions" value="mine"/></Tabs>
  {error&&<Alert severity="error">{error}</Alert>}{notice&&<Alert severity="success">{notice}</Alert>}
  {tab==='mine'?<SuggestionsList admin={false}/>:<>
   <TextField select label={tab==='book'?'Book':'Show'} value={parent} onChange={e=>{setParent(e.target.value);setTarget('');setTargets([]);setSource(null);setPage(0)}}><MenuItem value="">Choose…</MenuItem>{parents.map(x=><MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}</TextField>
   {parent&&<TextField select label={tab==='book'?'Chapter':'Episode'} value={target} onChange={e=>{setTarget(e.target.value);setSource(null);setPage(0)}}><MenuItem value="">Choose…</MenuItem>{targets.map(x=><MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}</TextField>}
   {source&&<Typography variant="h6">{source.location}</Typography>}
   {source?.document.slice(page*25,page*25+25).map((block,index)=><Card variant="outlined" key={`${target}:${page*25+index}`}><CardContent>
    <Typography variant="caption">Line {page*25+index+1}</Typography><Typography dir="rtl" sx={{fontSize:'1.5rem'}}>{block.tokens.map(t=>t.arabic).join(' ')}</Typography><Typography>{block.translation}</Typography>
    <Button onClick={()=>{setLine(page*25+index);setInput(empty);setNotice('')}}>Comment / Suggest Edit</Button>
   </CardContent></Card>)}
   {source&&<Stack direction="row" spacing={2}><Button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography>Page {page+1}</Typography><Button disabled={(page+1)*25>=source.document.length} onClick={()=>setPage(p=>p+1)}>Next</Button></Stack>}
  </>}
  <Dialog open={line!==null} onClose={()=>!busy&&setLine(null)} maxWidth="sm" fullWidth><DialogTitle>Comment / Suggest Edit · Line {(line??0)+1}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   {error&&<Alert severity="error">{error}</Alert>}
   <Typography>Current Arabic</Typography><Typography dir="rtl">{line!==null&&source?.document[line]?.tokens.map(t=>t.arabic).join(' ')}</Typography>
   <Typography>Current English</Typography><Typography>{line!==null&&source?.document[line]?.translation}</Typography>
   {(['comment','arabic','english','reason'] as const).map(field=><TextField key={field} label={{comment:'Comment',arabic:'Suggested Arabic (optional)',english:'Suggested English (optional)',reason:'Reason / Explanation'}[field]} multiline value={input[field]} onChange={e=>setInput(x=>({...x,[field]:e.target.value}))} slotProps={{htmlInput:{maxLength:10000,dir:field==='arabic'?'rtl':undefined}}} />)}
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setLine(null)}>Cancel</Button><Button disabled={busy||![input.arabic,input.english,input.comment].some(x=>x.trim())} onClick={submit}>Submit suggestion</Button></DialogActions></Dialog>
 </Stack>
}

