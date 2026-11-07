'use client'

import {useState} from 'react'
import MobileDefinitionPopover from '@/app/components/vocab-tooltip/MobileDefinitionPopover'
import type {VocabEntry} from '@/app/components/vocab-tooltip'
import {Alert,Box,Typography} from '@mui/material'
import {englishSourceNeedsReview} from '@/app/lib/transcriptSourceLanguage'
import type {ForYouToken} from '@/app/lib/forYou'
import {safeTextSize,TEXT_SCALES} from '@/app/components/settings-controls/TextSizeControl'
interface Settings {meanings:boolean;sentence:boolean;arabicSize?:number;englishSize?:number}
/** EN is selected explicitly in transcript metadata, never guessed from text.
 * Stored Arabic is deliberately not passed through the tashkeel remover. */
export default function EnglishForYouSegment({line,settings,time,mobile=false,active=true}:{line:{tokens:ForYouToken[];translation?:string|null};settings:Settings;time:number;mobile?:boolean;active?:boolean}){
 const [definition,setDefinition]=useState<{anchor:HTMLElement;entry:VocabEntry}|null>(null)
 const englishScale=TEXT_SCALES[safeTextSize(settings.englishSize)],arabicScale=TEXT_SCALES[safeTextSize(settings.arabicSize)]
 // Bind closing punctuation to its preceding source word, without mutating tokens.
 const tokens=line.tokens.reduce<ForYouToken[]>((pairs,token)=>{
  if(!token.english.trim())return pairs
  if(/^[.,!?;:\u2026\u061f)\]}]+$/u.test(token.english.trim())&&pairs.length){const previous=pairs.at(-1)!;pairs[pairs.length-1]={...previous,english:previous.english+token.english}}
  else pairs.push(token)
  return pairs
 },[])
 return <Box data-english-for-you>
  <MobileDefinitionPopover anchor={definition?.anchor??null} entry={definition?.entry??null} onClose={()=>setDefinition(null)} textScale={arabicScale}/>
  {englishSourceNeedsReview(line.tokens,line.translation)&&<Alert severity="warning">This English-source transcript needs correction or regeneration. Check its original English, Arabic glosses and full Arabic translation. Stored fields have not been swapped.</Alert>}
  {tokens.length?<Box data-english-source dir="ltr" sx={{display:'flex',flexWrap:'wrap',justifyContent:'center',alignItems:'flex-start',columnGap:2,rowGap:1.5,py:1}}>
   {tokens.map((token,index)=><Box component="button" type="button" key={index} aria-label={`Definition: ${token.english}`} onClick={event=>setDefinition({anchor:event.currentTarget,entry:{arabic:token.arabic,english:token.english,transliteration:token.transliteration??'',pos:token.pos??undefined,cefr:token.cefr??undefined,headword:token.headword??undefined,entry_type:token.entry_type==='phrase'?'phrase':'word'}})} data-english-token data-active-token={active&&token.start_seconds!==undefined&&token.end_seconds!==undefined&&token.start_seconds<=time&&time<token.end_seconds?'true':undefined} sx={{appearance:'none',border:0,p:0,m:0,bgcolor:'transparent',color:'inherit',font:'inherit',cursor:'pointer','&:focus-visible':{outline:'2px solid var(--awm-teal)',outlineOffset:2},display:'inline-flex',flexDirection:'column',alignItems:'center',minWidth:0,maxWidth:'100%',overflowWrap:'anywhere',borderRadius:1,'&[data-active-token="true"]':{bgcolor:'rgba(212,168,67,.16)'}}}>
    <Typography component="span" lang="en" dir="ltr" sx={{fontSize:`${(mobile?1.8:2.2)*englishScale}rem`,lineHeight:1.6,maxWidth:'100%',color:'inherit'}}>{token.english}</Typography>
    {settings.meanings&&token.arabic.trim()&&!/^[\p{P}\p{S}\s]+$/u.test(token.arabic)&&<Typography component="span" lang="ar" dir="rtl" sx={{fontFamily:'var(--font-serif)',fontSize:`${.95*arabicScale}rem`,lineHeight:1.6,maxWidth:'100%',color:'inherit',opacity:.8,textAlign:'center'}}>{token.arabic}</Typography>}
   </Box>)}
  </Box>:<Typography lang="en" dir="ltr" sx={{textAlign:'center'}}>English source words are unavailable for this segment.</Typography>}
  {settings.sentence&&line.translation&&<Typography data-sentence-translation lang="ar" dir="rtl" sx={{mt:1.5,fontFamily:'var(--font-serif)',fontSize:`${1.1*arabicScale}rem`,lineHeight:1.7,textAlign:'center',overflowWrap:'anywhere',color:'inherit'}}>{line.translation}</Typography>}
 </Box>
}
