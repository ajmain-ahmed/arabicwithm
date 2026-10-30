import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { boundedFetch, withDataDeadline } from '@/app/lib/boundedFetch'

/** Refresh auth cookies before Server Components inspect the session. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const featuredAdmin = request.nextUrl.pathname === '/admin/featured' || request.nextUrl.pathname.startsWith('/admin/featured/')
  const denyFeatured = () => {
    const redirect = NextResponse.redirect(new URL('/', request.url))
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  // No Supabase auth cookie → no session to refresh or verify. Skipping the
  // remote getUser() saves an Auth API round trip on every anonymous request
  // (the vast majority of traffic). Cookie names follow @supabase/ssr's
  // `sb-<ref>-auth-token` / `-refresh-token` convention, with `.N` chunk suffixes.
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && (name.includes('-auth-token') || name.includes('-refresh-token')))
  if (!url || !key || !hasAuthCookie) return featuredAdmin ? denyFeatured() : response
  const client = createServerClient(url, key, {
    global: { fetch: boundedFetch },
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
  try {
    const { data, error } = await withDataDeadline(8000, () => client.auth.getUser())
    // Read only this verified user's role through the existing own_role RLS
    // policy and ordinary session client; no elevated key enters the proxy.
    if (featuredAdmin) {
      if (error || !data.user) return denyFeatured()
      const role = await client.from('account_roles').select('role').eq('user_id', data.user.id).maybeSingle()
      if (role.error || role.data?.role !== 'admin') return denyFeatured()
    }
  } catch (error) {
    // Public routes remain available during Auth outages. Protected pages and
    // actions still verify identity with their own server-side guards.
    console.error('[proxy] Unable to refresh session:', error instanceof Error ? error.message : 'Auth unavailable')
    if (featuredAdmin) return denyFeatured()
  }
  return response
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|api/billing/webhook|api/covers|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2?|ttf|mp4)$).*)'],
}
