/** Client reads must settle even if a Server Action response never arrives.
 * This does not retry or cancel mutations; only use it for reads. */
export async function boundedRead<T>(operation:PromiseLike<T>,milliseconds=30000):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined
 try{return await Promise.race([Promise.resolve(operation),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('The data request timed out. Reload the page to try again.')),milliseconds)})])}
 finally{if(timer)clearTimeout(timer)}
}
export function isTransientReadError(error:unknown):boolean{
 if(!error||typeof error!=='object')return false
 const value=error as {code?:string;status?:number;message?:string;name?:string}
 return [502,503,504,522].includes(value.status??0)||['PGRST000','PGRST001','PGRST002','PGRST003','57014','ECONNRESET','ETIMEDOUT'].includes(value.code??'')||/fetch failed|failed to fetch|networkerror|network request failed|connection reset/i.test(value.message??'')
}
/** One bounded retry for explicitly read-only RPCs. Never wrap writes. */
export async function recoverRead<T extends {error:unknown}>(operation:()=>PromiseLike<T>):Promise<T>{
 for(let attempt=0;;attempt++){
  try{const result=await operation();if(attempt===0&&isTransientReadError(result.error)){await new Promise(resolve=>setTimeout(resolve,250));continue}return result}
  catch(error){if(attempt||!isTransientReadError(error))throw error;await new Promise(resolve=>setTimeout(resolve,250))}
 }
}
