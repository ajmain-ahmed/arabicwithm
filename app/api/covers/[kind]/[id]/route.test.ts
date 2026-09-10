// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ single: vi.fn(), sign: vi.fn(), bucket: vi.fn() }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.single }) }) }),
  storage: { from: mocks.bucket },
} }))
import { GET } from './route'
beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co')
  mocks.bucket.mockReturnValue({ createSignedUrl: mocks.sign })
  mocks.sign.mockResolvedValue({ data: { signedUrl: 'https://project.supabase.co/signed-cover' }, error: null })
  vi.clearAllMocks()
})
const request = () => GET(new Request('http://localhost/api/covers/episodes/item'), { params: Promise.resolve({ kind: 'episodes', id: 'item' }) })
it.each(['episodes/upload.webp', 'covers/episodes/upload.webp', 'https://project.supabase.co/storage/v1/object/public/covers/episodes/upload.webp'])('signs the uploaded object before any YouTube fallback: %s', async cover => {
  mocks.single.mockResolvedValue({ data: { cover, slug: 'legacy', youtube_id: 'abcdefghijk' }, error: null })
  const response = await request()
  expect(mocks.bucket).toHaveBeenCalledWith('covers')
  expect(mocks.sign).toHaveBeenCalledWith('episodes/upload.webp', 3600)
  expect(response.headers.get('location')).toBe('https://project.supabase.co/signed-cover')
  expect(response.headers.get('cache-control')).toBe('no-store')
})
it('refreshes a stored private signed URL instead of reusing its expired token', async () => {
  mocks.single.mockResolvedValue({ data: { cover: 'https://project.supabase.co/storage/v1/object/sign/private/cover.webp?token=expired' }, error: null })
  await request()
  expect(mocks.bucket).toHaveBeenCalledWith('private')
  expect(mocks.sign).toHaveBeenCalledWith('cover.webp', 3600)
})
it('does not sign arbitrary paths without a catalogue record', async () => {
  mocks.single.mockResolvedValue({ data: null, error: null })
  expect((await request()).status).toBe(404)
  expect(mocks.sign).not.toHaveBeenCalled()
})
