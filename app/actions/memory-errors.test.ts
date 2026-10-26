// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), result: { error: null as null | { code: string; message: string }, data: null as unknown, count: 0 } }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: mocks.auth, getAuthenticatedAccess: async () => { const userId=await mocks.auth();return userId?{userId,role:'user',admin:false}:null } }))
vi.mock('@/app/actions/premium', () => ({ fetchPremiumStatus: async () => ({ premium: false, signedIn:true }) }))
vi.mock('@/app/lib/supabase', () => ({ hasServiceClientConfig: () => true, serviceClient: {
  rpc: mocks.rpc,
  from: () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => mocks.result, then: (resolve: (v: unknown) => unknown) => Promise.resolve(mocks.result).then(resolve) }
    return query
  },
} }))
import { loadMemoryProgress } from './memory'
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue('verified-user'); mocks.result.error = null; mocks.result.data = null; mocks.rpc.mockResolvedValue({ data: null, error: null }); vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { vi.restoreAllMocks() })
it('returns a serializable setup error instead of throwing a redacted production exception', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST205', message: 'missing relation' } })
  mocks.result.error = { code: 'PGRST205', message: 'missing relation' }
  const result = await loadMemoryProgress()
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error).toContain('storage')
  expect(console.error).toHaveBeenCalled()
})
it('handles absent aggregate data', async () => {
  expect(await loadMemoryProgress()).toMatchObject({ ok: true, data: { used: 0, total: 0 } })
})
it('handles signed-out progress without a rejected action', async () => {
  mocks.auth.mockResolvedValue(null)
  expect((await loadMemoryProgress()).ok).toBe(false)
})
