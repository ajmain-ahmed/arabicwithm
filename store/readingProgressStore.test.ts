import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({getUser:vi.fn(),updateUser:vi.fn()}))
vi.mock('@/app/lib/supabase/client',()=>({supabase:{auth:{getUser:mocks.getUser,updateUser:mocks.updateUser}}}))
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();vi.useFakeTimers();mocks.getUser.mockResolvedValue({data:{user:{user_metadata:{}}},error:null});mocks.updateUser.mockResolvedValue({error:null})})
afterEach(()=>vi.useRealTimers())
it('preserves old progress while parsing stable source offsets when available',async()=>{
 const {parseStoredPositions}=await import('./readingProgressStore')
 const result=parseStoredPositions({book_progress:{old:{chapterSlug:'one',page:3,totalPages:8},current:{chapterSlug:'two',page:2,totalPages:5,blockIndex:24}}})
 expect(result.old).toMatchObject({page:3,chapterSlug:'one'});expect(result.old.blockIndex).toBeUndefined()
 expect(result.current.blockIndex).toBe(24)
})
it('syncs stable content offsets through the existing debounced progress model',async()=>{
 const {useReadingProgressStore}=await import('./readingProgressStore')
 useReadingProgressStore.getState().track('book','one',3,10,24)
 await useReadingProgressStore.getState().flush()
 expect(mocks.updateUser).toHaveBeenCalledWith({data:{book_progress:{book:expect.objectContaining({chapterSlug:'one',page:3,totalPages:10,blockIndex:24})}}})
})
