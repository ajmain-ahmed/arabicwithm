// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), from: vi.fn(), eq: vi.fn(), read: vi.fn(), rate: vi.fn() }))
vi.mock('@/app/lib/supabase/server', () => ({ getAuthClient: async () => ({ auth: { getUser: mocks.user }, rpc: mocks.rpc, from: mocks.from }) }))
vi.mock('@/app/lib/rateLimit', () => ({ rateLimit: mocks.rate }))
import { bookReleaseReminder, setBookReleaseReminder } from './bookReleaseReminders'
const book = '11111111-1111-4111-8111-111111111111'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.user.mockResolvedValue({ data: { user: { id: 'verified-owner' } }, error: null })
  mocks.rpc.mockResolvedValue({ error: null }); mocks.read.mockResolvedValue({ data: null, error: null }); mocks.rate.mockReturnValue({ ok: true })
  const query = { select: vi.fn().mockReturnThis(), eq: mocks.eq.mockReturnThis(), maybeSingle: mocks.read }
  mocks.from.mockReturnValue(query)
})
it('binds reads to the verified owner and writes through the auth-bound RPC without a caller-supplied owner', async () => {
  mocks.read.mockResolvedValue({ data: { fulfilled_at: null }, error: null })
  expect(await setBookReleaseReminder(book, true)).toEqual({ ok: true, state: { active: true, fulfilled: false } })
  expect(mocks.rpc).toHaveBeenCalledWith('set_book_release_reminder', { p_book_id: book, p_subscribe: true })
  expect(mocks.eq).toHaveBeenCalledWith('user_id', 'verified-owner')
})
it('supports cancellation and fulfilled history', async () => {
  expect(await setBookReleaseReminder(book, false)).toEqual({ ok: true, state: { active: false, fulfilled: false } })
  mocks.read.mockResolvedValue({ data: { fulfilled_at: '2026-11-03T12:00:00Z' }, error: null })
  expect(await bookReleaseReminder(book)).toEqual({ ok: true, state: { active: false, fulfilled: true } })
})
it('rejects anonymous requests and invalid IDs without touching reminder storage', async () => {
  expect((await setBookReleaseReminder('wrong', true)).ok).toBe(false)
  mocks.user.mockResolvedValue({ data: { user: null }, error: null })
  expect((await setBookReleaseReminder(book, true)).ok).toBe(false)
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled()
})
it('does not claim success on RPC failure or rate limiting', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'private database detail' } })
  expect(await setBookReleaseReminder(book, true)).toEqual({ ok: false, error: 'Your reminder could not be updated. Please try again.' })
  mocks.rpc.mockClear(); mocks.rate.mockReturnValue({ ok: false })
  expect((await setBookReleaseReminder(book, true)).ok).toBe(false)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
