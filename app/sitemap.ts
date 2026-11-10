import type { MetadataRoute } from 'next'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchAllEpisodesForPublic, fetchShowsForPublic } from '@/app/actions/cartoons'

export const revalidate = 3600

const origin = 'https://www.arabicwithm.com'
const staticRoutes = ['/', '/cartoons', '/books', '/explore', '/learn', '/support', '/feedback', '/privacy', '/terms', '/search']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, shows, episodes] = await Promise.all([
    fetchBooksForPublic(),
    fetchShowsForPublic(),
    fetchAllEpisodesForPublic(),
  ])
  const showSlugs = new Map(shows.map(show => [show.id, show.slug]))
  return [
    ...staticRoutes.map(path => ({ url: `${origin}${path}`, changeFrequency: path === '/' ? 'daily' as const : 'weekly' as const, priority: path === '/' ? 1 : 0.7 })),
    ...books.filter(book => book.isCompleted !== false).map(book => ({ url: `${origin}/books/${encodeURIComponent(book.slug)}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...shows.map(show => ({ url: `${origin}/cartoons/${encodeURIComponent(show.slug)}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...episodes.flatMap(episode => {
      const showSlug = showSlugs.get(episode.showId)
      return showSlug ? [{ url: `${origin}/cartoons/${encodeURIComponent(showSlug)}/${encodeURIComponent(episode.slug)}`, lastModified: episode.createdAt, changeFrequency: 'monthly' as const, priority: 0.6 }] : []
    }),
  ]
}
