import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  userId: vi.fn<(userId?: string | null) => Promise<string | null>>(),
  from: vi.fn(),
  rate: vi.fn(),
}))

vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: mocks.userId }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: mocks.from } }))
vi.mock('@/app/lib/rateLimit', () => ({ rateLimit: mocks.rate }))

import { addToMyList, fetchMyList, fetchMyListShowIds, removeFromMyList } from './myList'

const USER = '11111111-1111-4111-8111-111111111111'
const SHOW_A = '22222222-2222-4222-8222-222222222222'
const SHOW_B = '33333333-3333-4333-8333-333333333333'

function queryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'in']) chain[method] = () => chain
  chain.delete = () => chain
  chain.then = (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.userId.mockResolvedValue(USER)
  mocks.rate.mockReturnValue({ ok: true, retryAfterSeconds: 0 })
})

describe('fetchMyList', () => {
  it('returns [] for guests without touching the database', async () => {
    mocks.userId.mockResolvedValue(null)
    expect(await fetchMyList()).toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('keeps list order and drops deleted shows', async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === 'my_list') {
        return queryChain({ data: [
          { show_id: SHOW_B, created_at: '2026-10-19T10:00:00Z' },
          { show_id: SHOW_A, created_at: '2026-10-18T10:00:00Z' },
          { show_id: '99999999-9999-4999-8999-999999999999', created_at: '2026-10-17T10:00:00Z' },
        ], error: null })
      }
      return queryChain({ data: [
        { id: SHOW_A, slug: 'show-a', title: 'Show A', description: 'Desc A', level: 'B1', cover_crop: null },
        { id: SHOW_B, slug: 'show-b', title: 'Show B', description: null, level: null, cover_crop: null },
      ], error: null })
    })
    const items = await fetchMyList()
    expect(items.map((item) => item.slug)).toEqual(['show-b', 'show-a'])
    expect(items[0]).toMatchObject({ showId: SHOW_B, title: 'Show B', level: '' })
    expect(items[1]).toMatchObject({ description: 'Desc A' })
  })
})

describe('fetchMyListShowIds', () => {
  it('returns the caller’s saved show ids', async () => {
    mocks.from.mockReturnValue(queryChain({ data: [{ show_id: SHOW_A }, { show_id: SHOW_B }], error: null }))
    expect(await fetchMyListShowIds()).toEqual([SHOW_A, SHOW_B])
  })
})

describe('addToMyList', () => {
  it('rejects malformed show ids', async () => {
    expect(await addToMyList('not-a-uuid')).toMatchObject({ ok: false })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('requires sign-in', async () => {
    mocks.userId.mockResolvedValue(null)
    expect(await addToMyList(SHOW_A)).toMatchObject({ ok: false, error: expect.stringContaining('Sign in') })
  })

  it('upserts with the caller id and ignores duplicates', async () => {
    const upsert = vi.fn(() => Promise.resolve({ data: null, error: null }))
    mocks.from.mockReturnValue({ upsert })
    expect(await addToMyList(SHOW_A)).toEqual({ ok: true })
    expect(upsert).toHaveBeenCalledWith({ user_id: USER, show_id: SHOW_A }, { onConflict: 'user_id,show_id', ignoreDuplicates: true })
  })

  it('is rate limited', async () => {
    mocks.rate.mockReturnValue({ ok: false, retryAfterSeconds: 5 })
    expect(await addToMyList(SHOW_A)).toMatchObject({ ok: false, error: expect.stringContaining('Too many') })
  })
})

describe('removeFromMyList', () => {
  it('deletes only the caller’s row for that show', async () => {
    const calls: Array<[string, unknown]> = []
    const chain: Record<string, unknown> = {}
    chain.eq = (column: string, value: unknown) => { calls.push([column, value]); return chain }
    chain.then = (onFulfilled: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(onFulfilled)
    mocks.from.mockReturnValue({ delete: () => chain })
    expect(await removeFromMyList(SHOW_A)).toEqual({ ok: true })
    expect(calls).toEqual([['user_id', USER], ['show_id', SHOW_A]])
  })
})
