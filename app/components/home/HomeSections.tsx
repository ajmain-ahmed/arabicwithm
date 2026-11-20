import { dailyHomeOrder } from '@/app/lib/homeRotation'
import { loadDailyPhrase } from '@/app/lib/dailyPhrase.server'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchNewOnEpisodes, fetchNewOnShows } from '@/app/components/home/catalogueRows'
import HomeDashboard from './HomeDashboard'
import HomeForYouSpotlight from './HomeForYouSpotlight'
import FeaturedCarousel from './FeaturedCarousel'
import type { FeaturedShow } from './FeaturedHero'

export async function FeaturedSection({ selection }: { selection: Promise<FeaturedShow[]> }) {
  const items = await selection
  // Preserve the original reset when rotation/admin edits change the slide pool.
  return <FeaturedCarousel key={items.map(item => item.show.id).join(':')} items={items} />
}

export async function CatalogueSection({ data, now }: {
  data: Promise<[Awaited<ReturnType<typeof fetchBooksForPublic>>, Awaited<ReturnType<typeof fetchNewOnShows>>, Awaited<ReturnType<typeof fetchNewOnEpisodes>>, Awaited<ReturnType<typeof loadDailyPhrase>>]>
  now: Date
}) {
  const [books, newShows, newEpisodes, dailyPhrase] = await data
  return <HomeDashboard books={books} dailyPhrase={dailyPhrase}
    homepageBooks={dailyHomeOrder(books.filter(book => book.isCompleted !== false), 'books', now)}
    newShows={dailyHomeOrder(newShows, 'shows', now)} newEpisodes={newEpisodes}
    showFeatured={false}
    spotlightArea={<HomeForYouSpotlight discover />} />
}

