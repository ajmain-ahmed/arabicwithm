import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_DESTINATIONS = new Set(['/', '/reset-password'])

/* Email links (confirm signup, magic link, recovery, email change) carry
   token_hash + type; OAuth carries code. Both become a session below. */
const EMAIL_OTP_TYPES = new Set(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const otpType = requestUrl.searchParams.get('type')
  const requestedDestination = requestUrl.searchParams.get('next') ?? '/'
  const destination = ALLOWED_DESTINATIONS.has(requestedDestination)
    ? requestedDestination
    : '/'

  const hasTokenHash = Boolean(tokenHash) && EMAIL_OTP_TYPES.has(String(otpType))
  if (!code && !hasTokenHash) {
    return authErrorResponse(requestUrl, destination)
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[auth callback] Missing Supabase configuration')
    return authErrorResponse(requestUrl, destination)
  }

  const response = NextResponse.redirect(new URL(destination, requestUrl.origin))
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: otpType as EmailOtpType })

  if (result.error) {
    console.error('[auth callback] Auth exchange failed:', result.error.message)
    return authErrorResponse(requestUrl, destination)
  }

  return response
}

function authErrorResponse(requestUrl: URL, destination: string) {
  if (destination === '/reset-password') {
    return NextResponse.redirect(new URL('/reset-password?error=invalid_link', requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/?auth=error', requestUrl.origin))
}
