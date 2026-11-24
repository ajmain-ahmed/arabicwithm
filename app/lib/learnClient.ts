import type {MemoryLibrary} from '@/app/actions/memory'
import type {PuzzleVocabularySource} from '@/app/lib/transcriptPuzzles'
import type {Mode,NahwRow} from '@/app/grammar/models'
async function requestActivity<T>(activity:string,parameters:Record<string,string|undefined>):Promise<T>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000)
 const query=new URLSearchParams()
 for(const [key,value] of Object.entries(parameters))if(value!==undefined)query.set(key,value)
 try{
  const response=await fetch(`/api/learn/${activity}?${query}`,{cache:'no-store',signal:controller.signal})
  const result=await response.json() as {ok:boolean;data:T;error?:string}
  if(!response.ok||!result.ok)throw new Error(result.error??'This activity could not load. Please retry.')
  return result.data
 }finally{clearTimeout(timer)}
}
export const fetchLearnPuzzleClient=(exclude?:string,minimum=6)=>requestActivity<PuzzleVocabularySource|null>('puzzle',{exclude,minimum:String(minimum)})
export const fetchLearnMemoryClient=(exclude?:string)=>requestActivity<MemoryLibrary>('memory',{exclude})
export const fetchLearnNahwClient=(mode:Mode,seed:string,exclude?:string)=>requestActivity<NahwRow|null>('grammar',{mode,seed,exclude})
