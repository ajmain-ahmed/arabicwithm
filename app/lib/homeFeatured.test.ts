// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
import type {ShowMeta} from './cartoons'
const mocks=vi.hoisted(()=>({list:vi.fn(),from:vi.fn(),select:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('next/cache',()=>({unstable_cache:(fn:unknown)=>fn}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:()=>({select:mocks.select}),storage:{from:mocks.from}}}))
import {fetchHomeFeatured} from './homeFeatured'
const show={id:'arc',slug:'arc',title:'Arcane',cover:'/cover',level:'B2',episodeCount:1} satisfies ShowMeta
beforeEach(()=>{vi.clearAllMocks();mocks.select.mockResolvedValue({data:[],error:null});mocks.from.mockReturnValue({list:mocks.list,getPublicUrl:(path:string)=>({data:{publicUrl:'https://storage.test/covers/'+path}})})})
it('lists the existing covers/featured folder and retains the actual extension',async()=>{
 mocks.list.mockResolvedValue({data:[{id:'file',name:'ARC.jpg'}],error:null})
 expect(await fetchHomeFeatured([show])).toMatchObject({show,featuredImage:'https://storage.test/covers/featured/ARC.jpg'})
 expect(mocks.from).toHaveBeenCalledWith('covers');expect(mocks.list).toHaveBeenCalledWith('featured',expect.objectContaining({limit:100,offset:0}))
})
it('returns a safe fallback signal on storage failure',async()=>{
 vi.spyOn(console,'warn').mockImplementation(()=>{});mocks.list.mockResolvedValue({data:null,error:{message:'Unavailable'}})
 expect(await fetchHomeFeatured([show])).toBeNull();vi.restoreAllMocks()
})

it('uses the saved canonical image, crop, stable version, and three-day rotation together',async()=>{
 mocks.list.mockResolvedValue({data:[{id:'a',name:'ARC.jpg'},{id:'b',name:'ARC.webp'},{id:'o',name:'ORPHAN.png'}],error:null})
 mocks.select.mockResolvedValue({data:[{show_id:'arc',storage_path:'featured/ARC.webp',position_x:45,position_y:22,updated_at:'version-2'}],error:null})
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{})
 const pair=await fetchHomeFeatured([show],new Date('2026-10-30T12:00:00Z'))
 expect(pair).toMatchObject({show,featuredImage:'https://storage.test/covers/featured/ARC.webp?v=version-2',featuredPosition:{x:45,y:22}})
 expect(await fetchHomeFeatured([show],new Date('2026-10-31T12:00:00Z'))).toEqual(pair)
 expect(warn).toHaveBeenCalledWith('[featured artwork] No matching show:','ORPHAN.png');warn.mockRestore()
})
