'use client'

import { useEffect } from 'react'
import { useVerifiedAccountAccess } from '@/app/AccountAccessContext'

/** Navigation uses the same current database role as the protected server routes. */
export function useAccountAccess(refreshKey: string) {
  const {access,loading,error,refresh}=useVerifiedAccountAccess()
  useEffect(()=>{void refresh()},[refreshKey,refresh])
  return {isAdmin:access?.role==='admin',isReviewer:access?.role==='admin'||access?.role==='editor',accessLoading:loading,accessError:error,refreshAccess:refresh}
}
