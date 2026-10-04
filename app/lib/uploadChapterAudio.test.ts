import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ upload: vi.fn(), fetch: vi.fn() }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl: mocks.upload }) } } }))
import { uploadChapterAudio } from './uploadChapterAudio'
import { File as NodeFile } from 'node:buffer'
const file = (type = '') => new NodeFile([new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0])], 'chapter.mp3', { type }) as unknown as File
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch', mocks.fetch) })
afterEach(() => vi.unstubAllGlobals())
it.each(['', 'audio/mp3', 'audio/mpeg', 'application/octet-stream'])('sends only metadata and canonicalizes the actual multipart body (%s)', async (type) => {
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ path: 'chapter/en/new.mp3', token: 'token' }) })
  mocks.upload.mockResolvedValue({ data: { path: 'chapter/en/new.mp3' }, error: null })
  const audio = file(type)
  expect(await uploadChapterAudio('chapter', 'en', audio)).toBe('chapter/en/new.mp3')
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ chapterId: 'chapter', language: 'en', size: 10, extension: 'mp3' })
  const body = mocks.upload.mock.calls[0][2] as Blob
  expect(body.type).toBe('audio/mpeg')
  expect(await body.arrayBuffer()).toEqual(await audio.arrayBuffer())
  expect(mocks.upload).toHaveBeenCalledWith('chapter/en/new.mp3', 'token', body, { contentType: 'audio/mpeg' })
})
it('surfaces storage errors and non-JSON authorization failures', async () => {
  mocks.fetch.mockResolvedValueOnce({ ok: false, status: 413, json: async () => { throw new Error('html') } })
  await expect(uploadChapterAudio('chapter', 'ar', file())).rejects.toThrow('HTTP 413')
  mocks.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ path: 'path', token: 'token' }) })
  mocks.upload.mockResolvedValue({ error: { message: 'Mime type not supported' } })
  await expect(uploadChapterAudio('chapter', 'ar', file())).rejects.toThrow('Mime type not supported')
})
it('reports a malformed successful response before touching storage', async () => {
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => null })
  await expect(uploadChapterAudio('chapter', 'ar', file())).rejects.toThrow('storage path and token')
  expect(mocks.upload).not.toHaveBeenCalled()
})
// @vitest-environment node
