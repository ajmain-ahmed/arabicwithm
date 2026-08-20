import { fetchBooksForPublic, fetchChaptersForBookPublic } from '@/app/actions/books'
import { fetchEpisodesForShowPublic, fetchShowsForPublic } from '@/app/actions/cartoons'
import HomeDashboard from '@/app/components/home/HomeDashboard'
import { dailyRotationIndex } from '@/app/lib/dailyRotation'

export const revalidate = 300

export default async function HomePage() {
  const [books, shows] = await Promise.all([
    fetchBooksForPublic(),
    fetchShowsForPublic(),
  ])
  const chapterEntries = await Promise.all(books.map(async (book) => [book.slug, await fetchChaptersForBookPublic(book.id)] as const))
  const episodeEntries = await Promise.all(
    shows
      .filter((show) => show.episodeCount > 0)
      .map(async (show) => ({ show, episodes: await fetchEpisodesForShowPublic(show.slug) }))
  )
  const rotationDate = new Date()
  const availableEpisodes = episodeEntries.flatMap(({ show, episodes }) =>
    episodes.map((episode) => ({ show, episode }))
  )
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
    />
  )
}
