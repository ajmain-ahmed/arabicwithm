// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ guard: vi.fn(), from: vi.fn(), select: vi.fn(), or: vi.fn(), order: vi.fn(), range: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/app/actions/auth', () => ({ guardAdmin: mocks.guard }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: mocks.from } }))
import { fetchPhrasePageForAdmin } from './admin'
beforeEach(() => {
  vi.resetAllMocks()
  const query = { select: mocks.select, or: mocks.or, order: mocks.order, range: mocks.range }
  for (const fn of [mocks.from, mocks.select, mocks.or, mocks.order]) fn.mockReturnValue(query)
  mocks.range.mockResolvedValue({ data: [{ id: 51, phrase_ar_di: 'على الفور', phrase_tr: 'ʿalā l-fawr', english: 'immediately', cefr: 'A2', word_glosses: [] }], count: 2037, error: null })
})
it('reads a bounded page and preserves the full count and glosses', async () => {
  const result = await fetchPhrasePageForAdmin({ page: 1 })
  expect(mocks.range).toHaveBeenCalledWith(50, 99)
  expect(result.total).toBe(2037)
  expect(result.phrases[0].word_glosses).toEqual([])
})
it('quotes punctuation and treats LIKE metacharacters literally', async () => {
  await fetchPhrasePageForAdmin({ search: 'a,b"%_' })
  const expression = mocks.or.mock.calls[0][0] as string
  expect(expression).toContain('english.ilike.' + JSON.stringify('%a,b"\\%\\_%'))
})
it('rejects invalid pages before querying', async () => {
  await expect(fetchPhrasePageForAdmin({ page: -1 })).rejects.toThrow()
  expect(mocks.from).not.toHaveBeenCalled()
})
it('lets unvocalised Arabic find vocalised display forms without changing stored text', async () => {
  await fetchPhrasePageForAdmin({ search: 'على' })
  const expression = mocks.or.mock.calls[0][0] as string
  expect(expression).toContain('phrase_ar_di.imatch.')
  const pattern = JSON.parse(expression.slice('phrase_ar_di.imatch.'.length).split(',phrase_tr.')[0])
  expect(new RegExp(pattern).test('عَلَى الْفَوْرِ')).toBe(true)
})
it('checks Admin access before reading any phrases', async () => {
  mocks.guard.mockRejectedValue(new Error('Forbidden'))
  await expect(fetchPhrasePageForAdmin()).rejects.toThrow('Forbidden')
  expect(mocks.from).not.toHaveBeenCalled()
})
