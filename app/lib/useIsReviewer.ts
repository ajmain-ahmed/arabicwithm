'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/app/AuthContext'
import { getAuthenticatedAccess } from '@/app/actions/auth'
export function useIsReviewer(){
 const {user,loading}=useAuth()
 const [result,setResult]=useState<{id:string;allowed:boolean}|null>(null)
 useEffect(()=>{let active=true;if(!loading&&user)getAuthenticatedAccess().then(x=>{if(active)setResult({id:user.id,allowed:x?.role==='editor'||x?.role==='admin'})}).catch(()=>{if(active)setResult({id:user.id,allowed:false})});return()=>{active=false}},[loading,user])
 return !loading&&user?.id===result?.id&&result?.allowed===true
}
