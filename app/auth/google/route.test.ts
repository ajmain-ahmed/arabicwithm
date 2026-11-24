// @vitest-environment node
import { webcrypto, createHash } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { AuthClient } from '@supabase/supabase-js'
import { GET, HEAD } from './route'

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://fixture.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-publishable')
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No remote auth read is allowed during OAuth initiation')))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

it('generates a Google PKCE redirect and matching verifier cookie without remote session restoration', async () => {
  const response = await GET(new NextRequest('https://www.arabicwithm.com/auth/google?next=%2Fexplore%3Fview%3Dforyou', { headers: { cookie: 'sb-fixture-auth-token=malformed-old-session' } }))
  expect(response.status).toBe(303)
  if (!(response instanceof NextResponse)) throw new Error('Expected a framework redirect with verifier cookies')
  const authorize = new URL(response.headers.get('location')!)
  expect(authorize.origin + authorize.pathname).toBe('https://fixture.supabase.co/auth/v1/authorize')
  expect(authorize.searchParams.get('provider')).toBe('google')
  expect(authorize.searchParams.get('code_challenge_method')).toBe('s256')
  const callback = new URL(authorize.searchParams.get('redirect_to')!)
  expect(callback.origin + callback.pathname).toBe('https://www.arabicwithm.com/auth/callback')
  expect(callback.searchParams.get('next')).toBe('/explore?view=foryou')
  const cookie = response.cookies.getAll().find(c => c.name.endsWith('-code-verifier'))!
  expect(cookie).toBeDefined()
  const verifier: string = JSON.parse(Buffer.from(cookie.value.slice('base64-'.length), 'base64url').toString())
  expect(createHash('sha256').update(verifier).digest('base64url')).toBe(authorize.searchParams.get('code_challenge'))
  expect(cookie.path).toBe('/')
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(fetch).not.toHaveBeenCalled()
})
it.each(['https://elsewhere.test/', '//elsewhere.test/', '/admin/users', '/\\elsewhere.test/'])('rejects an unsafe return target %s', async next => {
  const response = await GET(new NextRequest('https://arabicwithm.com/auth/google?next=' + encodeURIComponent(next)))
  const authorize = new URL(response.headers.get('location')!)
  const callback = new URL(authorize.searchParams.get('redirect_to')!)
  expect(callback.origin).toBe('https://arabicwithm.com')
  expect(callback.searchParams.get('next')).toBe('/')
})
it('returns an independent error on missing configuration and does not start OAuth for HEAD probes', async () => {
  vi.stubEnv('SUPABASE_URL', '')
  expect((await GET(new NextRequest('https://arabicwithm.com/auth/google'))).status).toBe(503)
  expect(HEAD().status).toBe(204)
  expect(HEAD().headers.get('set-cookie')).toBeNull()
})
it('bounds a stalled provider preparation and returns a readable error without a late redirect', async () => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(AuthClient.prototype, 'signInWithOAuth').mockImplementation(() => new Promise(() => {}))
  const pending = GET(new NextRequest('https://arabicwithm.com/auth/google'))
  await vi.advanceTimersByTimeAsync(8000)
  const response = await pending
  expect(response.status).toBe(503)
  expect(await response.text()).toContain('Google sign-in could not open')
  expect(response.headers.get('location')).toBeNull()
  expect(response.headers.get('set-cookie')).toBeNull()
})
