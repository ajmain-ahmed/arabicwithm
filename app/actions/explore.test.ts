// @vitest-environment node
import {expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({books:vi.fn(),pages:vi.fn(),counts:vi.fn()}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedUserId:()=>Promise.resolve('user')}))
vi.mock('@/app/actions/cartoons',()=>({fetchExploreEpisodeMetasForPublic:()=>Promise.resolve([]),fetchExploreEpisodesByIdsPublic:()=>Promise.resolve(new Map())}))
vi.mock('@/app/actions/books',()=>({fetchExploreBookChapterMetasForPublic:mocks.books,fetchExploreBookChapterPageCounts:mocks.counts,fetchExploreBookChapterPagesByChapterIds:mocks.pages}))
import {fetchExploreFeedPage} from './explore'
it('does not load book catalogue or render book items for mobile video-only batches',async()=>{
 mocks.pages.mockResolvedValue(new Map())
 const batch=await fetchExploreFeedPage('mobile',0,true)
 expect(batch.items).toEqual([])
 expect(mocks.books).not.toHaveBeenCalled()
 expect(mocks.counts).not.toHaveBeenCalled()
})
