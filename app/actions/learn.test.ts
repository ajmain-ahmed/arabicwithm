// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({from:vi.fn(),extract:vi.fn()}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:mocks.from}}))
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}))
vi.mock('@/app/lib/memory',()=>({extractMemoryCards:mocks.extract}))
import {fetchLearnMemory,fetchLearnPuzzle} from './learn'
const id='11111111-1111-4111-8111-111111111111'
beforeEach(()=>{
 vi.clearAllMocks();mocks.extract.mockImplementation((episode:{id:string})=>Array.from({length:5},(_,i)=>({id:`${episode.id}:${i}`})))
 mocks.from.mockImplementation((table:string)=>{
  let columns='';const q={select:(value:string)=>{columns=value;return q},not:()=>q,order:()=>q,limit:()=>q,eq:()=>q,
   then:(resolve:(v:unknown)=>void)=>resolve({data:[{id,show_id:id,slug:'episode',title:'Episode'}],error:null}),
   single:async()=>({data:table==='shows'?{id,slug:'show',title:'Show'}:{id,show_id:id,slug:'episode',title:'Episode',...Object.fromEntries(Array.from({length:40},(_,i)=>[`b${i}`,{tokens:[],translation:'A sentence'}]))},error:null})}
  Object.defineProperty(q,'columns',{get:()=>columns});return q
 })
})
it('projects only a fixed transcript window and returns five canonical Memory card IDs',async()=>{
 const result=await fetchLearnMemory()
 expect(result.cards.map(c=>c.id)).toEqual(Array.from({length:5},(_,i)=>`${id}:${i}`))
 expect(mocks.from).toHaveBeenCalledTimes(3)
 expect(mocks.extract.mock.calls[0][0].transcript).toHaveLength(32)
})
it('does not immediately repeat the excluded source',async()=>{
 const result=await fetchLearnMemory(id)
 expect(result.cards).toEqual([]);expect(mocks.extract).not.toHaveBeenCalled()
})
it('validates client exclusions and puzzle size before accessing the database',async()=>{
 await expect(fetchLearnMemory('invalid')).rejects.toThrow('Invalid practice source')
 await expect(fetchLearnPuzzle(undefined,999)).rejects.toThrow('Invalid puzzle size')
 expect(mocks.from).not.toHaveBeenCalled()
})
it('stops on storage failures so the panel can offer a retry',async()=>{
 const q={select:()=>q,not:()=>q,order:()=>q,limit:()=>q,then:(resolve:(v:unknown)=>void)=>resolve({data:null,error:{code:'503'}})}
 mocks.from.mockReturnValue(q)
 await expect(fetchLearnMemory()).rejects.toThrow('temporarily unavailable')
})
