// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const auth = vi.hoisted(() => ({ getUser: vi.fn(), create: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: auth.create }))
import { proxy } from './proxy'
import { boundedFetch } from '@/app/lib/boundedFetch'
beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-key')
  auth.create.mockReturnValue({ auth: { getUser: auth.getUser } })
})
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks() })
it('uses bounded auth requests before rendering a route', async () => {
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
  expect((await proxy(new NextRequest('http://localhost/'))).status).toBe(200)
  expect(auth.create).toHaveBeenCalledWith('https://example.supabase.co', 'fixture-key', expect.objectContaining({ global: { fetch: boundedFetch } }))
  expect(auth.getUser).toHaveBeenCalledOnce()
})
it('does not turn an Auth transport failure into a public-page crash', async () => {
  auth.getUser.mockRejectedValue(new Error('Auth timed out'))
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const response = await proxy(new NextRequest('http://localhost/'))
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.cookies.getAll()).toEqual([])
  } finally { log.mockRestore() }
})
