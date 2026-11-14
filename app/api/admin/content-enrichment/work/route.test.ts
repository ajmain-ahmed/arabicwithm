// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), process: vi.fn() }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { rpc: mocks.rpc } }))
vi.mock('@/app/lib/contentEnrichment/service', () => ({ enrichArabicContent: mocks.process }))
import { POST } from './route'
beforeEach(() => vi.clearAllMocks())
it('requires the existing worker credential before processing jobs', async () => {
  expect(
    (await POST(new Request('https://site/api/admin/content-enrichment/work', { method: 'POST' })))
      .status,
  ).toBe(401)
  expect(mocks.rpc).not.toHaveBeenCalled()
  expect(mocks.process).not.toHaveBeenCalled()
  mocks.rpc.mockResolvedValue({ data: false, error: null })
  expect(
    (
      await POST(
        new Request('https://site/api/admin/content-enrichment/work', {
          method: 'POST',
          headers: { 'x-transcript-worker': 'invalid' },
        }),
      )
    ).status,
  ).toBe(401)
  expect(mocks.process).not.toHaveBeenCalled()
})
it('processes a bounded pair of independent chunks after worker verification', async () => {
  mocks.rpc.mockResolvedValue({ data: true, error: null })
  mocks.process.mockResolvedValue({ processed: true })
  const response = await POST(
    new Request('https://site/api/admin/content-enrichment/work', {
      method: 'POST',
      headers: { 'x-transcript-worker': 'verified' },
    }),
  )
  expect(response.status).toBe(200)
  expect(mocks.process).toHaveBeenCalledTimes(2)
})
