'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/AuthContext'
import { getAuthenticatedAccess, type AuthenticatedAccess } from '@/app/actions/auth'

/** Navigation uses the same current database role as the protected server routes. */
export function useAccountAccess(refreshKey: string) {
  const { user, loading } = useAuth()
  const [result, setResult] = useState<AuthenticatedAccess | null>(null)

  useEffect(() => {
    if (loading || !user) return
    let active = true
    let revision = 0
    const refresh = async () => {
      const request = ++revision
      try {
        const access = await getAuthenticatedAccess()
        if (active && request === revision) setResult(access?.userId === user.id ? access : null)
      } catch {
        if (active && request === revision) setResult(null)
      }
    }
    const visible = () => { if (document.visibilityState === 'visible') void refresh() }
    void refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [user, loading, refreshKey])

  const role = !loading && user?.id === result?.userId ? result?.role : undefined
  return { isAdmin: role === 'admin', isReviewer: role === 'admin' || role === 'editor' }
}
