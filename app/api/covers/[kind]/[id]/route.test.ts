// @vitest-environment node
import { createHash } from 'node:crypto'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ single: vi.fn(), sign: vi.fn(), download: vi.fn(), bucket: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.single }) }) }),
  storage: { from: mocks.bucket },
} }))
import { GET } from './route'

const BYTES = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]) // minimal fake payload
const ETAG = `"${createHash('md5').update(BYTES).digest('hex')}"`
const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800'

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co')
  mocks.single.mockReset()
  mocks.sign.mockReset()
  mocks.download.mockReset()
  mocks.bucket.mockReset()
  mocks.bucket.mockReturnValue({ createSignedUrl: mocks.sign, download: mocks.download })
  mocks.sign.mockResolvedValue({ data: { signedUrl: 'https://project.supabase.co/signed-cover' }, error: null })
  mocks.download.mockResolvedValue({ data: new Blob([BYTES]), error: null })
})

const request = (headers?: HeadersInit) => GET(new Request('http://localhost/api/covers/episodes/item', { headers }), { params: Promise.resolve({ kind: 'episodes', id: 'item' }) })

it.each(['episodes/upload.webp', 'covers/episodes/upload.webp', 'https://project.supabase.co/storage/v1/object/public/covers/episodes/upload.webp'])('serves the uploaded object as cacheable bytes before any YouTube fallback: %s', async cover => {
  mocks.single.mockResolvedValue({ data: { cover, slug: 'legacy', youtube_id: 'abcdefghijk' }, error: null })
  const response = await request()
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/webp')
  expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL)
  expect(response.headers.get('etag')).toBe(ETAG)
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(BYTES)
  expect(mocks.sign).not.toHaveBeenCalled()
})

it('revalidates with 304 when the browser already has the bytes', async () => {
  mocks.single.mockResolvedValue({ data: { cover: '', slug: 'legacy', youtube_id: 'abcdefghijk' }, error: null })
  const response = await request({ 'If-None-Match': ETAG })
  expect(response.status).toBe(304)
  expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL)
  expect(response.headers.get('etag')).toBe(ETAG)
})

it('falls back to the canonical cover when the uploaded object is missing', async () => {
  mocks.single.mockResolvedValue({ data: { cover: 'episodes/upload.webp', slug: 'legacy', youtube_id: 'abcdefghijk' }, error: null })
  mocks.download
    .mockResolvedValueOnce({ data: null, error: { message: 'Object not found' } })
    .mockResolvedValueOnce({ data: new Blob([BYTES]), error: null })
  const response = await request()
  expect(response.status).toBe(200)
  expect(mocks.download).toHaveBeenNthCalledWith(2, 'episodes/legacy.webp')
  expect(response.headers.get('cache-control')).toBe(CACHE_CONTROL)
  expect(mocks.sign).not.toHaveBeenCalled()
})

it('falls back to the YouTube thumbnail when no Storage cover exists', async () => {
  mocks.single.mockResolvedValue({ data: { cover: '', slug: 'legacy', youtube_id: 'abcdefghijk' }, error: null })
  mocks.download.mockResolvedValue({ data: null, error: { message: 'Object not found' } })
  const response = await request()
  expect(response.status).toBe(307)
  expect(response.headers.get('location')).toBe('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg')
  expect(mocks.sign).not.toHaveBeenCalled()
})

it('refreshes a stored private signed URL instead of reusing its expired token', async () => {
  mocks.single.mockResolvedValue({ data: { cover: 'https://project.supabase.co/storage/v1/object/sign/private/cover.webp?token=expired' }, error: null })
  const response = await request()
  expect(mocks.bucket).toHaveBeenCalledWith('private')
  expect(mocks.sign).toHaveBeenCalledWith('cover.webp', 3600)
  expect(response.headers.get('location')).toBe('https://project.supabase.co/signed-cover')
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(mocks.download).not.toHaveBeenCalled()
})

it('does not resolve arbitrary paths without a catalogue record', async () => {
  mocks.single.mockResolvedValue({ data: null, error: null })
  expect((await request()).status).toBe(404)
  expect(mocks.download).not.toHaveBeenCalled()
  expect(mocks.sign).not.toHaveBeenCalled()
})
