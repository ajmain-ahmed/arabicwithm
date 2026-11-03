'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Refresh this small catalogue surface when returning from Admin, and while
 * visible. Tagged server caches remain shared; media/player state stays mounted. */
export default function useBookCatalogueRefresh(enabled = true) {
  const router = useRouter()
  useEffect(() => {
    if (!enabled) return
    let lastRefresh = 0
    let pending: number | undefined
    const refresh = () => {
      if (document.visibilityState !== 'visible' || pending !== undefined) return
      // Give an imminent Read/Listen navigation time to cancel this refresh.
      // Bursts coalesce into one trailing refresh, rather than losing a return.
      pending = window.setTimeout(() => {
        pending = undefined
        if (document.visibilityState !== 'visible') return
        lastRefresh = Date.now()
        router.refresh()
      }, Math.max(100, 5000 - (Date.now() - lastRefresh)))
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 60_000)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(pending)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router, enabled])
}
