// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),query:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/app/lib/supabase',()=>({serviceClient:{rpc:mocks.rpc}}))
import {loadHomeSpotlight} from './homeSpotlight.server'
const clip={video:{id:'99999999-9999-4999-8999-999999999990',youtube_id:'abcdefghij0'},clip_start_ms:0,clip_end_ms:45000,segments:[{id:1,position:0,start_seconds:0,end_seconds:45,original_text:'A thought.',source_tokens:[{arabic:'book',english:'book'}]}]}
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockImplementation(()=>({abortSignal:mocks.query}));mocks.query.mockResolvedValue({data:clip,error:null})})
it('normally uses one dedicated RPC with no generic discovery or raw transcript requests',async()=>{
 expect((await loadHomeSpotlight())?.clip_end_ms).toBe(45000)
 expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('home_for_you_spotlight',{p_seed:expect.any(String),p_allow_source_tokens:false})
 expect(mocks.query.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
})
it('uses one fallback only, retaining the seed and the total deadline',async()=>{
 mocks.query.mockResolvedValueOnce({data:null,error:null});expect(await loadHomeSpotlight()).not.toBeNull()
 expect(mocks.rpc).toHaveBeenCalledTimes(2);expect(mocks.rpc.mock.calls[1]).toEqual(['home_for_you_spotlight',{...mocks.rpc.mock.calls[0][1],p_allow_source_tokens:true}]);expect(mocks.query.mock.calls[0][0]).toBe(mocks.query.mock.calls[1][0])
})
it('returns a graceful empty result after two queries and never refills',async()=>{
 mocks.query.mockResolvedValue({data:null,error:null});expect(await loadHomeSpotlight()).toBeNull();expect(mocks.rpc).toHaveBeenCalledTimes(2)
})
it('fresh server requests get fresh seeds rather than a globally cached clip',async()=>{
 await loadHomeSpotlight();await loadHomeSpotlight();expect(mocks.rpc.mock.calls[0][1].p_seed).not.toBe(mocks.rpc.mock.calls[1][1].p_seed)
})
it.each([10000,29999,60001])('rejects invalid %sms SQL results without discovery retries',async(end)=>{
 mocks.query.mockResolvedValue({data:{...clip,clip_end_ms:end,segments:[{...clip.segments[0],end_seconds:end/1000}]},error:null})
 await expect(loadHomeSpotlight()).rejects.toThrow('invalid');expect(mocks.rpc).toHaveBeenCalledOnce()
})
it('surfaces RPC/missing-migration errors without using the generic feed as fallback',async()=>{
 mocks.query.mockResolvedValue({data:null,error:{code:'PGRST202'}});await expect(loadHomeSpotlight()).rejects.toThrow('could not load');expect(mocks.rpc).toHaveBeenCalledOnce()
})

it('uses a 1500ms total deadline and does not refill when it expires',async()=>{
 const controller=new AbortController(),timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(controller.signal)
 mocks.query.mockImplementation((signal:AbortSignal)=>new Promise(resolve=>signal.addEventListener('abort',()=>resolve({data:null,error:{code:'ABORT'}}))))
 try{const pending=loadHomeSpotlight();controller.abort();await expect(pending).rejects.toThrow('could not load');expect(timeout).toHaveBeenCalledWith(1500);expect(mocks.rpc).toHaveBeenCalledOnce()}finally{timeout.mockRestore()}
})
