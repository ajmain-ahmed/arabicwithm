import {afterEach,expect,it,vi} from 'vitest'
import {boundedRead,recoverRead} from './readRecovery'
afterEach(()=>vi.useRealTimers())
it('bounds a stalled read and clears its timer on successful reads',async()=>{
 vi.useFakeTimers();const read=boundedRead(new Promise(()=>{}),20);const failure=expect(read).rejects.toThrow('timed out');await vi.advanceTimersByTimeAsync(20);await failure
 expect(await boundedRead(Promise.resolve('ok'))).toBe('ok');expect(vi.getTimerCount()).toBe(0)
})
it('retries transient reads once and does not retry schema or authorization errors',async()=>{
 vi.useFakeTimers();const read=vi.fn().mockResolvedValueOnce({error:{code:'PGRST001'}}).mockResolvedValue({error:null,data:'ok'})
 const pending=recoverRead(read);await vi.advanceTimersByTimeAsync(250);expect(await pending).toMatchObject({data:'ok'});expect(read).toHaveBeenCalledTimes(2)
 for(const code of ['PGRST202','42501']){const denied=vi.fn().mockResolvedValue({error:{code}});await recoverRead(denied);expect(denied).toHaveBeenCalledOnce()}
})
