// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
import type {ShowMeta} from './cartoons'
const mocks=vi.hoisted(()=>({list:vi.fn(),from:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{storage:{from:mocks.from}}}))
import {fetchHomeFeatured} from './homeFeatured'
const show={id:'arc',slug:'arc',title:'Arcane',cover:'/cover',level:'B2',episodeCount:1} satisfies ShowMeta
beforeEach(()=>{vi.clearAllMocks();mocks.from.mockReturnValue({list:mocks.list,getPublicUrl:(path:string)=>({data:{publicUrl:'https://storage.test/covers/'+path}})})})
it('lists the existing covers/featured folder and retains the actual extension',async()=>{
 mocks.list.mockResolvedValue({data:[{id:'file',name:'ARC.jpg'}],error:null})
 expect(await fetchHomeFeatured([show])).toMatchObject({show,featuredImage:'https://storage.test/covers/featured/ARC.jpg'})
 expect(mocks.from).toHaveBeenCalledWith('covers');expect(mocks.list).toHaveBeenCalledWith('featured',expect.objectContaining({limit:100,offset:0}))
})
it('returns a safe fallback signal on storage failure',async()=>{
 vi.spyOn(console,'warn').mockImplementation(()=>{});mocks.list.mockResolvedValue({data:null,error:{message:'Unavailable'}})
 expect(await fetchHomeFeatured([show])).toBeNull();vi.restoreAllMocks()
})
