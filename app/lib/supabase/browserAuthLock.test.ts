import {afterEach,expect,it,vi} from 'vitest'
import {NavigatorLockAcquireTimeoutError} from '@supabase/supabase-js'
import {browserAuthLock} from './browserAuthLock'
afterEach(()=>vi.unstubAllGlobals())
it('reports an unavailable probe outside the browser callback without running the operation',async()=>{
 let callbackRejected=false
 const request=vi.fn(async(_name:string,_options:unknown,callback:(lock:null)=>Promise<unknown>)=>{try{return await callback(null)}catch(error){callbackRejected=true;throw error}})
 vi.stubGlobal('navigator',{locks:{request}})
 const operation=vi.fn();await expect(browserAuthLock('session',0,operation)).rejects.toBeInstanceOf(NavigatorLockAcquireTimeoutError)
 expect(operation).not.toHaveBeenCalled();expect(callbackRejected).toBe(false)
})
it('runs an acquired operation under exclusion and rethrows its failure outside the callback',async()=>{
 let held=false,callbackRejected=false
 const request=vi.fn(async(_name:string,_options:unknown,callback:(lock:{name:string})=>Promise<unknown>)=>{held=true;try{return await callback({name:'session'})}catch(error){callbackRejected=true;throw error}finally{held=false}})
 vi.stubGlobal('navigator',{locks:{request}})
 expect(await browserAuthLock('session',0,async()=>{expect(held).toBe(true);return 'ok'})).toBe('ok')
 const error=new Error('real failure');await expect(browserAuthLock('session',0,async()=>{throw error})).rejects.toBe(error)
 expect(callbackRejected).toBe(false);expect(held).toBe(false)
})
