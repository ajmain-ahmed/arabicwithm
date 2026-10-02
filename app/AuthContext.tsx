'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase/client'
import { AccountAccessProvider } from '@/app/AccountAccessContext'

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
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    /* Implicit-flow email links (confirmation, password reset) return the
       session in the URL hash. The shared browser client runs PKCE
       (@supabase/ssr default) and refuses implicit hashes, so extract the
       tokens here and establish the session via setSession. Strip the hash
       first so client initialization doesn't attempt (and silently fail)
       the same detection. */
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const hashAccessToken = hashParams.get('access_token')
    const hashRefreshToken = hashParams.get('refresh_token')
    if (hashAccessToken && hashRefreshToken) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      supabase.auth.setSession({ access_token: hashAccessToken, refresh_token: hashRefreshToken })
        .then(({ error }: { error: { message: string } | null }) => {
          if (error) console.error('Unable to establish session from email link:', error.message)
        })
        .catch((error:unknown)=>console.error('Unable to establish session from email link:',error))
    }

    let stateChanged = false
    let identity: string | null = null

    // Grab the current session on mount
    supabase.auth.getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        // Only apply getSession result if onAuthStateChange hasn't already fired
        if (active && !stateChanged) {
          identity=session?.user.id??null
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        console.error('Auth session error:', err)
        if (active && !stateChanged) {
          setLoading(false)
        }
      })

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      if (!active) return
      const nextIdentity=session?.user.id??null
      const identityChanged=nextIdentity!==identity
      identity=nextIdentity
      stateChanged = true
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (identityChanged&&(_event === "SIGNED_IN" || _event === "SIGNED_OUT")) router.refresh()
    })

    return () => { active=false; subscription.unsubscribe() }
  }, [router])

  const value = useMemo(() => ({ user, session, loading }), [user, session, loading])

  return (
    <AuthContext.Provider value={value}>
      <AccountAccessProvider userId={user?.id??null} authLoading={loading} token={session?.access_token}>{children}</AccountAccessProvider>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
