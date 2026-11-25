// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({rows:vi.fn(),eq:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:()=>({select:()=>({eq(...args:unknown[]){mocks.eq(...args);return this},in(){return this},limit:()=>mocks.rows()})})}}))
import {approvedMetadata,sourceFingerprint} from './metadata.server'
beforeEach(()=>{vi.clearAllMocks();mocks.rows.mockResolvedValue({data:[],error:null})})
it('looks up only approved Arabic metadata for already eligible IDs',async()=>{
 mocks.rows.mockResolvedValue({data:[{entity_id:'allowed',field:'title',value:'عنوان',source_hash:sourceFingerprint('Title')},{entity_id:'private',field:'title',value:'Private draft',source_hash:sourceFingerprint('Title')}],error:null})
 const result=await approvedMetadata('book',[{id:'allowed',title:'Title'}]);expect([...result.keys()]).toEqual(['allowed']);expect(result.get('allowed')?.title).toBe('عنوان');expect(mocks.eq).toHaveBeenCalledWith('status','approved');expect(mocks.eq).toHaveBeenCalledWith('locale','ar')
})
it('rejects stale translations when original metadata changes',async()=>{
 mocks.rows.mockResolvedValue({data:[{entity_id:'one',field:'title',value:'قديم',source_hash:sourceFingerprint('Old')}],error:null})
 expect((await approvedMetadata('book',[{id:'one',title:'New'}])).size).toBe(0)
})
it('bounds metadata requests and does no query for an empty eligible list',async()=>{
 expect((await approvedMetadata('book',[])).size).toBe(0);expect(mocks.rows).not.toHaveBeenCalled()
 await expect(approvedMetadata('book',Array.from({length:101},(_,i)=>({id:String(i),title:'Title'})))).rejects.toThrow('100')
})
