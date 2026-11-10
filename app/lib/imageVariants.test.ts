// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { coverVariantPath, coverVariantPaths, featuredImageSrcSet, featuredVariantPaths } from './imageVariantPaths'

it('builds direct responsive featured URLs while preserving the version', () => {
  const source = 'https://project.supabase.co/storage/v1/object/public/covers/featured/show.avif?v=version'
  expect(featuredImageSrcSet(source)).toBe('https://project.supabase.co/storage/v1/object/public/covers/variants/featured/show-828.avif?v=version 828w, https://project.supabase.co/storage/v1/object/public/covers/variants/featured/show-1600.avif?v=version 1600w')
  expect(featuredImageSrcSet('/homepage/fallback.avif')).toBeUndefined()
})

it('keeps variants outside the admin source listing and rejects traversal', () => {
  expect(featuredVariantPaths('featured/show.avif')).toEqual(['variants/featured/show-828.avif', 'variants/featured/show-1600.avif'])
  expect(featuredVariantPaths('featured/../secret.avif')).toEqual([])
  expect(coverVariantPath('books/exo.webp', 640)).toBe('variants/books/exo-640.webp')
  expect(coverVariantPaths('books/exo.webp')).toEqual(['variants/books/exo-640.webp', 'variants/books/exo-1080.webp'])
  expect(coverVariantPath('books/exo.webp', 500)).toBeNull()
})

vi.mock('server-only', () => ({}))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { storage: { from: () => ({ upload: vi.fn(async () => ({ error: null })), remove: vi.fn(async () => ({ error: null })) }) } } }))
it('generates real AVIF variants from an uploaded source', async () => {
  const sharp = (await import('sharp')).default
  const image = sharp({ create: { width: 1800, height: 900, channels: 3, background: '#046154' } })
  const file = new File([await image.png().toBuffer()], 'source.png', { type: 'image/png' })
  const { syncImageVariants } = await import('./imageVariants')
  await expect(syncImageVariants(file, 'featured/show.png')).resolves.toBeUndefined()
})
