// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: vi.fn(), from: vi.fn(), rpc: vi.fn() }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: mocks.user }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: mocks.from, rpc: mocks.rpc } }))
vi.mock('@/app/lib/learningSnapshot', () => ({ loadLearningSnapshot: vi.fn() }))
import { recordActiveLearning } from './activity'
beforeEach(() => vi.resetAllMocks())
it.each([null, 'new-account'])('ignores a previous account background flush when the verified user is %s', async user => {
  mocks.user.mockResolvedValue(user)
  expect(await recordActiveLearning({ date: '2026-10-05', activeSeconds: 12 }, 'old-account')).toBeNull()
  expect(mocks.from).not.toHaveBeenCalled()
  expect(mocks.rpc).not.toHaveBeenCalled()
})
