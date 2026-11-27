'use client'
import dynamic from 'next/dynamic'
import {useRef,useState} from 'react'
import {Alert,Button,LinearProgress} from '@mui/material'
import {UiText,useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
import {useAuth} from '@/app/AuthContext'
import {GrammarProvider} from '@/app/grammar/GrammarUI'
import type {NahwRow,Mode} from '@/app/grammar/models'
import {websiteQuestions,type WebsiteQuestion} from '@/app/grammar/websiteQuestions'
import {fetchLearnNahwClient as fetchLearnNahw} from '@/app/lib/learnClient'
import {boundedRead} from '@/app/lib/readRecovery'
import LocalisedProgress from '@/app/components/LocalisedProgress'
import ActivityBoundary from './ActivityBoundary'
const Ordering = dynamic(() => import('./OrderingActivity'),{loading:()=> <LocalisedProgress label="Loading Grammar activity"/>})
const Matching = dynamic(() => import('@/app/grammar/GrammarPage').then(m=>m.LearnMappingActivity),{loading:()=> <LocalisedProgress label="Loading Grammar activity"/>})
const Activity = dynamic(() => import('@/app/grammar/WebsiteActivity'),{loading:()=> <LocalisedProgress label="Loading Grammar activity"/>})
export function GrammarActivity({question}:{question?:WebsiteQuestion}){
 const {t:awmT}=useWebsiteLocale()

 const [current,setCurrent]=useState(()=>question??websiteQuestions[Math.floor(Math.random()*websiteQuestions.length)])
 const [ordering,setOrdering]=useState(false)
 const remaining=useRef<WebsiteQuestion[]>([])
 const {user}=useAuth()
 const [mapping,setMapping]=useState<{row:NahwRow;mode:Mode}|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const pending=useRef(false)
 const foundation=()=>{
  setMapping(null)
  if(!remaining.current.length)remaining.current=websiteQuestions.filter(q=>q.id!==current.id)
  const index=Math.floor(Math.random()*remaining.current.length)
  const selected=remaining.current.splice(index,1)[0]
  if(selected){setCurrent(selected);setOrdering(selected.arabic.trim().split(/\s+/).length>=3&&Math.random()<0.2)}
 }
 const next=async()=>{
  if(pending.current)return
  if(!user||Math.random()>=0.25){foundation();return}
  pending.current=true;setBusy(true);setError('')
  try{
   const modes:Mode[]=['word_type','sentence_role','grammatical_case'],mode=modes[Math.floor(Math.random()*modes.length)]
   const row=await boundedRead(fetchLearnNahw(mode,crypto.randomUUID(),mapping?String(mapping.row.id):undefined),10000)
   if(row)setMapping({row,mode});else foundation()
  }catch{setError('This Grammar activity could not load. Please retry.')}
  finally{pending.current=false;setBusy(false)}
 }
 return <ActivityBoundary><GrammarProvider>{busy?<LinearProgress aria-label={awmT("Loading Grammar activity")}/>:error?<Alert severity="warning"><UiText>{error}</UiText><Button onClick={()=>void next()}><UiText>{"Retry"}</UiText></Button><Button onClick={()=>{setError('');foundation()}}><UiText>{"Reviewed foundations"}</UiText></Button></Alert>:mapping?<Matching row={mapping.row} mode={mapping.mode} onNext={()=>void next()}/>:ordering?<Ordering key={current.id} question={current} onNext={()=>void next()}/>:<Activity key={current.id} activity={current.activity} suppliedQuestions={[current]} manualProgress onRestart={()=>void next()}/>}</GrammarProvider></ActivityBoundary>
}
