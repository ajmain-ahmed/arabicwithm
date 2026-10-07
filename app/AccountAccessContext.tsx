'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getAuthenticatedAccess, type AuthenticatedAccess } from '@/app/actions/auth'

interface AccountAccessValue {
 access: AuthenticatedAccess | null; loading: boolean; error: string; refresh: () => Promise<void>
}
const AccountAccessContext=createContext<AccountAccessValue>({access:null,loading:true,error:'',refresh:async()=>{}})

/** Shared, identity-bound UI snapshot. Server guards always verify the current database role. */
export function AccountAccessProvider({userId,authLoading,token,children}:{userId:string|null;authLoading:boolean;token?:string;children:React.ReactNode}) {
 const [access,setAccess]=useState<AuthenticatedAccess|null>(null),[pending,setPending]=useState(true),[error,setError]=useState('')
 const revision=useRef(0),inFlight=useRef<{identity:string;promise:Promise<void>}|null>(null)
 const invalidate=useCallback(()=>{revision.current++;inFlight.current=null},[])
 useLayoutEffect(()=>{
  invalidate()
  if(!userId){setAccess(null);setError('');setPending(false)}
  return invalidate
 },[userId,authLoading,token,invalidate])
 const refresh=useCallback(async()=>{
  if(authLoading||!userId)return
  if(inFlight.current?.identity===userId)return inFlight.current.promise
  const request=++revision.current
  setPending(true);setError('')
  const promise=(async()=>{
   try{
    const result=await getAuthenticatedAccess()
    if(request!==revision.current)return
    if(!result||result.userId!==userId)throw new Error('Your session permissions could not be verified. Please retry or sign in again.')
    setAccess(result)
   }catch(e){
    if(request===revision.current)setError(e instanceof Error?e.message:'Unable to verify account permissions. Please retry.')
   }finally{
    if(request===revision.current){setPending(false);inFlight.current=null}
   }
  })()
  inFlight.current={identity:userId,promise}
  return promise
 },[userId,authLoading])
 useEffect(()=>{
  void refresh()
  const visible=()=>{if(document.visibilityState==='visible')void refresh()}
  window.addEventListener('account-access-changed',refresh);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',visible)
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},60000)
  return()=>{window.clearInterval(timer);window.removeEventListener('account-access-changed',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',visible)}
 },[refresh,token])
 const current=userId&&access?.userId===userId?access:null
 const value=useMemo(()=>({access:current,loading:authLoading||Boolean(userId&&(pending||!current&&!error)),error:userId?error:'',refresh}),[current,authLoading,userId,pending,error,refresh])
 return <AccountAccessContext.Provider value={value}>{children}</AccountAccessContext.Provider>
}
export function useVerifiedAccountAccess(){return useContext(AccountAccessContext)}
