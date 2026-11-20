import {expect,type Page,type TestInfo} from '@playwright/test'
type Cancelled={url:string;time:number;reason:string}
type Diagnostic={message:string;time:number}
export function matchesURL(message:string,url:string){
 const exact=url.replace(/^https?:\/\//,''),position=message.indexOf(exact)
 if(position>=0&&['?','&','#',' '].includes(message[position+exact.length]??''))return true
 try{
  const raw=message.split(' due to access control checks')[0].replace(/^https?:\/+/,'').replace(/^\/+/,''),actual=new URL(url),reported=new URL(actual.protocol+'//'+raw)
  // Next's RSC cache-busting hash is not a resource/query selection. WebKit can
  // report its pre-rewrite hash; preserve all other query parameters.
  actual.searchParams.delete('_rsc');reported.searchParams.delete('_rsc')
  return actual.href===reported.href
 }catch{return false}
}
/** Keep all diagnostics. Only correlate WebKit's exact cancelled URL, near a
 * document navigation, with a browser-confirmed cancellation (never HTTP/CORS errors). */
export async function observeRuntime(page:Page,browser:string){
 const errors:Diagnostic[]=[],cancelled:Cancelled[]=[],failures:Cancelled[]=[],badResponses:{url:string;status:number;time:number}[]=[],navigations:{url:string;time:number}[]=[],departures:{url:string;time:number;fetches:string[]}[]=[]
 page.on('pageerror',error=>errors.push({message:error.message,time:Date.now()}))
 page.on('requestfailed',request=>{const reason=request.failure()?.errorText??'',entry={url:request.url(),reason,time:Date.now()};failures.push(entry);if(/cancel|abort/i.test(reason))cancelled.push(entry)})
 page.on('response',response=>{if(response.status()>=400)badResponses.push({url:response.url(),status:response.status(),time:Date.now()})})
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push({url:frame.url(),time:Date.now()})})
 // Some aborted prefetches never reach WebKit's network event stream. Record
 // the caller's AbortSignal too; the original fetch rejection is rethrown.
 if(browser==='webkit'){
  await page.exposeBinding('__awmAbortedFetch',(_source,value:{url:string;reason:string})=>cancelled.push({...value,time:Date.now()}))
  await page.exposeBinding('__awmPageDeparture',(_source,value:{url:string;time:number;fetches:string[]})=>departures.push(value))
  await page.addInitScript(()=>{
   const original=window.fetch
   const fetches=new Set<string>()
   window.addEventListener('pagehide',()=>{void (window as unknown as {__awmPageDeparture:(value:unknown)=>Promise<void>}).__awmPageDeparture({url:location.href,time:Date.now(),fetches:[...fetches]}).catch(()=>{})})
   window.fetch=async function(input,init){
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href).href
    fetches.add(url)
    const signal=init?.signal??(input instanceof Request?input.signal:null)
    const report=()=>{void (window as unknown as {__awmAbortedFetch:(value:unknown)=>Promise<void>}).__awmAbortedFetch({url,reason:'Caller AbortSignal aborted'}).catch(()=>{})}
    signal?.addEventListener('abort',report,{once:true})
    try{return await original.call(this,input,init)}catch(error){if(signal?.aborted)report();throw error}
   }
  })
 }
 return {async assert(info:TestInfo){
  const classified=errors.map(error=>{
   const request=browser==='webkit'&&/due to access control checks\.?$/.test(error.message)?cancelled.find(request=>matchesURL(error.message,request.url)&&Math.abs(error.time-request.time)<2000):undefined
   const departure=browser==='webkit'&&/due to access control checks\.?$/.test(error.message)?departures.find(item=>Math.abs(item.time-error.time)<100&&item.fetches.some(url=>matchesURL(error.message,url))):undefined
   const anchor=departure?.time??request?.time??error.time
   const navigation=request||departure?navigations.filter(nav=>Math.abs(nav.time-anchor)<2000).sort((left,right)=>Math.abs(left.time-anchor)-Math.abs(right.time-anchor))[0]:undefined
   const genuineFailure=failures.some(item=>!/cancel|abort/i.test(item.reason)&&matchesURL(error.message,item.url)&&Math.abs(item.time-error.time)<2000)||badResponses.some(item=>matchesURL(error.message,item.url)&&Math.abs(item.time-error.time)<2000)
   return {...error,classification:!genuineFailure&&(request||departure)&&navigation?'expected-navigation-cancellation':'unexpected',request,departure,navigation}
  })
  await info.attach('runtime-diagnostics',{body:JSON.stringify({classified,cancelled,failures,badResponses,navigations,departures},null,2),contentType:'application/json'})
  expect(classified.filter(error=>error.classification==='unexpected')).toEqual([])
 }}
}
