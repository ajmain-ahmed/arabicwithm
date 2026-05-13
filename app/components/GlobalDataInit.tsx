'use client'

import { useEffect } from 'react'
import { useRevisionStore } from '@/store/revisionStore'

export default function GlobalDataInit({ children }: { children: React.ReactNode }) {
  const fetchCustomMetadata = useRevisionStore((s) => s.fetchCustomMetadata)

  useEffect(() => {
    // Fires once per app load. Store TTL handles hot reloads / remounts.
    fetchCustomMetadata()
  }, [fetchCustomMetadata])

  return <>{children}</>
}