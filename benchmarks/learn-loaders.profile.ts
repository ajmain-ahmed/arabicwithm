// Explicit opt-in, read-only comparison against the configured public corpus.
import {writeFileSync} from 'node:fs'
import {it,vi} from 'vitest'
const cache=vi.hoisted(()=>new Map<string,Promise<unknown>>())
vi.mock('server-only',()=>({}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedUserId:async()=>null,getAuthenticatedAccess:async()=>null}))
vi.mock('next/headers',()=>({headers:async()=>new Headers(),cookies:async()=>({getAll:()=>[],set:()=>{}})}))
vi.mock('next/cache',()=>({unstable_cache:(fn:(...args:unknown[])=>unknown,key:unknown)=>async(...args:unknown[])=>{const id=JSON.stringify([key,args]);if(!cache.has(id))cache.set(id,Promise.resolve().then(()=>fn(...args)));return cache.get(id)},updateTag:()=>{},revalidatePath:()=>{},revalidateTag:()=>{}}))
import {fetchMemoryLibrary} from '@/app/actions/memory'
import {fetchPuzzleVocabulary} from '@/app/actions/puzzles'
import {fetchLearnMemory,fetchLearnPuzzle} from '@/app/actions/learn'
it.skipIf(process.env.AWM_READONLY_BENCHMARK!=='1')('reports loader request sizes and local Node CPU; never represents Cloudflare isolate measurements',async()=>{
 const measurements:unknown[]=[]
 const stats={requests:0,bytes:0},original=globalThis.fetch
 globalThis.fetch=async(...args)=>{const response=await original(...args);const input=args[0],url=new URL(typeof input==='string'?input:input instanceof URL?input:input.url);if(url.pathname.startsWith('/rest/v1/')){stats.requests++;stats.bytes+=(await response.clone().arrayBuffer()).byteLength}return response}
 try{
  const scenarios:[string,()=>Promise<unknown>][]=[['before Memory',()=>fetchMemoryLibrary()],['before Word Search',()=>fetchPuzzleVocabulary(undefined,6)],['after Memory',()=>fetchLearnMemory()],['after Word Search',()=>fetchLearnPuzzle()]]
  for(const [name,run] of scenarios)for(let sample=0;sample<2;sample++){
   stats.requests=0;stats.bytes=0;const cpu=process.cpuUsage(),started=performance.now()
   const result=await run() as {cards?:unknown[];words?:unknown[]}|null,used=process.cpuUsage(cpu)
   measurements.push({scenario:name,sample:sample?'warm':'cold',databaseRequests:stats.requests,responseBytes:stats.bytes,nodeCpuMs:(used.user+used.system)/1000,wallMs:Math.round(performance.now()-started),cards:result?.cards?.length,words:result?.words?.length})
  }
 }finally{globalThis.fetch=original;writeFileSync('.learn-readonly-metrics.json',JSON.stringify(measurements,null,2))}
})
