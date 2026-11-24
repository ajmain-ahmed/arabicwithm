import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authReturnPath } from '@/app/lib/authReturnPath'

const headers = { 'Cache-Control': 'private, no-store', 'Pragma': 'no-cache', 'Referrer-Policy': 'no-referrer' }

/** Native navigation prepares PKCE on the server, independent of browser SDK
 * initialization, Web Crypto and browser cookie-writing promises. No identity
 * is granted here; the existing callback still verifies the authorization code. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const destination = authReturnPath(url.searchParams.get('next'), url.origin)
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !key) return failure()
  const pending = new NextResponse(null, { headers })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const client = createServerClient(supabaseUrl, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: values => { for (const cookie of values) pending.cookies.set(cookie.name, cookie.value, cookie.options) },
      },
    })
    const callback = new URL('/auth/callback', url.origin)
    callback.searchParams.set('next', destination)
    const result = await Promise.race([
      client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback.href, skipBrowserRedirect: true } }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('OAuth start deadline')), 8000) }),
    ])
    if (result.error || !result.data.url) return failure()
    const authorize = new URL(result.data.url)
    if (authorize.origin !== new URL(supabaseUrl).origin || authorize.pathname !== '/auth/v1/authorize') return failure()
    const response = NextResponse.redirect(authorize, 303)
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value)
    for (const cookie of pending.cookies.getAll()) response.cookies.set(cookie)
    return response
  } catch {
    // Never log the generated OAuth URL, state, verifier or cookies.
    console.error('[auth google] Unable to prepare Google redirect')
    return failure()
  } finally { clearTimeout(timer) }
}

// A link probe must not overwrite the verifier for a real sign-in attempt.
export function HEAD() { return new Response(null, { status: 204, headers }) }

function failure() {
  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google sign-in</title><body><h1>Google sign-in could not open</h1><p>Please return to ArabicWithM and try again.</p><a href="/">Return to ArabicWithM</a></body></html>', {
    status: 503, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  })
}
