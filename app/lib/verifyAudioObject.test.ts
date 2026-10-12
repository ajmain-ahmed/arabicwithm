// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ info: vi.fn(), sign: vi.fn(), fetch: vi.fn() }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { storage: { from: () => ({ info: mocks.info, createSignedUrl: mocks.sign }) } } }))
import { verifyAudioObject } from './verifyAudioObject'
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch', mocks.fetch); mocks.info.mockResolvedValue({ data: { size: 100 }, error: null }); mocks.sign.mockResolvedValue({ data: { signedUrl: 'https://storage.test/private' }, error: null }) })
afterEach(() => vi.unstubAllGlobals())
it('checks actual stored bytes using a bounded range request', async () => {
  mocks.fetch.mockResolvedValue(new Response(new Uint8Array([0x49, 0x44, 0x33, 4])))
  await verifyAudioObject('chapter/ar/file.mp3')
  expect(mocks.fetch).toHaveBeenCalledWith('https://storage.test/private', { headers: { Range: 'bytes=0-15' }, cache: 'no-store', signal: expect.any(AbortSignal) })
})
it('rejects fake audio and empty stored files before persisting', async () => {
  mocks.fetch.mockResolvedValue(new Response('not audio'))
  await expect(verifyAudioObject('file.mp3')).rejects.toThrow('valid MP3')
  mocks.info.mockResolvedValueOnce({ data: { size: 0 }, error: null })
  await expect(verifyAudioObject('file.mp3')).rejects.toThrow('empty or inaccessible')
})
