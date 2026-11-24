// @vitest-environment node
import { expect, it, vi } from 'vitest'
const id = '11111111-1111-4111-8111-111111111111'
const mocks = vi.hoisted(() => ({ learning: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: async () => '11111111-1111-4111-8111-111111111111' }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: {
  from: (table: string) => ({ select() { return this }, eq() { return this }, maybeSingle: async () => table === 'public_profiles' ? { data: null, error: null } : { data: null, error: new Error('Optional read outage') } }),
  auth: { admin: { getUserById: async () => ({ data: { user: { id: '11111111-1111-4111-8111-111111111111', user_metadata: null, created_at: null } }, error: null }) } },
} }))
vi.mock('@/app/lib/learningSnapshot', () => ({ loadLearningSnapshot: mocks.learning }))
vi.mock('@/app/lib/accountPremium', () => ({ accountHasPremium: async () => { throw new Error('Subscription outage') } }))
vi.mock('@/app/actions/books', () => ({ fetchBooksForPublic: async () => { throw new Error('Catalogue outage') }, fetchChaptersForBookPublic: vi.fn() }))
import { fetchPublicProfile } from './profiles'
it('renders the owner with missing metadata and failed optional services instead of failing the whole Profile', async () => {
  mocks.learning.mockRejectedValue(new Error('Learning RPC outage'))
  const profile = await fetchPublicProfile(id)
  expect(profile).toMatchObject({ id, own: true, displayName: 'Arabic learner', premium: false, shelf: [], username: null })
  expect(profile!.warnings).toContain('Learning statistics is temporarily unavailable.')
  expect(profile!.warnings).toContain('Reading shelf is temporarily unavailable.')
})
it('settles even when the optional learning request never responds', async () => {
  vi.useFakeTimers()
  try {
    mocks.learning.mockImplementation(() => new Promise(() => {}))
    const pending = fetchPublicProfile(id)
    await vi.advanceTimersByTimeAsync(4100)
    const profile = await pending
    expect(profile!.own).toBe(true)
    expect(profile!.warnings).toContain('Learning statistics is temporarily unavailable.')
  } finally { vi.useRealTimers() }
})
