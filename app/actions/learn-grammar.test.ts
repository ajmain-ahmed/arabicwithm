// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({getUser:vi.fn(),rpc:vi.fn(),client:vi.fn()}))
vi.mock('@/app/lib/supabase/server',()=>({getAuthClient:mocks.client}))
import {fetchLearnNahw} from './grammar'
beforeEach(()=>{vi.clearAllMocks();mocks.client.mockResolvedValue({auth:{getUser:mocks.getUser},rpc:mocks.rpc});mocks.getUser.mockResolvedValue({data:{user:{id:'learner'}},error:null});mocks.rpc.mockReturnValue({abortSignal:async()=>({data:[],error:null})})})
it('requires a verified session before selecting reviewed Grammar content',async()=>{
 mocks.getUser.mockResolvedValue({data:{user:null},error:null})
 await expect(fetchLearnNahw('word_type','seed')).rejects.toThrow('Sign in');expect(mocks.rpc).not.toHaveBeenCalled()
})
it('bounds the existing candidate RPC and preserves source validation',async()=>{
 expect(await fetchLearnNahw('word_type','seed')).toBeNull()
 expect(mocks.rpc).toHaveBeenCalledWith('nahw_candidates',{p_mode:'word_type',p_seed:'seed',p_limit:2})
 mocks.rpc.mockReturnValue({abortSignal:async()=>({data:[{id:'unreviewed',validated:false}],error:null})})
 expect(await fetchLearnNahw('word_type','new-seed')).toBeNull()
})
it('returns query failures for a local retry instead of silently changing the question',async()=>{
 mocks.rpc.mockReturnValue({abortSignal:async()=>({data:null,error:{code:'503'}})})
 await expect(fetchLearnNahw('sentence_role','seed')).rejects.toThrow('Please retry')
})
it('rejects invalid requests before contacting authentication or storage',async()=>{
 await expect(fetchLearnNahw('bad' as never,'seed')).rejects.toThrow('Invalid')
 expect(mocks.client).not.toHaveBeenCalled()
})
