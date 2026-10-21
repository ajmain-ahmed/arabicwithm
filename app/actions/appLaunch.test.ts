import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: null as { id: string; email: string } | null, upsert: vi.fn(), limited: false }))
vi.mock('@/app/lib/supabase/server', () => ({ getAuthClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }) }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: () => ({ upsert: mocks.upsert }) } }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/app/lib/rateLimit', () => ({ rateLimit: () => ({ ok: !mocks.limited }) }))
import { setAppLaunchPreference } from './appLaunch'
beforeEach(() => { mocks.user = null; mocks.limited = false; mocks.upsert.mockReset().mockResolvedValue({ error: null }) })
it('normalises guest email and uses the composite unique key without overwriting consent', async () => {
  expect((await setAppLaunchPreference({ email: '  Learner@Example.com ', consent: true })).ok).toBe(true)
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ email: 'learner@example.com', purpose: 'app_launch', subscribed: true, user_id: null }), { onConflict: 'email,purpose', ignoreDuplicates: true })
})
it('requires valid email and explicit consent', async () => {
  expect((await setAppLaunchPreference({ email: 'invalid', consent: true })).ok).toBe(false)
  expect((await setAppLaunchPreference({ email: 'a@example.com', consent: false })).ok).toBe(false)
  expect(mocks.upsert).not.toHaveBeenCalled()
})
it('binds account preferences to the verified email and supports withdrawal', async () => {
  mocks.user = { id: 'account', email: 'own@example.com' }
  await setAppLaunchPreference({ email: 'someone-else@example.com', consent: false })
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ email: 'own@example.com', user_id: 'account', subscribed: false }), { onConflict: 'email,purpose', ignoreDuplicates: false })
})
it('returns recoverable database and rate-limit failures', async () => {
  mocks.upsert.mockResolvedValue({ error: new Error('private database detail') })
  const result = await setAppLaunchPreference({ email: 'a@example.com', consent: true })
  expect(result.ok).toBe(false); expect(result.message).not.toContain('private')
  mocks.limited = true; mocks.upsert.mockClear()
  expect((await setAppLaunchPreference({ email: 'a@example.com', consent: true })).ok).toBe(false)
  expect(mocks.upsert).not.toHaveBeenCalled()
})
