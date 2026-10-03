'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckOutlined, ContentCopyOutlined } from '@mui/icons-material'
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { loadAdminBookCorrections } from '@/app/actions/reviews'
import { formatCorrection, formatCorrectionCollection, writeCorrectionClipboard } from '@/app/lib/correctionClipboard'
import ReviewActionButton from '@/app/reviewer/ReviewActionButton'

export default function CorrectionCopyButton({bookId,chapterId,ids,iconOnly=false,label='Copy All Corrections',disabled=false}:{bookId:string;chapterId:string;ids?:string[];iconOnly?:boolean;label?:string;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[copied,setCopied]=useState(false),[error,setError]=useState('')
 const running=useRef(false),active=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 useEffect(()=>{active.current=true;return()=>{active.current=false;if(timer.current)clearTimeout(timer.current)}},[])
 const copy=async()=>{
  if(disabled||running.current)return
  running.current=true;setBusy(true);setCopied(false);setError('')
  if(timer.current)clearTimeout(timer.current)
  try{
   const text=loadAdminBookCorrections(bookId,chapterId,ids).then(rows=>{
    if(iconOnly){if(rows.length!==1)throw new Error('This comment is no longer available. Refresh and retry.');return formatCorrection(rows[0])}
    return formatCorrectionCollection(rows)
   })
   await writeCorrectionClipboard(text)
   if(active.current){setCopied(true);timer.current=setTimeout(()=>{if(active.current)setCopied(false)},1800)}
  }catch(e){if(active.current)setError(e instanceof Error?e.message:'Unable to copy. Allow clipboard access and retry.')}
  finally{running.current=false;if(active.current)setBusy(false)}
 }
 const icon=copied?<CheckOutlined fontSize="small"/>:<ContentCopyOutlined fontSize="small"/>
 return <Stack spacing={0.5} sx={{alignItems:iconOnly?'flex-end':'flex-start',maxWidth:'100%'}}>
  {iconOnly?<Tooltip title={copied?'Copied':'Copy correction'}><span><IconButton aria-label={copied?'Copied correction':'Copy correction'} size="small" disabled={disabled||busy} aria-busy={busy} onClick={()=>void copy()} sx={{color:'var(--awm-gold)','&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2}}}>{icon}</IconButton></span></Tooltip>:<ReviewActionButton disabled={disabled} loading={busy} startIcon={icon} onClick={()=>void copy()}>{copied?'Copied':label}</ReviewActionButton>}
  {copied&&<Box role="status" sx={{position:'absolute',width:1,height:1,overflow:'hidden',clipPath:'inset(50%)'}}>Copied</Box>}
  {error&&<Typography variant="caption" role="alert" color="error" sx={{maxWidth:260,overflowWrap:'anywhere'}}>{error}</Typography>}
 </Stack>
}
