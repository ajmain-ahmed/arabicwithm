import {loadHomeSpotlight} from '@/app/lib/homeSpotlight.server'
import type { Metadata, ResolvingMetadata } from 'next'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchShowsForPublic } from '@/app/actions/cartoons'
import {fetchHomeFeatured} from '@/app/lib/homeFeatured'
import HomeDashboard from '@/app/components/home/HomeDashboard'
import { fetchNewOnEpisodes, fetchNewOnShows } from '@/app/components/home/catalogueRows'
import { fetchHomeEpisodes } from '@/app/lib/homeCatalogue'
import { withDataDeadline } from '@/app/lib/boundedFetch'

// Preserve the root social image while giving the homepage its canonical identity.
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const inherited = await parent
  return {
    openGraph: { ...inherited.openGraph, url: 'https://www.arabicwithm.com/' },
  }
}

export default async function HomePage() {
  return withDataDeadline(8000, async () => {
    const [books, shows, newShows, newEpisodes, spotlight] = await Promise.all([
      fetchBooksForPublic().catch(() => []),
      fetchShowsForPublic().catch(() => []),
      fetchNewOnShows().catch(() => []),
      fetchNewOnEpisodes().catch(() => []),
      loadHomeSpotlight().then(clip=>({clip,error:false})).catch(()=>({clip:null,error:true})),
    ])
    const availableEpisodes = await fetchHomeEpisodes(shows).catch(() => [])
    const dbzEntries = availableEpisodes
      .filter((entry) => entry.show.slug === 'dbz')
      .sort((left, right) => (right.episode.createdAt ?? '').localeCompare(left.episode.createdAt ?? ''))
    const fallbackFeatured = dbzEntries.length > 0
      ? { show: dbzEntries[0].show, episode: dbzEntries[0].episode, episodeCount: dbzEntries.length }
      : null
    const pairs=await fetchHomeFeatured(shows)
    const featured=pairs.length?pairs.map(pair=>{
      const showEpisodes=availableEpisodes.filter(entry=>entry.show.id===pair.show.id)
      return {...pair,episode:showEpisodes[0]?.episode,episodeCount:showEpisodes.length}
    }):fallbackFeatured?[fallbackFeatured]:[]
    return (
      <HomeDashboard
        books={books}
        newShows={newShows}
        newEpisodes={newEpisodes}
        featured={featured}
        spotlight={spotlight}
      />
    )
  })
}
