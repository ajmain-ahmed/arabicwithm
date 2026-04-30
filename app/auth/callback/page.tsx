// app/auth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase/client'

export default function AuthCallback() {
    const router = useRouter()

    useEffect(() => {
        const handleCallback = async () => {
            // Supabase automatically processes the OAuth code from the URL
            // We just need to get the session and redirect
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
                console.error('Auth callback error:', error)
                router.push('/?auth=error')
                return
            }

            if (session) {
                // Session exists, redirect to home
                router.push('/')
            } else {
                // Sometimes the session isn't ready immediately, try again
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (retrySession) {
                        router.push('/')
                    } else {
                        router.push('/?auth=error')
                    }
                }, 500)
            }
        }

        handleCallback()
    }, [router])

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
        }}>
            Completing sign in...
        </div>
    )
}