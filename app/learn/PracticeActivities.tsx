'use client'
import ActivityBoundary from './ActivityBoundary'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'

import dynamic from 'next/dynamic'
import LocalisedProgress from '@/app/components/LocalisedProgress'
import { Alert, Button, LinearProgress } from '@mui/material'
import {  useEffect, useRef, useState, type ReactNode } from 'react'

import type { MemoryLibrary } from '@/app/actions/memory'
import { fetchLearnMemoryClient as fetchLearnMemory, fetchLearnPuzzleClient as fetchLearnPuzzle } from '@/app/lib/learnClient'
import { boundedRead } from '@/app/lib/readRecovery'
import { generateWordSearch, type PuzzleVocabularySource, type WordSearchPuzzle } from '@/app/lib/transcriptPuzzles'
const WordSearch = dynamic(() => import('@/app/word-search/WordSearchGame'),{loading:()=> <LocalisedProgress label="Loading Word Search"/>})
const Memory = dynamic(() => import('@/app/memory/MemoryPage'),{loading:()=> <LocalisedProgress label="Loading Memory"/>})
function RemoteActivity<T>({load,children,onClose}:{load:()=>Promise<T>;onClose?:()=>void;children:(props:{data:T;onNext:()=>void;onClose?:()=>void})=>ReactNode}){
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
 return data===null?null:<ActivityBoundary><Content data={data} onNext={()=>void next()} onClose={onClose}/></ActivityBoundary>
}
// Stable component identities preserve progress when the surrounding route or
// auth chrome re-renders; only the panel's own new data replaces its activity.
function PuzzleContent({data:{source,puzzle},onClose}:{data:{source:PuzzleVocabularySource;puzzle:WordSearchPuzzle};onNext:()=>void;onClose?:()=>void}){
 return <WordSearch embedded onClosePractice={onClose} initialSource={source} initialPuzzle={puzzle}/>
}
function MemoryContent({data:library,onNext}:{data:MemoryLibrary;onNext:()=>void}){
 return <Memory key={library.selectedEpisodeId} embedded library={library} onContinue={onNext}/>
}
export function PuzzleActivity({onClose}:{onClose?:()=>void}={}){
 return <RemoteActivity onClose={onClose} load={async()=>{const source=await fetchLearnPuzzle();if(!source)throw new Error('No puzzle');const puzzle=generateWordSearch(source.words,{difficulty:'easy'});if(!puzzle)throw new Error('No puzzle');return {source,puzzle}}}>{PuzzleContent}</RemoteActivity>
}
export const GrammarActivity=dynamic(()=>import('./GrammarPractice').then(m=>m.GrammarActivity),{loading:()=> <LocalisedProgress label="Loading Grammar activity"/>})
export function MemoryActivity(){
 const previous=useRef<string|undefined>(undefined)
 return <RemoteActivity<MemoryLibrary> load={async()=>{const library=await fetchLearnMemory(previous.current);if(!library.cards.length)throw new Error('No memory cards');previous.current=library.selectedEpisodeId;return library}}>{MemoryContent}</RemoteActivity>
}
