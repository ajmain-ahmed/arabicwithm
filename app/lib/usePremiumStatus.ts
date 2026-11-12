'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { readPremiumStatus, subscribePremiumStatus } from '@/app/lib/premiumStatusCache'

const serverSnapshot = () => null
export function usePremiumStatus(userId?: string) {
  const subscribe = useCallback((listener: () => void) => userId
    ? subscribePremiumStatus(userId, listener) : () => {}, [userId])
  const snapshot = useCallback(() => userId ? readPremiumStatus(userId) : null, [userId])
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
