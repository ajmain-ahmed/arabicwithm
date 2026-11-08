'use client'

import {useState} from 'react'
import EnglishSourceSegment from './EnglishSourceSegment'
import MobileDefinitionPopover from '@/app/components/vocab-tooltip/MobileDefinitionPopover'
import type {VocabEntry} from '@/app/components/vocab-tooltip'
import {Box,Typography} from '@mui/material'
import type {ForYouToken} from '@/app/lib/forYou'
import {safeTextSize,TEXT_SCALES} from '@/app/components/settings-controls/TextSizeControl'
interface Settings {meanings:boolean;sentence:boolean;arabicSize?:number;englishSize?:number}
interface Props {line:{tokens:ForYouToken[];original_text?:string;english_text?:string|null;translation?:string|null};settings:Settings;time:number;mobile?:boolean;active?:boolean;arabicFirst?:boolean}

/** Preserve standalone transcript/preview presentation unless For You opts in. */
export default function EnglishForYouSegment(props:Props){
 return props.arabicFirst?<ArabicLearningSegment {...props}/>:<EnglishSourceSegment {...props}/>
}

/** The caller explicitly selects EN presentation from the For You language state.
 * Stored Arabic remains intact; neither translations nor gloss sentences are generated. */
function ArabicLearningSegment({line,settings,time,mobile=false,active=true}:Props){
 const [definition,setDefinition]=useState<{anchor:HTMLElement;entry:VocabEntry}|null>(null)
 const englishScale=TEXT_SCALES[safeTextSize(settings.englishSize)],arabicScale=TEXT_SCALES[safeTextSize(settings.arabicSize)]
 // Sentence fields are semantic sources, never joined word glosses. This check
 // rejects incorrectly populated Arabic sentence fields; it never selects EN mode.
 const englishSentence=[line.english_text,line.original_text].find(text=>typeof text==='string'&&text.trim()&&/\p{L}/u.test(text)&&!/[\u0621-\u064a]/u.test(text))
 const punctuation=/^[\p{P}\p{S}\s]+$/u
 const tokens:ForYouToken[]=[]
 let opening=''
 for(const token of line.tokens){
  const arabic=token.arabic.trim()
  if(!arabic)continue
  if(punctuation.test(arabic)){
   if(/^[([{«“‘]+$/u.test(arabic)||!tokens.length)opening+=arabic
   else{const previous=tokens.at(-1)!;tokens[tokens.length-1]={...previous,arabic:previous.arabic+arabic}}
  }else{tokens.push({...token,arabic:opening+arabic});opening=''}
 }
 if(opening&&tokens.length){const previous=tokens.at(-1)!;tokens[tokens.length-1]={...previous,arabic:previous.arabic+opening}}
 return <Box data-english-for-you>
  <MobileDefinitionPopover anchor={definition?.anchor??null} entry={definition?.entry??null} onClose={()=>setDefinition(null)} textScale={arabicScale}/>
  {tokens.length?<Box data-english-source dir="rtl" lang="ar" sx={{display:'flex',flexWrap:'wrap',justifyContent:'center',alignItems:'flex-start',columnGap:2,rowGap:1.5,py:1}}>
   {tokens.map((token,index)=><Box component="button" type="button" key={index} aria-label={`Definition: ${token.arabic}${token.english?` — ${token.english}`:''}`} onClick={event=>setDefinition({anchor:event.currentTarget,entry:{arabic:token.arabic,english:token.english,transliteration:token.transliteration??'',pos:token.pos??undefined,cefr:token.cefr??undefined,headword:token.headword??undefined,entry_type:token.entry_type==='phrase'?'phrase':'word'}})} data-english-token data-active-token={active&&token.start_seconds!==undefined&&token.end_seconds!==undefined&&token.start_seconds<=time&&time<token.end_seconds?'true':undefined} sx={{appearance:'none',border:0,p:0,m:0,bgcolor:'transparent',color:'inherit',font:'inherit',cursor:'pointer','&:focus-visible':{outline:'2px solid var(--awm-teal)',outlineOffset:2},display:'inline-flex',flexDirection:'column',alignItems:'center',minWidth:0,maxWidth:'100%',overflowWrap:'anywhere',borderRadius:1,'&[data-active-token="true"]':{bgcolor:'rgba(212,168,67,.16)'}}}>
    <Typography component="span" lang="ar" dir="rtl" sx={{fontFamily:'var(--font-serif)',fontSize:`${(mobile?1.8:2.2)*arabicScale}rem`,lineHeight:1.6,maxWidth:'100%',color:'inherit',textAlign:'center'}}>{token.arabic}</Typography>
    {settings.meanings&&token.english.trim()&&!punctuation.test(token.english)&&<Typography component="span" lang="en" dir="ltr" sx={{fontSize:`${.8*englishScale}rem`,lineHeight:1.5,maxWidth:'100%',color:'inherit',opacity:.8,textAlign:'center'}}>{token.english}</Typography>}
   </Box>)}
  </Box>:<Typography lang="en" dir="ltr" sx={{textAlign:'center'}}>Arabic words are unavailable for this segment.</Typography>}
  {settings.sentence&&(englishSentence?<Typography data-sentence-translation lang="en" dir="ltr" sx={{mt:1.5,fontSize:`${1.05*englishScale}rem`,lineHeight:1.7,textAlign:'center',overflowWrap:'anywhere',color:'inherit'}}>{englishSentence}</Typography>:<Typography data-missing-english-source role="status" lang="en" dir="ltr" sx={{mt:1.5,fontSize:13,textAlign:'center',color:'inherit',opacity:.75}}>English source sentence is unavailable for this segment.</Typography>)}
 </Box>
}
