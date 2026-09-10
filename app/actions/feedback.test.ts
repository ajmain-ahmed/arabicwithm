// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), insert: vi.fn() }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: mocks.auth }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: () => ({ insert: mocks.insert }) } }))
import { submitFeedback } from './feedback'
const input = { rating: 5, comment: 'Helpful', submissionId: '11111111-1111-4111-8111-111111111111' }
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue('verified-user'); mocks.insert.mockResolvedValue({ error: null }) })
it('requires authentication and rejects invalid ratings before writing', async () => {
  expect((await submitFeedback({ ...input, rating: 6 })).ok).toBe(false)
  mocks.auth.mockResolvedValue(null)
  expect((await submitFeedback(input)).ok).toBe(false)
  expect(mocks.insert).not.toHaveBeenCalled()
})
it('uses the verified user rather than any submitted user ID', async () => {
  expect((await submitFeedback({ ...input, user_id: 'someone-else' })).ok).toBe(true)
  expect(mocks.insert).toHaveBeenCalledWith({ id: input.submissionId, user_id: 'verified-user', rating: 5, comment: 'Helpful' })
})
