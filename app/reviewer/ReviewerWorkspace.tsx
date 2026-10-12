'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Checkbox, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { loadAdminBookCorrections, loadReviewerComments, loadReviewSource, reviewCatalogue, submitSuggestion } from '@/app/actions/reviews'
import type { BookCorrection, ReviewerLineComment, ReviewSource, ReviewType } from '@/app/lib/reviews'
import SuggestionsList from '@/app/reviewer/SuggestionsList'
import type { Json } from '@/app/lib/supabase/database.types'
import ChapterNavigator from '@/app/reviewer/ChapterNavigator'
import { reviewUnitLabel, type ReviewCatalogueItem } from '@/app/lib/reviewLabels'
import { useContentPageTop } from '@/app/lib/useContentPageTop'
import ReviewActionButton from '@/app/reviewer/ReviewActionButton'
import CorrectionCopyButton from '@/app/reviewer/CorrectionCopyButton'

interface CommentState { text:string; busy:boolean; error:string; success:boolean }
const emptyComment:CommentState={text:'',busy:false,error:'',success:false}
export default function ReviewerWorkspace({admin=false}:{admin?:boolean}){
 const [tab,setTab]=useState<ReviewType|'mine'|'manage'>('book'),[parent,setParent]=useState(''),[target,setTarget]=useState('')
 const [parents,setParents]=useState<ReviewCatalogueItem[]>([]),[targets,setTargets]=useState<ReviewCatalogueItem[]>([])
 const [source,setSource]=useState<ReviewSource|null>(null),[page,setPage]=useState(0),[error,setError]=useState('')
 const [commentStates,setCommentStates]=useState<Record<number,CommentState>>({}),[comments,setComments]=useState<ReviewerLineComment[]>([]),[commentHistoryError,setCommentHistoryError]=useState(''),[historyRetry,setHistoryRetry]=useState(0)
 const [corrections,setCorrections]=useState<BookCorrection[]>([]),[correctionsReady,setCorrectionsReady]=useState(false),[selecting,setSelecting]=useState(false),[selectedCorrections,setSelectedCorrections]=useState(new Set<string>())
 const [loadingParents,setLoadingParents]=useState(false),[loadingTargets,setLoadingTargets]=useState(false),[loadingSource,setLoadingSource]=useState(false),[retry,setRetry]=useState(0)
 const loading=loadingParents||loadingTargets||loadingSource
 const contentTab=tab==='book'||tab==='show'
 const submitting=useRef(new Set<number>()),scopeRevision=useRef(0),active=useRef(true)
 const invalidateScope=useCallback(()=>{scopeRevision.current++;submitting.current=new Set<number>()},[])
 useEffect(()=>{active.current=true;return()=>{active.current=false;invalidateScope()}},[invalidateScope])
 const resetComments=()=>{invalidateScope();setCommentStates({});setComments([]);setCommentHistoryError('');setCorrections([]);setCorrectionsReady(false);setSelecting(false);setSelectedCorrections(new Set())}
 const updateComment=(index:number,patch:Partial<CommentState>)=>setCommentStates(states=>({...states,[index]:{...(states[index]??emptyComment),...patch}}))
 const contentTop=useContentPageTop(`${target}:${page}`,Boolean(source)&&!loadingSource)
 useEffect(()=>{let active=true;if(contentTab){setLoadingParents(true);reviewCatalogue(tab as ReviewType).then(x=>{if(active){setParents(x);setLoadingParents(false)}}).catch(e=>{if(active){setError(e.message);setLoadingParents(false)}})}return()=>{active=false}},[tab,contentTab,retry])
 useEffect(()=>{let active=true;if(contentTab&&parent){setLoadingTargets(true);reviewCatalogue(tab as ReviewType,parent).then(x=>{if(active){setTargets(x);setLoadingTargets(false)}}).catch(e=>{if(active){setError(e.message);setLoadingTargets(false)}})}return()=>{active=false}},[tab,contentTab,parent,retry])
 useEffect(()=>{let active=true;if(contentTab&&target){setLoadingSource(true);loadReviewSource(tab as ReviewType,target).then(x=>{if(active){setSource(x);setLoadingSource(false)}}).catch(e=>{if(active){setSource(null);setError(e.message);setLoadingSource(false)}})}return()=>{active=false}},[tab,contentTab,target,retry])
 useEffect(()=>{
  let current=true
  const revision=scopeRevision.current
  if(contentTab&&target){
   setCommentHistoryError('')
   setCorrectionsReady(false)
   const historyRequest=admin&&tab==='book'?loadAdminBookCorrections(parent,target):loadReviewerComments(tab as ReviewType,target)
   historyRequest.then(history=>{
    if(current&&revision===scopeRevision.current){
     setComments(previous=>[...history,...previous.filter(item=>!item.created_at&&!history.some(saved=>saved.id===item.id))])
     if(admin&&tab==='book'){setCorrections(history as BookCorrection[]);setCorrectionsReady(true);setSelectedCorrections(previous=>new Set([...previous].filter(id=>history.some(item=>item.id===id))))}
    }
   }).catch(e=>{if(current&&revision===scopeRevision.current)setCommentHistoryError(e instanceof Error?e.message:'Unable to load your previous comments.')})
  }
  return()=>{current=false}
 },[admin,tab,contentTab,parent,target,historyRetry])
 const submit=async(index:number)=>{
  const text=commentStates[index]?.text.trim()
  if(!contentTab||!source||!text||submitting.current.has(index))return
  const revision=scopeRevision.current
  submitting.current.add(index);updateComment(index,{busy:true,error:'',success:false})
  try{
   const id=await submitSuggestion(tab as ReviewType,target,index,source.document as unknown as Json,{arabic:'',english:'',comment:text,reason:''})
   if(!active.current||revision!==scopeRevision.current)return
   updateComment(index,{text:'',success:true})
   setComments(history=>[{id:String(id),line_index:index,comment:text,status:'pending',created_at:'',admin_response:null},...history])
   if(admin&&tab==='book'){setCorrectionsReady(false);setHistoryRetry(value=>value+1)}
  }catch(e){if(active.current&&revision===scopeRevision.current)updateComment(index,{error:e instanceof Error?e.message:'Unable to add your comment. Please retry.'})}
  finally{if(active.current&&revision===scopeRevision.current){submitting.current.delete(index);updateComment(index,{busy:false})}}
 }
 return <Stack spacing={2}>
  <Typography variant="h4">Reviewer</Typography>
  <Tabs value={tab} variant="scrollable" scrollButtons="auto" onChange={(_,v)=>{resetComments();setTab(v);setParent('');setTarget('');setParents([]);setTargets([]);setSource(null);setPage(0);setError('');setLoadingParents(false);setLoadingTargets(false);setLoadingSource(false)}}><Tab label="Books" value="book"/><Tab label="Shows" value="show"/><Tab label="My Suggestions" value="mine"/>{admin&&<Tab label="Manage Suggestions & Exports" value="manage"/>}</Tabs>
  {error&&<Alert severity="error" action={<Button onClick={()=>{setError('');setRetry(x=>x+1)}}>Retry</Button>}>{error}</Alert>}
  {tab==='manage'&&admin?<SuggestionsList admin scopeRequired/>:tab==='mine'?<SuggestionsList admin={false} canCopyBookCorrections={admin}/>:<>
   {loading&&<Typography role="status">{loadingSource?'Loading source…':loadingTargets?'Loading chapters / episodes…':'Loading content…'}</Typography>}
   {!loading&&!error&&!parents.length&&<Typography>No {tab==='book'?'books':'shows'} are available for review.</Typography>}
   <TextField select label={tab==='book'?'Book':'Show'} value={parent} onChange={e=>{resetComments();setError('');setParent(e.target.value);setTarget('');setTargets([]);setSource(null);setPage(0);setLoadingTargets(false);setLoadingSource(false)}}><MenuItem value="">Choose…</MenuItem>{parents.map(x=><MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}</TextField>
   {parent&&<ChapterNavigator units={targets} label={tab==='book'?'Chapter':'Episode'} value={target} onChange={id=>{if(id===target)return;resetComments();setError('');setTarget(id);setSource(null);setPage(0);setLoadingSource(false);if(id)contentTop.requestScroll()}}/>}
   {parent&&!loading&&!error&&!targets.length&&<Typography>No chapters / episodes are available in this content.</Typography>}
   {source&&!source.document.length&&<Typography>This source has no reviewable lines.</Typography>}
   <Box ref={contentTop.ref}>{source&&<Typography variant="h6">{parents.find(p=>p.id===parent)?.title} / {targets.find(t=>t.id===target)?reviewUnitLabel(targets.find(t=>t.id===target)!):source.location}</Typography>}</Box>
   {admin&&tab==='book'&&source&&<Stack spacing={1}>
    <Stack direction="row" spacing={1} sx={{flexWrap:'wrap',gap:1}}>
     <CorrectionCopyButton key={`${parent}:${target}:all`} bookId={parent} chapterId={target} disabled={!correctionsReady||!corrections.length}/>
     <Button size="small" disabled={!correctionsReady||!corrections.length} aria-pressed={selecting} onClick={()=>{setSelecting(value=>!value);setSelectedCorrections(new Set())}}>{selecting?'Cancel selection':'Select corrections'}</Button>
     {selecting&&<CorrectionCopyButton key={`${parent}:${target}:selected`} bookId={parent} chapterId={target} ids={[...selectedCorrections]} label={`Copy Selected (${selectedCorrections.size})`} disabled={!correctionsReady||!selectedCorrections.size}/>}
    </Stack>
    <Typography variant="caption">{correctionsReady?`${corrections.length} comments across all chapter pages`:commentHistoryError?'Corrections could not be loaded.':'Loading chapter corrections…'}</Typography>
   </Stack>}
   {commentHistoryError&&<Typography variant="caption" color="error" role="alert">{commentHistoryError} <Button size="small" onClick={()=>setHistoryRetry(x=>x+1)}>Retry comments</Button></Typography>}
   {source?.document.slice(page*25,page*25+25).map((block,index)=>{
    const lineIndex=page*25+index,state=commentStates[lineIndex]??emptyComment
    return <Card variant="outlined" key={`${target}:${lineIndex}`}><CardContent>
     <Typography variant="caption">Line {lineIndex+1}</Typography><Typography dir="rtl" sx={{fontSize:'1.5rem'}}>{block.tokens.map(t=>t.arabic).join(' ')}</Typography><Typography>{block.translation}</Typography>
     <Stack direction={{xs:'column',sm:'row'}} spacing={1} sx={{mt:1.5,alignItems:{sm:'flex-start'}}}>
      <TextField multiline maxRows={5} fullWidth size="small" placeholder="Add a comment or suggest a correction…" value={state.text} disabled={state.busy} onChange={event=>updateComment(lineIndex,{text:event.target.value,error:'',success:false})} slotProps={{htmlInput:{'aria-label':`Comment for line ${lineIndex+1}`,maxLength:10000}}} sx={{minWidth:0,flex:1}}/>
      <ReviewActionButton loading={state.busy} disabled={!state.text.trim()} onClick={()=>void submit(lineIndex)} sx={{flexShrink:0,alignSelf:{xs:'flex-end',sm:'flex-start'}}}>Comment</ReviewActionButton>
     </Stack>
     {state.error&&<Typography variant="caption" role="alert" color="error">{state.error}</Typography>}
     {state.success&&<Typography variant="caption" role="status" sx={{color:'var(--awm-forest)'}}>Comment added.</Typography>}
     {comments.filter(comment=>comment.line_index===lineIndex).map(comment=><Box key={comment.id} sx={{mt:1,pl:1.5,borderLeft:'2px solid color-mix(in srgb, var(--awm-gold) 25%, transparent)'}}>
      <Stack direction="row" spacing={1} sx={{alignItems:'flex-start'}}>
       {admin&&tab==='book'&&selecting&&corrections.some(item=>item.id===comment.id)&&<Checkbox size="small" checked={selectedCorrections.has(comment.id)} disabled={!correctionsReady} slotProps={{input:{'aria-label':`Select comment on line ${lineIndex+1}: ${comment.comment.slice(0,60)}`}}} onChange={(_,checked)=>setSelectedCorrections(previous=>{const next=new Set(previous);if(checked)next.add(comment.id);else next.delete(comment.id);return next})} sx={{p:0.5}}/>}
       <Typography variant="body2" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',flex:1,minWidth:0}}>{comment.comment}</Typography>
       {admin&&tab==='book'&&corrections.some(item=>item.id===comment.id)&&<CorrectionCopyButton bookId={parent} chapterId={target} ids={[comment.id]} iconOnly disabled={!correctionsReady}/>}
      </Stack>
      <Typography variant="caption">{comment.status}{comment.created_at?` · ${new Date(comment.created_at).toLocaleString('en-GB')}`:' · Just submitted'}</Typography>
      {comment.admin_response&&<Typography variant="caption" component="p" sx={{whiteSpace:'pre-wrap'}}>Admin: {comment.admin_response}</Typography>}
     </Box>)}
    </CardContent></Card>
   })}
   {source&&<Stack direction="row" spacing={2}><Button disabled={!page} onClick={()=>{setPage(p=>p-1);contentTop.requestScroll()}}>Previous</Button><Typography>Page {page+1}</Typography><Button disabled={(page+1)*25>=source.document.length} onClick={()=>{setPage(p=>p+1);contentTop.requestScroll()}}>Next</Button></Stack>}
  </>}
 </Stack>
}

