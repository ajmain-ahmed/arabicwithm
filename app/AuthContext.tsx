'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase/client'

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

  useEffect(() => {
    let stateChanged = false

    // Grab the current session on mount
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        // Only apply getSession result if onAuthStateChange hasn't already fired
        if (!stateChanged) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Auth session error:', err)
        if (!stateChanged) {
          setLoading(false)
        }
      })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      stateChanged = true
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

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
