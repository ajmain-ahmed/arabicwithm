'use client'
import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { loadReviewSource, reviewCatalogue, submitSuggestion } from '@/app/actions/reviews'
import type { ReviewSource, ReviewType, SuggestionInput } from '@/app/lib/reviews'
import SuggestionsList from '@/app/reviewer/SuggestionsList'
import type { Json } from '@/app/lib/supabase/database.types'
import ChapterNavigator from '@/app/reviewer/ChapterNavigator'
import { reviewUnitLabel, type ReviewCatalogueItem } from '@/app/lib/reviewLabels'
import { useContentPageTop } from '@/app/lib/useContentPageTop'

const empty: SuggestionInput={arabic:'',english:'',comment:'',reason:''}
export default function ReviewerWorkspace({admin=false}:{admin?:boolean}){
 const [tab,setTab]=useState<ReviewType|'mine'|'manage'>('book'),[parent,setParent]=useState(''),[target,setTarget]=useState('')
 const [parents,setParents]=useState<ReviewCatalogueItem[]>([]),[targets,setTargets]=useState<ReviewCatalogueItem[]>([])
 const [source,setSource]=useState<ReviewSource|null>(null),[line,setLine]=useState<number|null>(null),[input,setInput]=useState(empty)
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[page,setPage]=useState(0)
 const [loadingParents,setLoadingParents]=useState(false),[loadingTargets,setLoadingTargets]=useState(false),[loadingSource,setLoadingSource]=useState(false),[retry,setRetry]=useState(0)
 const loading=loadingParents||loadingTargets||loadingSource
 const contentTab=tab==='book'||tab==='show'
 const submitting=useRef(false)
 const contentTop=useContentPageTop(`${target}:${page}`,Boolean(source)&&!loadingSource)
 useEffect(()=>{let active=true;if(contentTab){setLoadingParents(true);reviewCatalogue(tab as ReviewType).then(x=>{if(active){setParents(x);setLoadingParents(false)}}).catch(e=>{if(active){setError(e.message);setLoadingParents(false)}})}return()=>{active=false}},[tab,contentTab,retry])
 useEffect(()=>{let active=true;if(contentTab&&parent){setLoadingTargets(true);reviewCatalogue(tab as ReviewType,parent).then(x=>{if(active){setTargets(x);setLoadingTargets(false)}}).catch(e=>{if(active){setError(e.message);setLoadingTargets(false)}})}return()=>{active=false}},[tab,contentTab,parent,retry])
 useEffect(()=>{let active=true;if(contentTab&&target){setLoadingSource(true);loadReviewSource(tab as ReviewType,target).then(x=>{if(active){setSource(x);setLoadingSource(false)}}).catch(e=>{if(active){setSource(null);setError(e.message);setLoadingSource(false)}})}return()=>{active=false}},[tab,contentTab,target,retry])
 const submit=async()=>{if(!contentTab||line===null||!source||submitting.current)return;submitting.current=true;setBusy(true);setError('');try{await submitSuggestion(tab as ReviewType,target,line,source.document as unknown as Json,input);setLine(null);setNotice('Suggestion submitted. Canonical content is unchanged.')}catch(e){setError(e instanceof Error?e.message:'Unable to submit')}finally{submitting.current=false;setBusy(false)}}
 return <Stack spacing={2}>
  <Typography variant="h4">Reviewer</Typography>
  <Tabs value={tab} variant="scrollable" scrollButtons="auto" onChange={(_,v)=>{if(busy)return;setTab(v);setLine(null);setParent('');setTarget('');setParents([]);setTargets([]);setSource(null);setPage(0);setNotice('');setError('');setLoadingParents(false);setLoadingTargets(false);setLoadingSource(false)}}><Tab disabled={busy} label="Books" value="book"/><Tab disabled={busy} label="Shows" value="show"/><Tab disabled={busy} label="My Suggestions" value="mine"/>{admin&&<Tab disabled={busy} label="Manage Suggestions & Exports" value="manage"/>}</Tabs>
  {error&&<Alert severity="error" action={<Button onClick={()=>{setError('');setRetry(x=>x+1)}}>Retry</Button>}>{error}</Alert>}{notice&&<Alert severity="success">{notice}</Alert>}
  {tab==='manage'&&admin?<SuggestionsList admin scopeRequired/>:tab==='mine'?<SuggestionsList admin={false}/>:<>
   {loading&&<Typography role="status">{loadingSource?'Loading source…':loadingTargets?'Loading chapters / episodes…':'Loading content…'}</Typography>}
   {!loading&&!error&&!parents.length&&<Typography>No {tab==='book'?'books':'shows'} are available for review.</Typography>}
   <TextField disabled={busy} select label={tab==='book'?'Book':'Show'} value={parent} onChange={e=>{setLine(null);setError('');setParent(e.target.value);setTarget('');setTargets([]);setSource(null);setPage(0);setLoadingTargets(false);setLoadingSource(false)}}><MenuItem value="">Choose…</MenuItem>{parents.map(x=><MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}</TextField>
   {parent&&<ChapterNavigator disabled={busy} units={targets} label={tab==='book'?'Chapter':'Episode'} value={target} onChange={id=>{setLine(null);setError('');setTarget(id);setSource(null);setPage(0);setLoadingSource(false);if(id)contentTop.requestScroll()}}/>}
   {parent&&!loading&&!error&&!targets.length&&<Typography>No chapters / episodes are available in this content.</Typography>}
   {source&&!source.document.length&&<Typography>This source has no reviewable lines.</Typography>}
   <Box ref={contentTop.ref}>{source&&<Typography variant="h6">{parents.find(p=>p.id===parent)?.title} / {targets.find(t=>t.id===target)?reviewUnitLabel(targets.find(t=>t.id===target)!):source.location}</Typography>}</Box>
   {source?.document.slice(page*25,page*25+25).map((block,index)=><Card variant="outlined" key={`${target}:${page*25+index}`}><CardContent>
    <Typography variant="caption">Line {page*25+index+1}</Typography><Typography dir="rtl" sx={{fontSize:'1.5rem'}}>{block.tokens.map(t=>t.arabic).join(' ')}</Typography><Typography>{block.translation}</Typography>
    <Button onClick={()=>{setLine(page*25+index);setInput(empty);setNotice('')}}>Comment / Suggest Edit</Button>
   </CardContent></Card>)}
   {source&&<Stack direction="row" spacing={2}><Button disabled={!page} onClick={()=>{setPage(p=>p-1);contentTop.requestScroll()}}>Previous</Button><Typography>Page {page+1}</Typography><Button disabled={(page+1)*25>=source.document.length} onClick={()=>{setPage(p=>p+1);contentTop.requestScroll()}}>Next</Button></Stack>}
  </>}
  <Dialog open={line!==null} onClose={()=>!busy&&setLine(null)} maxWidth="sm" fullWidth><DialogTitle>Comment / Suggest Edit · Line {(line??0)+1}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
   {error&&<Alert severity="error">{error}</Alert>}
   <Typography>Current Arabic</Typography><Typography dir="rtl">{line!==null&&source?.document[line]?.tokens.map(t=>t.arabic).join(' ')}</Typography>
   <Typography>Current English</Typography><Typography>{line!==null&&source?.document[line]?.translation}</Typography>
   {(['comment','arabic','english','reason'] as const).map(field=><TextField key={field} label={{comment:'Comment',arabic:'Suggested Arabic (optional)',english:'Suggested English (optional)',reason:'Reason / Explanation'}[field]} multiline value={input[field]} onChange={e=>setInput(x=>({...x,[field]:e.target.value}))} slotProps={{htmlInput:{maxLength:10000,dir:field==='arabic'?'rtl':undefined}}} />)}
  </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setLine(null)}>Cancel</Button><Button disabled={busy||![input.arabic,input.english,input.comment].some(x=>x.trim())} onClick={submit}>Submit suggestion</Button></DialogActions></Dialog>
 </Stack>
}

