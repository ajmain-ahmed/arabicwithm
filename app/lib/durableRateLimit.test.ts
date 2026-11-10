// @vitest-environment node
import { expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), local: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { rpc: mocks.rpc } }))
vi.mock('@/app/lib/rateLimit', () => ({ rateLimit: mocks.local }))
import { durableRateLimit } from './durableRateLimit'

it('uses the durable result without exposing the raw key', async () => {
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: { ok: false, retryAfterSeconds: 12 }, error: null }) })
  expect(await durableRateLimit('private-key', 5, 60000)).toEqual({ ok: false, retryAfterSeconds: 12 })
  const [, input] = mocks.rpc.mock.calls[0]
  expect(input.p_key_hash).toMatch(/^[a-f0-9]{64}$/)
  expect(JSON.stringify(input)).not.toContain('private-key')
})

it('falls back locally when the durable service is unavailable', async () => {
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: null, error: { code: 'UNAVAILABLE' } }) })
  mocks.local.mockReturnValue({ ok: true, retryAfterSeconds: 1 })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(await durableRateLimit('key', 5, 60000)).toEqual({ ok: true, retryAfterSeconds: 1 })
  expect(mocks.local).toHaveBeenCalledWith('key', 5, 60000)
})
