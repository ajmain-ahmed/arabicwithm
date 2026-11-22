import type { MetadataRoute } from 'next'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchAllEpisodesForPublic, fetchShowsForPublic } from '@/app/actions/cartoons'
import { fetchPublicTranscriptSitemap } from '@/app/actions/transcripts'
import { SITE_URL } from '@/app/lib/seo'

export const revalidate = 3600

const staticRoutes = ['/', '/cartoons', '/books', '/explore', '/learn', '/support', '/privacy', '/terms']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [books, shows, episodes, transcripts] = await Promise.all([
    fetchBooksForPublic(),
    fetchShowsForPublic(),
    fetchAllEpisodesForPublic(),
    fetchPublicTranscriptSitemap(),
  ])
  const showSlugs = new Map(shows.map(show => [show.id, show.slug]))
  const readingLevels = ['a1','a2','b1','b2','c1','c2'].filter(level => books.filter(book => book.isCompleted !== false && book.level.toLowerCase() === level).length >= 2)
  return [
    ...staticRoutes.map(path => ({ url: `${SITE_URL}${path}`, changeFrequency: path === '/' ? 'daily' as const : 'weekly' as const, priority: path === '/' ? 1 : 0.7 })),
    ...readingLevels.map(level => ({ url: `${SITE_URL}/books/level/${level}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...books.filter(book => book.isCompleted !== false).map(book => ({ url: `${SITE_URL}/books/${encodeURIComponent(book.slug)}`, lastModified: book.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...shows.map(show => ({ url: `${SITE_URL}/cartoons/${encodeURIComponent(show.slug)}`, lastModified: show.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...episodes.flatMap(episode => {
      const showSlug = showSlugs.get(episode.showId)
      return showSlug ? [{ url: `${SITE_URL}/cartoons/${encodeURIComponent(showSlug)}/${encodeURIComponent(episode.slug)}`, lastModified: episode.updatedAt ?? episode.createdAt, changeFrequency: 'monthly' as const, priority: 0.6 }] : []
    }),
    ...transcripts.map(transcript => ({ url: `${SITE_URL}/transcripts/${transcript.id}`, lastModified: transcript.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ]
}
