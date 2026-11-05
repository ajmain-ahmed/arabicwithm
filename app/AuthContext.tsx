'use client'

import { returnToPublicHome } from '@/app/lib/publicHome'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, User } from '@supabase/supabase-js'
import { AccountAccessProvider } from '@/app/AccountAccessContext'

/* The browser client (supabase-js, ~240KB) is dynamically imported so
   anonymous visitors never download it. The SSR cookie session is checked
   synchronously first; the module only loads when a session can exist. The
   cookie name is supabase-js's default storage key, `sb-<project-ref>-auth-token`
   (chunked sessions append .0/.1/...), confirmed in @supabase/supabase-js. */
function hasStoredSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return false
  try {
    const ref = new URL(url).hostname.split('.')[0]
    const prefix = `sb-${ref}-auth-token`
    return document.cookie.split(/;\s*/).some((entry) => {
      const name = entry.slice(0, Math.max(0, entry.indexOf('=')))
      return name === prefix || name.startsWith(`${prefix}.`)
    })
  } catch {
    return false
  }
}

interface AuthContextValue {
  establishSession: (session: Session) => Promise<void>
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  establishSession: async () => { throw new Error('Authentication is not ready. Please try again.') },
  user: null,
  session: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  /* Anonymous mounts skip the supabase-js download — but a fresh email/password
     sign-in (owned by the dialog) then has no listener here. This flag flips
     when that happens so the effect re-runs and wires the session up. */
  const [sessionEstablished, setSessionEstablished] = useState(false)
  const refreshedToken=useRef<string|null>(null)
  const establishSession=useCallback(async (incoming:Session)=>{
    if(!incoming?.access_token||!incoming.refresh_token)throw new Error('No authenticated session was returned. Please sign in again.')
    const {supabase}=await import('@/app/lib/supabase/client')
    // setSession resolves after @supabase/ssr persists the browser cookies.
    // It also transfers sessions returned by the non-persistent email client.
    const {data,error}=await supabase.auth.setSession({access_token:incoming.access_token,refresh_token:incoming.refresh_token})
    if(error||!data.session)throw new Error('Your session could not be established. Please sign in again.')
    const verified=await supabase.auth.getUser()
    if(verified.error||!verified.data.user||verified.data.user.id!==data.session.user.id)throw new Error('Your session could not be verified. Please sign in again.')
    const [{useMyListCache},{useReadingProgressStore},{resetPremiumStatusCache}]=await Promise.all([import('@/store/myListStore'),import('@/store/readingProgressStore'),import('@/app/lib/premiumStatusCache')])
    useMyListCache.setState({items:null,bookUserId:null,bookSlugs:null,bookMetadata:undefined,bookOperations:{}})
    useReadingProgressStore.setState({positions:{}})
    resetPremiumStatusCache()
    setSession({...data.session,user:verified.data.user});setUser(verified.data.user);setLoading(false)
    setSessionEstablished(true)
    window.dispatchEvent(new Event('account-access-changed'))
    if(refreshedToken.current!==data.session.access_token){refreshedToken.current=data.session.access_token;router.refresh()}
  },[router])

  useEffect(() => {
    let active = true
    /* Implicit-flow email links (confirmation, password reset) return the
       session in the URL hash. The shared browser client runs PKCE
       (@supabase/ssr default) and refuses implicit hashes, so extract the
       tokens here and establish the session via setSession. Strip the hash
       first so client initialization doesn't attempt (and silently fail)
       the same detection. A hash session needs the client even without a
       stored cookie. */
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const hasHashSession = Boolean(hashParams.get('access_token') && hashParams.get('refresh_token'))

    if (!hasHashSession && !hasStoredSessionCookie() && !sessionEstablished) {
      // Anonymous: no session can exist, so skip downloading supabase-js
      // and subscribing entirely. The microtask keeps setState out of the
      // synchronous effect body (react-hooks/set-state-in-effect).
      queueMicrotask(() => { if (active) setLoading(false) })
      const onSessionEstablished = () => setSessionEstablished(true)
      window.addEventListener('awm-session-established', onSessionEstablished, { once: true })
      return () => {
        active = false
        window.removeEventListener('awm-session-established', onSessionEstablished)
      }
    }

    let stateChanged = false
    let initialized = false
    let identity: string | null = null
    let subscription: { unsubscribe: () => void } | null = null

    import('@/app/lib/supabase/client').then(({ supabase }) => {
      if (!active) return

      if (hasHashSession) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        supabase.auth.setSession({
          access_token: hashParams.get('access_token')!,
          refresh_token: hashParams.get('refresh_token')!,
        })
          .then(({ error }: { error: { message: string } | null }) => {
            if (error) console.error('Unable to establish session from email link:', error.message)
          })
          .catch((error: unknown) => console.error('Unable to establish session from email link:', error))
      }

      // Grab the current session on mount
      supabase.auth.getSession()
        .then(({ data: { session } }: { data: { session: Session | null } }) => {
          // Only apply getSession result if onAuthStateChange hasn't already fired
          if (active && !stateChanged) {
            initialized = true
            identity = session?.user.id ?? null
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
      subscription = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        if (!active) return
        const nextIdentity = session?.user.id ?? null
        const identityChanged = nextIdentity !== identity
        // Restoring the initial cookie session is hydration, not a new login.
        // A refresh here can race a user's first navigation and replace it.
        const shouldRefresh = initialized && identityChanged
        initialized = true
        identity = nextIdentity
        stateChanged = true
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (_event === 'SIGNED_OUT') {
          // Never refresh a private profile after its session has disappeared.
          // A full replacement also clears cached authenticated route payloads.
          returnToPublicHome()
        } else if (shouldRefresh && _event === 'SIGNED_IN'&&refreshedToken.current!==session?.access_token){refreshedToken.current=session?.access_token??null;router.refresh()}
      }).data.subscription
    }).catch((error: unknown) => {
      console.error('Unable to load the auth client:', error)
      if (active) setLoading(false)
    })

    return () => { active = false; subscription?.unsubscribe() }
  }, [router, sessionEstablished])

  const value = useMemo(() => ({ user, session, loading, establishSession }), [user, session, loading, establishSession])

  return (
    <AuthContext.Provider value={value}>
      <AccountAccessProvider userId={user?.id ?? null} authLoading={loading} token={session?.access_token}>{children}</AccountAccessProvider>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
