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

class UploadXHR {
  static current: UploadXHR
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {}
  onload?: () => void; onerror?: () => void; onabort?: () => void; ontimeout?: () => void
  status = 200; responseText = '{"Key":"audiobooks/chapter/ar/new.mp3"}'; timeout = 0
  open = vi.fn(); setRequestHeader = vi.fn(); send = vi.fn()
  constructor() { UploadXHR.current = this }
  abort() { this.onabort?.() }
}

it('reports actual byte percentages and confirms the storage key before completing', async () => {
  vi.stubGlobal('XMLHttpRequest', UploadXHR)
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ path: 'chapter/ar/new.mp3', token: 'token', signedUrl: 'https://storage.test/upload?token=secret' }) })
  const onProgress = vi.fn()
  const promise = uploadChapterAudio('chapter', 'ar', file(), { onProgress })
  await vi.waitFor(() => expect(UploadXHR.current.send).toHaveBeenCalled())
  const xhr = UploadXHR.current
  xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 })
  xhr.upload.onprogress?.({ lengthComputable: true, loaded: 75, total: 100 })
  expect(onProgress.mock.calls.map(([percent]) => percent)).toEqual([0, 25, 75])
  xhr.onload?.()
  expect(await promise).toBe('chapter/ar/new.mp3')
  expect(onProgress).toHaveBeenLastCalledWith(100)
  expect(xhr.setRequestHeader).toHaveBeenCalledWith('x-upsert', 'false')
})

it('cancels the actual upload without reporting completion', async () => {
  vi.stubGlobal('XMLHttpRequest', UploadXHR)
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ path: 'chapter/ar/new.mp3', token: 'token', signedUrl: 'https://storage.test/upload' }) })
  const controller = new AbortController(), onProgress = vi.fn()
  const previous = UploadXHR.current
  const promise = uploadChapterAudio('chapter', 'ar', file(), { signal: controller.signal, onProgress })
  const rejected = expect(promise).rejects.toThrow('cancelled')
  await vi.waitFor(() => { expect(UploadXHR.current).not.toBe(previous); expect(UploadXHR.current.send).toHaveBeenCalled() })
  controller.abort()
  await rejected
  expect(onProgress).not.toHaveBeenCalledWith(100)
})
// @vitest-environment node
