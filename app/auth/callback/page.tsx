// app/auth/callback/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase/client'

export default function AuthCallback() {
    const router = useRouter()
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [status, setStatus] = useState<'loading' | 'error'>('loading')

    useEffect(() => {
        let cancelled = false

        const handleCallback = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()

            if (cancelled) return

            if (error) {
                console.error('Auth callback error:', error)
                setStatus('error')
                router.push('/?auth=error')
                return
            }

            if (session) {
                router.push('/')
            } else {
                // Sometimes the session isn't ready immediately, try again
                timerRef.current = setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (cancelled) return
                    if (retrySession) {
                        router.push('/')
                    } else {
                        setStatus('error')
                        router.push('/?auth=error')
                    }
                }, 500)
            }
        }

        handleCallback()

        return () => {
            cancelled = true
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [router])

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
        }}>
            {status === 'error' ? 'Sign-in failed. Redirecting…' : 'Completing sign in…'}
        </div>
    )
}
