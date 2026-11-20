// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('server-only',()=>({}))
const mocks = vi.hoisted(() => ({ guard: vi.fn(), rpc: vi.fn(), process: vi.fn() }))
vi.mock('@/app/actions/auth', () => ({ guardAdmin: mocks.guard }))
vi.mock('@/app/lib/contentEnrichment/service', () => ({
  enrichmentRpc: mocks.rpc,
  enrichArabicContent: mocks.process,
}))
import {
  editGrammarNote,
  fetchGrammarNotes,
  fetchGrammarExamples,
  mergeGrammarNotes,
  retryContentEnrichment,
  scanContentEnrichment,
  processContentEnrichmentBatch,
  reviewGrammarExample,
  editGrammarExample,
  fetchGrammarRelatedIds,
} from './grammarNotes'
const id = '11111111-1111-4111-8111-111111111111'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.guard.mockRejectedValue(new Error('Forbidden'))
})
it.each([
  () => fetchGrammarNotes(),
  () => fetchGrammarExamples(id),
  () => editGrammarNote(id, { status: 'approved' }),
  () => mergeGrammarNotes(id, '22222222-2222-4222-8222-222222222222'),
  () => retryContentEnrichment(id),
  () => scanContentEnrichment('all'),
  () => processContentEnrichmentBatch(),
  () => reviewGrammarExample(id, 'approved'),
  () => fetchGrammarRelatedIds(id),
  () => editGrammarExample(id, { highlight: 'نص', explanation: '', grammar_note_id: id }),
])('guards every read and write before reaching privileged storage', async (operation) => {
  await expect(operation()).rejects.toThrow('Forbidden')
  expect(mocks.rpc).not.toHaveBeenCalled()
  expect(mocks.process).not.toHaveBeenCalled()
})
it('validates Admin edits and scan parameters before persistence', async () => {
  mocks.guard.mockResolvedValue(undefined)
  await expect(editGrammarNote(id, { explanation: '' })).rejects.toThrow()
  expect(mocks.rpc).not.toHaveBeenCalled()
  mocks.rpc.mockResolvedValue({ scanned: 3, queued: 6, after: 'chapter:last', done: true })
  expect(await scanContentEnrichment('new')).toEqual({
    scanned: 3,
    queued: 6,
    after: 'chapter:last',
    done: true,
  })
})
