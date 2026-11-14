import { loadDailyPhrase } from '@/app/lib/dailyPhrase.server'
import { connection } from 'next/server'
import { dailyHomeOrder } from '@/app/lib/homeRotation'
import {loadHomeSpotlight} from '@/app/lib/homeSpotlight.server'
import type { Metadata, ResolvingMetadata } from 'next'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchShowsForPublic } from '@/app/actions/cartoons'
import {fetchHomeFeatured} from '@/app/lib/homeFeatured'
import HomeDashboard from '@/app/components/home/HomeDashboard'
import { fetchNewOnEpisodes, fetchNewOnShows } from '@/app/components/home/catalogueRows'
import { fetchHomeEpisodes } from '@/app/lib/homeCatalogue'
import { withDataDeadline } from '@/app/lib/boundedFetch'

// Resolve calendar-dependent presentation per request; catalogue caches remain shared.
export const revalidate = 3600

// Preserve the root social image while giving the homepage its canonical identity.
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const inherited = await parent
  return {
    openGraph: { ...inherited.openGraph, url: 'https://www.arabicwithm.com/' },
  }
}

export default async function HomePage() {
  await connection()
  const now = new Date()
  return withDataDeadline(8000, async () => {
    const [books, shows, newShows, newEpisodes, spotlight, dailyPhrase] = await Promise.all([
      fetchBooksForPublic().catch(() => []),
      fetchShowsForPublic().catch(() => []),
      fetchNewOnShows().catch(() => []),
      fetchNewOnEpisodes().catch(() => []),
      loadHomeSpotlight().then(clip=>({clip,error:false})).catch(()=>({clip:null,error:true})),
      loadDailyPhrase(now),
    ])
    const availableEpisodes = await fetchHomeEpisodes(shows).catch(() => [])
    const dbzEntries = availableEpisodes
      .filter((entry) => entry.show.slug === 'dbz')
      .sort((left, right) => (right.episode.createdAt ?? '').localeCompare(left.episode.createdAt ?? ''))
    const fallbackFeatured = dbzEntries.length > 0
      ? { show: dbzEntries[0].show, episode: dbzEntries[0].episode, episodeCount: dbzEntries.length }
      : null
    const pairs=await fetchHomeFeatured(shows, now)
    const featured=pairs.length?pairs.map(pair=>{
      const showEpisodes=availableEpisodes.filter(entry=>entry.show.id===pair.show.id)
      return {...pair,episode:showEpisodes[0]?.episode,episodeCount:showEpisodes.length}
    }):fallbackFeatured?[fallbackFeatured]:[]
    return (
      <HomeDashboard
        dailyPhrase={dailyPhrase}
        books={books}
        homepageBooks={dailyHomeOrder(books.filter(book => book.isCompleted !== false), 'books', now)}
        newShows={dailyHomeOrder(newShows, 'shows', now)}
        newEpisodes={newEpisodes}
        featured={featured}
        spotlight={spotlight}
      />
    )
  })
}
