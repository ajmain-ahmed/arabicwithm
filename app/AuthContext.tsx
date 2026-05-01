'use client'

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase/client'
import { useRevisionStore } from '@/store/revisionStore'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const initRevision = useRevisionStore((s) => s.init)
  const prevUserRef = useRef<string | null>(null)

  useEffect(() => {
    // Grab the current session on mount
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Auth session error:', err)
        setLoading(false)
      })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Init revision store when user signs in
  useEffect(() => {
    const userId = user?.id ?? null
    if (userId && prevUserRef.current !== userId) {
      prevUserRef.current = userId
      initRevision()
    } else if (!userId) {
      prevUserRef.current = null
    }
  }, [user, initRevision])

  const value = useMemo(() => ({ user, session, loading }), [user, session, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
