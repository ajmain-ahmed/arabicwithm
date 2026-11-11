import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { catalogueCoverUrl } from './catalogueCoverUrl'

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co'))
afterEach(() => vi.unstubAllEnvs())

it('uses the canonical public cover directly for books and episodes', () => {
  expect(catalogueCoverUrl({ kind: 'books', id: 'book-id', slug: 'story', cover: 'books/story.webp', version: '2026-11-11' })).toBe('https://project.supabase.co/storage/v1/object/public/covers/books/story.webp?v=2026-11-11')
  expect(catalogueCoverUrl({ kind: 'episodes', id: 'episode-id', slug: 'episode-1' })).toBe('https://project.supabase.co/storage/v1/object/public/covers/episodes/episode-1.webp')
})

it('accepts the matching public storage URL', () => {
  expect(catalogueCoverUrl({ kind: 'episodes', id: 'id', slug: 'one', cover: 'https://project.supabase.co/storage/v1/object/public/covers/episodes/one.webp' })).toBe('https://project.supabase.co/storage/v1/object/public/covers/episodes/one.webp')
})

it('preserves the proxy for private or external cover sources', () => {
  expect(catalogueCoverUrl({ kind: 'books', id: 'book-id', slug: 'story', cover: 'https://project.supabase.co/storage/v1/object/sign/private/story.webp' })).toBe('/api/covers/books/book-id')
  expect(catalogueCoverUrl({ kind: 'episodes', id: 'episode-id', slug: 'one', cover: 'https://images.example.com/cover.webp' })).toBe('/api/covers/episodes/episode-id')
})

it('uses the dedicated canonical show cover even when legacy metadata omitted it', () => {
  expect(catalogueCoverUrl({ kind: 'shows', id: 'show-id', slug: 'show', cover: null })).toBe('https://project.supabase.co/storage/v1/object/public/covers/cartoons/show.webp')
  expect(catalogueCoverUrl({ kind: 'shows', id: 'show-id', slug: 'show', cover: 'cartoons/show.webp' })).toBe('https://project.supabase.co/storage/v1/object/public/covers/cartoons/show.webp')
})

it('falls back when the public site URL is unavailable', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
  expect(catalogueCoverUrl({ kind: 'books', id: 'book-id', slug: 'story' })).toBe('/api/covers/books/book-id')
})
