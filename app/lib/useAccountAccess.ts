'use client'

import { useEffect } from 'react'
import { useVerifiedAccountAccess } from '@/app/AccountAccessContext'
import { resolveEntitlements } from '@/app/lib/entitlements'

/** Navigation uses the same current database role as the protected server routes. */
export function useAccountAccess(refreshKey?: string) {
  const {access,loading,error,refresh}=useVerifiedAccountAccess()
  useEffect(()=>{if(refreshKey!==undefined)void refresh()},[refreshKey,refresh])
  const capabilities = resolveEntitlements(Boolean(access), false, access?.role)
  return {isAdmin:capabilities.canAdminister,isReviewer:capabilities.canEditContent,accessLoading:loading,accessError:error,refreshAccess:refresh}
}
