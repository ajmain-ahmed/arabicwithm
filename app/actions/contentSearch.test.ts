// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),abort:vi.fn(),auth:vi.fn()}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{rpc:mocks.rpc}}))
vi.mock('@/app/actions/auth',()=>({getAuthenticatedUserId:mocks.auth}))
vi.mock('next/headers',()=>({headers:async()=>new Headers()}))
vi.mock('@/app/lib/rateLimit',()=>({rateLimit:()=>({ok:true})}))
import {searchLearningContent} from './contentSearch'
beforeEach(()=>{mocks.rpc.mockReturnValue({abortSignal:mocks.abort});mocks.auth.mockResolvedValue(null);mocks.abort.mockResolvedValue({data:[],error:null})})
it('searches only existing learning collections and excludes guest chapter text',async()=>{await searchLearningContent('كتاب');expect(mocks.rpc).toHaveBeenCalledWith('website_search_content_v1',expect.objectContaining({p_query:'كتاب',p_books:false,p_limit:21}));mocks.auth.mockResolvedValue('user');await searchLearningContent('book','e:123');expect(mocks.rpc).toHaveBeenLastCalledWith('website_search_content_v1',expect.objectContaining({p_books:true,p_after:'e:123'}))})
it('returns a bounded cursor page',async()=>{mocks.abort.mockResolvedValue({data:Array.from({length:21},(_,i)=>({key:String(i)})),error:null});const r=await searchLearningContent('book');expect(r.hits).toHaveLength(20);expect(r.more).toBe(true)})
it('rejects malformed input and reports backend failures without fake empty success',async()=>{expect((await searchLearningContent('a')).error).toBeTruthy();mocks.abort.mockResolvedValue({data:null,error:{code:'57014',message:'statement timeout'}});expect((await searchLearningContent('book')).error).toContain('temporarily unavailable')})
