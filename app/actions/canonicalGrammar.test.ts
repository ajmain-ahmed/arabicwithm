// @vitest-environment node
import { expect, it, vi, beforeEach } from 'vitest'
const mocks = vi.hoisted(() => ({ identity: vi.fn(), rpc: vi.fn() }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: mocks.identity }))
vi.mock('@/app/lib/contentEnrichment/service', () => ({ enrichmentRpc: mocks.rpc }))
import { fetchCanonicalGrammarNote } from './canonicalGrammar'
const id = '11111111-1111-4111-8111-111111111111'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.identity.mockResolvedValue(null)
  mocks.rpc.mockResolvedValue(null)
})
it('derives chapter visibility from server identity and refuses caller-supplied access flags', async () => {
  await fetchCanonicalGrammarNote(id)
  expect(mocks.rpc).toHaveBeenCalledWith(
    'website_read_canonical_grammar',
    expect.objectContaining({ p_signed_in: false }),
  )
  mocks.identity.mockResolvedValue(id)
  await fetchCanonicalGrammarNote(id, { kind: 'chapter' })
  expect(mocks.rpc).toHaveBeenLastCalledWith(
    'website_read_canonical_grammar',
    expect.objectContaining({ p_signed_in: true, p_kind: 'chapter' }),
  )
  // @ts-expect-error callers cannot assert their own verified identity
  await expect(fetchCanonicalGrammarNote(id, { signedIn: true })).rejects.toThrow()
})
it('does not return a candidate even if the storage response is malformed', async () => {
  mocks.rpc.mockResolvedValue({ id, status: 'candidate' })
  expect(await fetchCanonicalGrammarNote(id)).toBeNull()
})
