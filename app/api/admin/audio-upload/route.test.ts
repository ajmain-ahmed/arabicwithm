// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ guard: vi.fn(), chapter: vi.fn(), sign: vi.fn() }))
vi.mock('@/app/actions/auth', () => ({ guardAdmin: mocks.guard }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.chapter }) }) }),
  storage: { from: () => ({ createSignedUploadUrl: mocks.sign }) },
} }))
import { POST } from './route'
const id = '11111111-1111-4111-8111-111111111111'
const request = (language = 'ar', size = 6 * 1024 * 1024, origin = 'https://awm.test') => new Request('https://awm.test/api/admin/audio-upload', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ chapterId: id, language, extension: 'mp3', size }) })
beforeEach(() => {
  vi.resetAllMocks(); mocks.guard.mockResolvedValue(undefined)
  mocks.chapter.mockResolvedValue({ data: { id }, error: null })
  mocks.sign.mockImplementation(async path => ({ data: { path, token: 'scoped-token' }, error: null }))
})
it('authorizes large files with distinct paths for each language and replacement', async () => {
  const ar = await (await POST(request())).json()
  const en = await (await POST(request('en'))).json()
  const replacement = await (await POST(request())).json()
  expect(ar.path).toMatch(`${id}/ar/`); expect(en.path).toMatch(`${id}/en/`)
  expect(ar.path).not.toBe(replacement.path); expect(ar.token).toBe('scoped-token')
})
it('denies unauthorized and cross-origin requests before issuing tokens', async () => {
  expect((await POST(request('ar', 100, 'https://other.test'))).status).toBe(403)
  expect(mocks.guard).not.toHaveBeenCalled()
  mocks.guard.mockRejectedValue(new Error('Forbidden'))
  const response = await POST(request())
  expect(response.status).toBe(403); expect((await response.json()).error).toContain('administrator')
  expect(mocks.sign).not.toHaveBeenCalled()
})
it('reports invalid language, oversize, missing chapter, and storage errors specifically', async () => {
  expect((await POST(request('fr'))).status).toBe(400)
  expect((await POST(request('en', 51 * 1024 * 1024))).status).toBe(400)
  mocks.chapter.mockResolvedValueOnce({ data: null, error: null })
  expect((await POST(request())).status).toBe(404)
  mocks.sign.mockResolvedValueOnce({ data: null, error: { message: 'Bucket not found' } })
  expect((await (await POST(request())).json()).error).toContain('Bucket not found')
})
