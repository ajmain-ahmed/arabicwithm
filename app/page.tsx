import { fetchBooksForPublic, fetchChaptersForBookPublic } from '@/app/actions/books'
import { fetchShowsForPublic } from '@/app/actions/cartoons'
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
  return <HomeDashboard books={books} shows={shows} chaptersByBook={Object.fromEntries(chapterEntries)} wordOfTheDay={wordOfTheDay} />
}
