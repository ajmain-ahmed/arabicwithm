import { fetchBooksForPublic, fetchChapterNavigationForPublic } from '@/app/actions/books'
import { fetchShowsForPublic } from '@/app/actions/cartoons'
import {fetchHomeFeatured} from '@/app/lib/homeFeatured'
import HomeDashboard from '@/app/components/home/HomeDashboard'
import { fetchNewOnEpisodes, fetchNewOnShows } from '@/app/components/home/catalogueRows'
import { fetchHomeEpisodes } from '@/app/lib/homeCatalogue'
import { dailyRotationIndex } from '@/app/lib/dailyRotation'
import { withDataDeadline } from '@/app/lib/boundedFetch'

export const revalidate = 60

export default async function HomePage() {
  return withDataDeadline(8000, async () => {
    const [books, shows, chapterNavigation, newShows, newEpisodes] = await Promise.all([
      fetchBooksForPublic().catch(() => []),
      fetchShowsForPublic().catch(() => []),
      fetchChapterNavigationForPublic().catch(() => ({} as Awaited<ReturnType<typeof fetchChapterNavigationForPublic>>)),
      fetchNewOnShows().catch(() => []),
      fetchNewOnEpisodes().catch(() => []),
    ])
    const availableEpisodes = await fetchHomeEpisodes(shows).catch(() => [])
    const dbzEntries = availableEpisodes
      .filter((entry) => entry.show.slug === 'dbz')
      .sort((left, right) => (right.episode.createdAt ?? '').localeCompare(left.episode.createdAt ?? ''))
    const fallbackFeatured = dbzEntries.length > 0
      ? { show: dbzEntries[0].show, episode: dbzEntries[0].episode, episodeCount: dbzEntries.length }
      : null
    const pair=await fetchHomeFeatured(shows)
    const showEpisodes=pair?availableEpisodes.filter(entry=>entry.show.id===pair.show.id):[]
    const featured=pair?{...pair,episode:showEpisodes[0]?.episode,episodeCount:showEpisodes.length}:fallbackFeatured
    const chapterEntries = books.map(book => [book.slug, chapterNavigation[book.id] ?? []] as const)
    const rotationDate = new Date()
    const featuredEpisodeIndex = dailyRotationIndex(availableEpisodes.length, rotationDate)
    const featuredBookIndex = dailyRotationIndex(books.length, rotationDate, 'Europe/London', 11)
    const featuredEpisode = featuredEpisodeIndex >= 0 ? availableEpisodes[featuredEpisodeIndex] : null
    const featuredBook = featuredBookIndex >= 0 ? books[featuredBookIndex] : null

    return (
      <HomeDashboard
        books={books}
        featuredBook={featuredBook}
        featuredEpisode={featuredEpisode}
        chaptersByBook={Object.fromEntries(chapterEntries)}
        newShows={newShows}
        newEpisodes={newEpisodes}
        featured={featured}
      />
    )
  })
}
