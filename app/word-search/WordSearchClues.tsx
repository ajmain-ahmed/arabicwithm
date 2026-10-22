'use client'
import {useRef,useState} from 'react'
import {CheckCircle} from '@mui/icons-material'
import {Box,Chip,Typography} from '@mui/material'
import type {WordSearchPlacement} from '@/app/lib/transcriptPuzzles'
export default function WordSearchClues({words,foundIds,onReveal}:{words:readonly WordSearchPlacement[];foundIds:ReadonlySet<string>;sourceLabel:string;onReveal:()=>void}){
 const [selected,setSelected]=useState<string|null>(null)
 const opened=useRef(new Set<string>())
 const word=words.find(item=>item.id===selected)
 return <Box data-word-search-vocabulary sx={{mt:1.5}}>
  <Box dir="rtl" sx={{display:'flex',flexWrap:'wrap',gap:1}}>
   {words.map(item=><Chip key={item.id} component="button" type="button" clickable label={item.lemma} lang="ar" dir="rtl" aria-expanded={selected===item.id} aria-controls={selected===item.id?'word-search-word-details':undefined} icon={foundIds.has(item.id)?<CheckCircle/>:undefined} color={foundIds.has(item.id)?'success':'default'} variant="outlined" onClick={()=>{setSelected(current=>current===item.id?null:item.id);if(!opened.current.has(item.id)){opened.current.add(item.id);onReveal()}}} sx={{fontFamily:'var(--font-book-naskh), serif',fontSize:20,height:'auto',minHeight:40,maxWidth:'100%','& .MuiChip-label':{whiteSpace:'normal',py:.5}}}/>)}
  </Box>
  {word&&<Box id="word-search-word-details" role="region" aria-label={`Details for ${word.lemma}`} sx={{mt:1.5,p:2,borderRadius:'10px',bgcolor:'action.hover',overflowWrap:'anywhere'}}>
   <Typography lang="ar" dir="rtl" sx={{fontFamily:'var(--font-book-naskh), serif',fontSize:24}}>{word.lemma}</Typography>
   <Typography lang="en" dir="ltr" sx={{mt:.5,fontWeight:600}}>{word.english}</Typography>
   {word.context?.sentenceArabic&&<Typography lang="ar" dir="rtl" sx={{mt:1.5,fontFamily:'var(--font-book-naskh), serif',fontSize:20,lineHeight:1.7}}>{word.context.sentenceArabic}</Typography>}
   {word.context?.translation&&<Typography lang="en" dir="ltr" sx={{mt:.5,color:'text.secondary'}}>{word.context.translation}</Typography>}
  </Box>}
 </Box>
}
