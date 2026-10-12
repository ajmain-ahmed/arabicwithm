'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useAuth } from '@/app/AuthContext'
import { AdminListCache } from '@/app/lib/adminListCache'

const Context = createContext<AdminListCache | null>(null)
function SessionCache({ children }: { children: ReactNode }) {
  const [cache] = useState(() => new AdminListCache())
  return <Context.Provider value={cache}>{children}</Context.Provider>
}

export default function AdminListCacheProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <SessionCache key={user?.id ?? 'signed-out'}>{children}</SessionCache>
}

export function useAdminListCache(): AdminListCache {
  const shared = useContext(Context)
  const [local] = useState(() => new AdminListCache())
  return shared ?? local
}
