import {navigatorLock,processLock,NavigatorLockAcquireTimeoutError} from '@supabase/supabase-js'

/** Firefox can report a rejection thrown inside a Web Locks callback as a
 * page error even when the SDK catches its background probe's timeout.
 * Resolve the callback with a result, then reject outside it. Mutual exclusion
 * and the SDK's expected timeout class are retained; no lock is bypassed. */
export async function browserAuthLock<T>(name:string,acquireTimeout:number,operation:()=>Promise<T>):Promise<T>{
 if(!globalThis.navigator?.locks)return processLock(name,acquireTimeout,operation)
 if(acquireTimeout!==0)return navigatorLock(name,acquireTimeout,operation)
 type Result={acquired:false}|{acquired:true;ok:true;value:T}|{acquired:true;ok:false;error:unknown}
 const result=await navigator.locks.request(name,{mode:'exclusive',ifAvailable:true},async(lock):Promise<Result>=>{
  if(!lock)return {acquired:false}
  try{return {acquired:true,ok:true,value:await operation()}}
  catch(error){return {acquired:true,ok:false,error}}
 })
 if(!result.acquired)throw new NavigatorLockAcquireTimeoutError(`Session lock "${name}" is busy`)
 if(!result.ok)throw result.error
 return result.value
}
