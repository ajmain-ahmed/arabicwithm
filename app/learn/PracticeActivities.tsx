'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'

import dynamic from 'next/dynamic'
import LocalisedProgress from '@/app/components/LocalisedProgress'
import { Alert, Button, LinearProgress } from '@mui/material'
import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/app/AuthContext'

import type { NahwRow, Mode } from '@/app/grammar/models'
import { GrammarProvider } from '@/app/grammar/GrammarUI'
import type { MemoryLibrary } from '@/app/actions/memory'
import { fetchLearnMemoryClient as fetchLearnMemory, fetchLearnPuzzleClient as fetchLearnPuzzle, fetchLearnNahwClient as fetchLearnNahw } from '@/app/lib/learnClient'
import { boundedRead } from '@/app/lib/readRecovery'
import { generateWordSearch, type PuzzleVocabularySource, type WordSearchPuzzle } from '@/app/lib/transcriptPuzzles'
import { websiteQuestions, type WebsiteQuestion } from '@/app/grammar/websiteQuestions'
const WordSearch = dynamic(() => import('@/app/word-search/WordSearchGame'),{loading:()=> <LocalisedProgress label="Loading Word Search"/>})
const Memory = dynamic(() => import('@/app/memory/MemoryPage'),{loading:()=> <LocalisedProgress label="Loading Memory"/>})
const Ordering = dynamic(() => import('./OrderingActivity'),{loading:()=> <LocalisedProgress label="Loading Grammar activity"/>})
const Matching = dynamic(() => import('@/app/grammar/GrammarPage').then(m=>m.LearnMappingActivity),{loading:()=> <LocalisedProgress label="Loading Grammar activity"/>})
const Activity = dynamic(() => import('@/app/grammar/WebsiteActivity'),{loading:()=> <LocalisedProgress label="Loading Grammar activity"/>})
class ActivityBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
 state = { failed: false }
 static getDerivedStateFromError() { return { failed: true } }
 render() { return this.state.failed ? <Alert severity="warning"><UiText>{"This activity could not load."}</UiText>{' '}<Button onClick={()=>this.setState({failed:false})}><UiText>{"Retry"}</UiText></Button></Alert> : this.props.children }
}
function RemoteActivity<T>({load,children}:{load:()=>Promise<T>;children:(props:{data:T;onNext:()=>void})=>ReactNode}){
 const {t:awmT}=useWebsiteLocale()

 const [data,setData]=useState<T|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('')
 const locked=useRef(false),active=useRef(true),loader=useRef(load)
 useEffect(()=>{loader.current=load},[load])
 const next=async()=>{
  if(locked.current)return
  locked.current=true;setBusy(true);setError('')
  try{const value=await boundedRead(loader.current(),12000);if(active.current)setData(value)}
  catch{if(active.current)setError('This activity could not load. Please retry.')}
  finally{locked.current=false;if(active.current)setBusy(false)}
 }
 useEffect(()=>{active.current=true;void next();return()=>{active.current=false}},[])
 if(busy)return <LinearProgress aria-label={awmT("Loading activity")}/>
 if(error)return <Alert severity="warning"><UiText>{error}</UiText><Button onClick={()=>void next()}><UiText>{"Retry"}</UiText></Button></Alert>
 const Content=children
 return data===null?null:<ActivityBoundary><Content data={data} onNext={()=>void next()}/></ActivityBoundary>
}
// Stable component identities preserve progress when the surrounding route or
// auth chrome re-renders; only the panel's own new data replaces its activity.
function PuzzleContent({data:{source,puzzle}}:{data:{source:PuzzleVocabularySource;puzzle:WordSearchPuzzle};onNext:()=>void}){
 return <WordSearch embedded initialSource={source} initialPuzzle={puzzle}/>
}
function MemoryContent({data:library,onNext}:{data:MemoryLibrary;onNext:()=>void}){
 return <Memory key={library.selectedEpisodeId} embedded library={library} onContinue={onNext}/>
}
export function PuzzleActivity(){
 return <RemoteActivity load={async()=>{const source=await fetchLearnPuzzle();if(!source)throw new Error('No puzzle');const puzzle=generateWordSearch(source.words,{difficulty:'easy'});if(!puzzle)throw new Error('No puzzle');return {source,puzzle}}}>{PuzzleContent}</RemoteActivity>
}
export function GrammarActivity({question}:{question:WebsiteQuestion}){
 const {t:awmT}=useWebsiteLocale()

 const [current,setCurrent]=useState(question)
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
export function MemoryActivity(){
 const previous=useRef<string|undefined>(undefined)
 return <RemoteActivity<MemoryLibrary> load={async()=>{const library=await fetchLearnMemory(previous.current);if(!library.cards.length)throw new Error('No memory cards');previous.current=library.selectedEpisodeId;return library}}>{MemoryContent}</RemoteActivity>
}
