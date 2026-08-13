import { fetchBooksForPublic, fetchChaptersForBookPublic } from '@/app/actions/books'
import { fetchEpisodesForShowPublic, fetchShowsForPublic } from '@/app/actions/cartoons'
import { fetchWordOfTheDay } from '@/app/actions/vocabulary'
import HomeDashboard from '@/app/components/home/HomeDashboard'

export const revalidate = 300

export default async function HomePage() {
  const [books, shows, wordOfTheDay] = await Promise.all([
    fetchBooksForPublic(),
    fetchShowsForPublic(),
    fetchWordOfTheDay(),
  ])
  const chapterEntries = await Promise.all(books.map(async (book) => [book.slug, await fetchChaptersForBookPublic(book.id)] as const))
  const episodeEntries = await Promise.all(
    shows
      .filter((show) => show.episodeCount > 0)
      .map(async (show) => ({ show, episodes: await fetchEpisodesForShowPublic(show.slug) }))
  )
  const firstEpisodeEntry = episodeEntries.find(({ episodes }) => episodes.length > 0)
  const featuredEpisode = firstEpisodeEntry
    ? { show: firstEpisodeEntry.show, episode: firstEpisodeEntry.episodes[0] }
    : null

  return (
    <HomeDashboard
      books={books}
      featuredEpisode={featuredEpisode}
      chaptersByBook={Object.fromEntries(chapterEntries)}
      wordOfTheDay={wordOfTheDay}
    />
  )
}
