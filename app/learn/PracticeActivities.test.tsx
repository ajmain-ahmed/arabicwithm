import React,{act,useState} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({puzzle:vi.fn(),memory:vi.fn()}))
vi.mock('@/app/AuthContext',()=>({useAuth:()=>({user:null})}))
vi.mock('@/app/lib/learnClient',()=>({fetchLearnPuzzleClient:mocks.puzzle,fetchLearnMemoryClient:mocks.memory,fetchLearnNahwClient:vi.fn()}))
vi.mock('@/app/grammar/GrammarUI',()=>({GrammarProvider:({children}:{children:React.ReactNode})=><>{children}</>}))
vi.mock('next/dynamic',()=>({default:(loader:()=>unknown)=>{
 if(String(loader).includes('WordSearchGame'))return function Puzzle(){const [n,set]=useState(0);return <button onClick={()=>set(n+1)}>Puzzle progress {n}</button>}
 if(String(loader).includes('OrderingActivity'))return function Ordering({question,onNext}:{question:{id:string};onNext:()=>void}){return <button data-question={question.id} onClick={onNext}>Next Activity</button>}
 if(String(loader).includes('MemoryPage'))return function Memory({library,onContinue}:{library:{selectedEpisodeId:string};onContinue:()=>void}){return <button onClick={onContinue}>Memory {library.selectedEpisodeId}</button>}
 return function Activity({suppliedQuestions,onRestart}:{suppliedQuestions:{id:string}[];onRestart:()=>void}){return <button data-question={suppliedQuestions[0].id} onClick={onRestart}>Next Activity</button>}
}}))
import {PuzzleActivity,MemoryActivity} from './PracticeActivities'
import {GrammarActivity} from './GrammarPractice'
import {websiteQuestions} from '@/app/grammar/websiteQuestions'
let host:HTMLDivElement,root:Root,sequence=0
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();sequence=0;host=document.createElement('div');document.body.append(host);root=createRoot(host)
 mocks.puzzle.mockResolvedValue({id:'puzzle',type:'episode',words:['\u0643\u062a\u0627\u0628','\u0642\u0644\u0645','\u0634\u0645\u0633','\u0628\u062d\u0631','\u0628\u064a\u062a','\u0648\u0631\u062f'].map((lemma,i)=>({id:String(i),lemma,surfaceForm:lemma,english:'word'}))})
 mocks.memory.mockImplementation(async()=>({selectedEpisodeId:`set-${++sequence}`,cards:[{id:'card'}]}))
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
const mount=()=>act(async()=>root.render(<><PuzzleActivity/><GrammarActivity question={websiteQuestions[0]}/><MemoryActivity/></>))
it('keeps independent progress across twenty non-repeating Grammar transitions and Memory continuation',async()=>{
 await mount()
 const puzzle=()=>host.querySelectorAll('button')[0]
 await act(async()=>puzzle().click());expect(puzzle().textContent).toBe('Puzzle progress 1')
 await mount();expect(puzzle().textContent).toBe('Puzzle progress 1')
 const seen=new Set<string>([websiteQuestions[0].id])
 for(let i=0;i<20;i++){
  const before=host.querySelector('[data-question]')!.getAttribute('data-question')
  await act(async()=>(host.querySelector('[data-question]') as HTMLButtonElement).click())
  const after=host.querySelector('[data-question]')!.getAttribute('data-question')!
  expect(after).not.toBe(before);expect(seen.has(after)).toBe(false);seen.add(after)
  expect(puzzle().textContent).toBe('Puzzle progress 1')
 }
 const grammar=host.querySelector('[data-question]')!.getAttribute('data-question')
 await act(async()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Memory set-1')!.click())
 expect(host.textContent).toContain('Memory set-2')
 expect(host.querySelector('[data-question]')!.getAttribute('data-question')).toBe(grammar)
 expect(puzzle().textContent).toBe('Puzzle progress 1')
})
it('keeps healthy panels usable while another panel fails and retries',async()=>{
 mocks.memory.mockRejectedValueOnce(new Error('Temporary outage'))
 await mount();expect(host.textContent).toContain('Please retry')
 await act(async()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Puzzle progress 0')!.click())
 await act(async()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Retry')!.click())
 expect(host.textContent).toContain('Memory set-1');expect(host.textContent).toContain('Puzzle progress 1')
})
