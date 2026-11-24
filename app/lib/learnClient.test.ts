// @vitest-environment node
import {afterEach,expect,it,vi} from 'vitest'
import {fetchLearnMemoryClient,fetchLearnPuzzleClient} from './learnClient'
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
it('lets Memory finish while a different panel is delayed, then aborts the delayed read',async()=>{
 vi.useFakeTimers()
 let puzzleSignal:AbortSignal|undefined
 vi.stubGlobal('fetch',vi.fn((url:string,options:RequestInit)=>url.includes('/puzzle')?new Promise((_,reject)=>{puzzleSignal=options.signal as AbortSignal;puzzleSignal.addEventListener('abort',()=>reject(new Error('aborted')))}):Promise.resolve(Response.json({ok:true,data:{cards:[{id:'card'}]}}))))
 const puzzle=fetchLearnPuzzleClient().catch(error=>error)
 await expect(fetchLearnMemoryClient()).resolves.toEqual({cards:[{id:'card'}]})
 expect(puzzleSignal?.aborted).toBe(false)
 await vi.advanceTimersByTimeAsync(10000)
 expect((await puzzle).message).toBe('aborted');expect(puzzleSignal?.aborted).toBe(true)
})
it('preserves readable errors so each panel can offer Retry',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({ok:false,error:'Please retry.'},{status:503})))
 await expect(fetchLearnMemoryClient()).rejects.toThrow('Please retry')
})
