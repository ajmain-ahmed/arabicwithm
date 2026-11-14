// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({read:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/actions/auth',()=>({guardAdmin:vi.fn()}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{from:()=>({select:()=>({eq:()=>({single:mocks.read})})})}}))
import {fetchChapterForAdmin,fetchEpisodeForAdmin,fetchShowForAdmin,fetchBookForAdmin} from './admin'
beforeEach(()=>vi.clearAllMocks())
it.each([fetchChapterForAdmin,fetchEpisodeForAdmin,fetchShowForAdmin,fetchBookForAdmin])('propagates backend failures instead of returning a missing record',async read=>{
 mocks.read.mockResolvedValue({data:null,error:{code:'PGRST001',message:'Backend unavailable'}})
 await expect(read('id')).rejects.toThrow('Please reload')
})
it.each([fetchChapterForAdmin,fetchEpisodeForAdmin,fetchShowForAdmin,fetchBookForAdmin])('retains genuine missing record handling',async read=>{
 mocks.read.mockResolvedValue({data:null,error:{code:'PGRST116',message:'No rows'}})
 expect(await read('id')).toBeNull()
})
