import {fetchLearnMemory,fetchLearnPuzzle} from '@/app/actions/learn'
import type {Mode} from '@/app/grammar/models'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
/** Independent read requests keep a delayed panel out of the Server Action queue.
 * Source reads and authenticated Grammar selection retain their server guards. */
export async function GET(request:Request,{params}:{params:Promise<{activity:string}>}){
 const {activity}=await params,url=new URL(request.url)
 const exclude=url.searchParams.get('exclude')??undefined
 try{
  let data
  if(activity==='puzzle')data=await fetchLearnPuzzle(exclude,Number(url.searchParams.get('minimum')??6))
  else if(activity==='memory')data=await fetchLearnMemory(exclude)
  else if(activity==='grammar'){const {fetchLearnNahw}=await import('@/app/actions/grammar');data=await fetchLearnNahw(url.searchParams.get('mode') as Mode,url.searchParams.get('seed')??'',exclude)}
  else return Response.json({ok:false,error:'Unknown learning activity.'},{status:404,headers})
  return Response.json({ok:true,data},{headers})
 }catch(error){
  const message=error instanceof Error?error.message:''
  const status=message.startsWith('Invalid')?400:message.startsWith('Sign in')?401:503
  return Response.json({ok:false,error:status===401?'Sign in to practise Grammar.':status===400?'Invalid activity request.':'This activity could not load. Please retry.'},{status,headers})
 }
}
