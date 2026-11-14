// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({ids:vi.fn(),filters:[] as string[],guard:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:mocks.guard}))
vi.mock('@/app/lib/hansIdIndex',()=>({matchingHansIds:mocks.ids}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:()=>{
 let ids:number[]|null=null,word=''
 const query={select:()=>query,limit:()=>query,in:(_key:string,values:number[])=>{ids=values;return query},eq:(key:string,value:unknown)=>{if(key==='id')ids=[Number(value)];return query},ilike:(key:string,value:string)=>{mocks.filters.push(key);word=value;return query},order:async()=>({data:ids?.includes(250)&&(!word||word==='%book%')?[{id:250,word:'book',definition:'volume'}]:[],error:null})}
 return query
}}}))
import {searchHansWehr} from './admin'
beforeEach(()=>{vi.clearAllMocks();mocks.filters=[];mocks.ids.mockResolvedValue(Array.from({length:301},(_,i)=>i))})
it('uses bounded numeric ID batches and retains word filtering beyond the first batch',async()=>{
 expect(await searchHansWehr({id:'5',word:'book'})).toEqual([{id:250,word:'book',definition:'volume'}])
 expect(mocks.ids).toHaveBeenCalledWith('5');expect(mocks.filters).not.toContain('id::text')
})
it('keeps exact ID reads and invalid input separate from partial lookup',async()=>{
 expect(await searchHansWehr({id:'250',idExact:true})).toHaveLength(1)
 expect(await searchHansWehr({id:'invalid',idExact:true})).toEqual([])
 expect(mocks.ids).not.toHaveBeenCalled()
})
it('verifies Admin access before loading cached IDs',async()=>{
 mocks.guard.mockRejectedValueOnce(new Error('Forbidden'))
 await expect(searchHansWehr({id:'5'})).rejects.toThrow('Forbidden');expect(mocks.ids).not.toHaveBeenCalled()
})
