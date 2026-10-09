import {it,expect,vi} from 'vitest'
import {runManualImport,type ManualImportState,type ImportReply,type ManualImportProgress} from './manualImportRunner'
const initial:ManualImportState={id:'video',importId:'stable',committed:0,expected:205,tokens:0,completed:false,enrichment:'ready'}
const ok=(state:ManualImportState):ImportReply=>({ok:true,state})
it('reports committed progress and completes only after final verification',async()=>{
 const progress:ManualImportProgress[]=[],prepare=vi.fn(async()=>ok(initial)),append=vi.fn(async(_id:string,offset:number,limit:number)=>ok({...initial,committed:Math.min(205,offset+limit)})),finish=vi.fn(async()=>ok({...initial,committed:205,completed:true}))
 await runManualImport({prepare,append,finish},p=>progress.push(p))
 expect(append.mock.calls.map(c=>c[1])).toEqual([0,100,200]);expect(prepare).toHaveBeenCalledTimes(1)
 expect(progress.map(p=>p.phase)).toEqual(['Preparing transcript','Importing segments and tokens','Importing segments and tokens','Importing segments and tokens','Finalising import','Import completed'])
 expect(progress.map(p=>p.percent)).toEqual([0,0,48,97,99,100])
})
it('retries the failed offset with exponential backoff and smaller timeout batches',async()=>{
 const sleep=vi.fn(async()=>{}),append=vi.fn().mockResolvedValueOnce({ok:false,code:'57014',retryable:true,error:'Timeout'}).mockResolvedValueOnce({ok:false,code:'40001',retryable:true,error:'Conflict'}).mockResolvedValueOnce(ok({...initial,committed:150})).mockResolvedValueOnce(ok({...initial,committed:200})).mockResolvedValueOnce(ok({...initial,committed:205}))
 const prepare=vi.fn(async()=>ok({...initial,committed:100})),finish=vi.fn(async()=>ok({...initial,committed:205,completed:true}))
 await runManualImport({prepare,append,finish},()=>{},{sleep})
 expect(append.mock.calls.slice(0,3)).toEqual([['stable',100,100],['stable',100,50],['stable',100,50]])
 expect(sleep.mock.calls).toEqual([[500],[1000]]);expect(prepare).toHaveBeenCalledTimes(1)
})
it('bounds retries and never reports completion after a failed finalisation',async()=>{
 const finish=vi.fn(async()=>({ok:false,code:'57014',retryable:true,error:'Timeout'} as const)),phases:string[]=[],sleep=vi.fn(async()=>{})
 await expect(runManualImport({prepare:async()=>ok({...initial,committed:205}),append:vi.fn(),finish},p=>phases.push(p.phase),{sleep})).rejects.toThrow('Committed batches are saved')
 expect(finish).toHaveBeenCalledTimes(4);expect(sleep.mock.calls).toEqual([[500],[1000],[2000]]);expect(phases).not.toContain('Import completed')
})
it('rejects stalled progress or unverified completion and does not retry permission errors',async()=>{
 const finish=vi.fn(),append=vi.fn(async()=>ok(initial))
 await expect(runManualImport({prepare:async()=>ok(initial),append,finish},()=>{})).rejects.toThrow('progress could not be verified');expect(finish).not.toHaveBeenCalled()
 const prepare=vi.fn(async()=>({ok:false,retryable:false,error:'Administrators only.'} as const))
 await expect(runManualImport({prepare,append,finish},()=>{})).rejects.toThrow('Administrators only.');expect(prepare).toHaveBeenCalledTimes(1)
})
it('repeats idempotent finalisation after a completed checkpoint to refresh read caches',async()=>{
 const completed={...initial,committed:205,completed:true},finish=vi.fn(async()=>ok(completed)),append=vi.fn()
 expect(await runManualImport({prepare:async()=>ok(completed),append,finish},()=>{})).toEqual(completed)
 expect(append).not.toHaveBeenCalled();expect(finish).toHaveBeenCalledWith('stable')
})
