import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Refresh auth cookies before Server Components inspect the session. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return response
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        for (const cookie of cookies) request.cookies.set(cookie.name, cookie.value)
        response = NextResponse.next({ request })
        for (const cookie of cookies) response.cookies.set(cookie.name, cookie.value, cookie.options)
      },
    },
  })
  // getUser verifies the session remotely; never authorize from an unverified cookie.
  await client.auth.getUser()
  return response
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|api/billing/webhook|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2?|ttf|mp4)$).*)'],
}
