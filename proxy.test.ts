// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const auth = vi.hoisted(() => ({ getUser: vi.fn(), create: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), one: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: auth.create }))
import { proxy } from './proxy'
import { boundedFetch } from '@/app/lib/boundedFetch'
beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-key')
  auth.create.mockReturnValue({ auth: { getUser: auth.getUser }, from: auth.from })
  auth.from.mockReturnValue({select:auth.select});auth.select.mockReturnValue({eq:auth.eq});auth.eq.mockReturnValue({maybeSingle:auth.one})
})
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks() })

function requestWithAuthCookie(path = '/') {
  const request = new NextRequest(`http://localhost${path}`)
  request.cookies.set('sb-example-auth-token', 'session-token')
  return request
}

it('skips the remote auth call for anonymous requests', async () => {
  expect((await proxy(new NextRequest('http://localhost/'))).status).toBe(200)
  expect(auth.create).not.toHaveBeenCalled()
  expect(auth.getUser).not.toHaveBeenCalled()
})
it('uses bounded auth requests before rendering a route', async () => {
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
  expect((await proxy(requestWithAuthCookie())).status).toBe(200)
  expect(auth.create).toHaveBeenCalledWith('https://example.supabase.co', 'fixture-key', expect.objectContaining({ global: { fetch: boundedFetch } }))
  expect(auth.getUser).toHaveBeenCalledOnce()
})
it('does not turn an Auth transport failure into a public-page crash', async () => {
  auth.getUser.mockRejectedValue(new Error('Auth timed out'))
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const response = await proxy(requestWithAuthCookie())
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.cookies.getAll()).toEqual([])
  } finally { log.mockRestore() }
})

it.each(['user','editor','admin'])('checks this verified user role through RLS before Featured streams for %s',async role=>{
 auth.getUser.mockResolvedValue({data:{user:{id:'verified',user_metadata:{role:'admin'}}},error:null})
 auth.one.mockResolvedValue({data:{role},error:null})
 const response=await proxy(requestWithAuthCookie('/admin/featured'))
 expect(response.status).toBe(role==='admin'?200:307)
 expect(auth.from).toHaveBeenCalledWith('account_roles');expect(auth.eq).toHaveBeenCalledWith('user_id','verified')
 if(role!=='admin')expect(response.headers.get('location')).toBe('http://localhost/')
})
it('denies anonymous Featured access and fails closed if role verification is unavailable',async()=>{
 expect((await proxy(new NextRequest('http://localhost/admin/featured'))).status).toBe(307)
 auth.getUser.mockResolvedValue({data:{user:{id:'verified'}},error:null});auth.one.mockResolvedValue({data:null,error:{message:'Unavailable'}})
 expect((await proxy(requestWithAuthCookie('/admin/featured'))).status).toBe(307)
})
