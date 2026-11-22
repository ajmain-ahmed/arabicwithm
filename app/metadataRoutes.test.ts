// @vitest-environment node
import { expect, it, vi } from 'vitest'

vi.mock('@/app/actions/books', () => ({ fetchBooksForPublic: async () => [
  { slug: 'released', isCompleted: true, level: 'A1', updatedAt: '2026-01-02' },
  { slug: 'released-two', isCompleted: true, level: 'A1', updatedAt: '2026-01-01' },
  { slug: 'draft', isCompleted: false, level: 'A1' },
] }))
vi.mock('@/app/actions/cartoons', () => ({
  fetchShowsForPublic: async () => [{ id: 'show-id', slug: 'show' }],
  fetchAllEpisodesForPublic: async () => [{ showId: 'show-id', slug: 'episode', createdAt: '2026-01-01' }],
}))
vi.mock('@/app/actions/transcripts', () => ({
  fetchPublicTranscriptSitemap: async () => [{ id: 'transcript-id', updatedAt: '2026-01-03' }],
}))

import robots from './robots'
import sitemap from './sitemap'

it('allows public crawling and keeps private application surfaces out', () => {
  const result = robots()
  expect(result.sitemap).toBe('https://www.arabicwithm.com/sitemap.xml')
  expect(result.rules).toMatchObject({ allow: '/' })
  expect(JSON.stringify(result.rules)).not.toContain('Disallow: /private')
})

it('lists released public content on the production domain', async () => {
  const urls = (await sitemap()).map(entry => entry.url)
  expect(urls).toContain('https://www.arabicwithm.com/')
  expect(urls).toContain('https://www.arabicwithm.com/books/released')
  expect(urls).toContain('https://www.arabicwithm.com/cartoons/show/episode')
  expect(urls).toContain('https://www.arabicwithm.com/books/level/a1')
  expect(urls).toContain('https://www.arabicwithm.com/transcripts/transcript-id')
  expect(urls).not.toContain('https://www.arabicwithm.com/books/draft')
  expect(urls).not.toContain('https://www.arabicwithm.com/search')
  expect(urls).not.toContain('https://www.arabicwithm.com/feedback')
  expect(urls.every(url => url.startsWith('https://www.arabicwithm.com/'))).toBe(true)
})
