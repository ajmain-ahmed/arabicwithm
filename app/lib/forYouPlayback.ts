/** Permanent YouTube source failures are remembered on this browser only.
 * Client reports never change publication or delete a shared transcript. */
const KEY='awm-for-you-unplayable-v1'
const sessionFailures=new Set<string>()
export const permanentEmbedError=(code:number)=>[100,101,150].includes(code)
export function blockedForYouSources():Set<string>{
 try{const saved=JSON.parse(localStorage.getItem(KEY)??'[]');if(Array.isArray(saved))for(const id of saved)if(typeof id==='string')sessionFailures.add(id)}catch{}
 return new Set(sessionFailures)
}
export function excludeForYouSource(id:string,code:number):void{
 sessionFailures.add(id)
 if(permanentEmbedError(code))try{
  const saved=JSON.parse(localStorage.getItem(KEY)??'[]')
  const ids=Array.isArray(saved)?saved.filter(value=>typeof value==='string'):[]
  localStorage.setItem(KEY,JSON.stringify([...new Set([...ids,id])].slice(-200)))
 }catch{}
}
