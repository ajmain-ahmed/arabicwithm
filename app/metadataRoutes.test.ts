// @vitest-environment node
import { expect, it, vi } from 'vitest'

vi.mock('@/app/actions/books', () => ({ fetchBooksForPublic: async () => [{ slug: 'released', isCompleted: true }, { slug: 'draft', isCompleted: false }] }))
vi.mock('@/app/actions/cartoons', () => ({
  fetchShowsForPublic: async () => [{ id: 'show-id', slug: 'show' }],
  fetchAllEpisodesForPublic: async () => [{ showId: 'show-id', slug: 'episode', createdAt: '2026-01-01' }],
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
  expect(urls).not.toContain('https://www.arabicwithm.com/books/draft')
  expect(urls.every(url => url.startsWith('https://www.arabicwithm.com/'))).toBe(true)
})
