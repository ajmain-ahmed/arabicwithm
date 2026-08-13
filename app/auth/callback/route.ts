import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_DESTINATIONS = new Set(['/', '/reset-password'])

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedDestination = requestUrl.searchParams.get('next') ?? '/'
  const destination = ALLOWED_DESTINATIONS.has(requestedDestination)
    ? requestedDestination
    : '/'

  if (!code) {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth callback] Code exchange failed:', error.message)
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
