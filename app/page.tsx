import { Suspense } from 'react'
import { connection } from 'next/server'
import type { Metadata, ResolvingMetadata } from 'next'
import { Typography } from '@mui/material'
import { loadDailyPhrase } from '@/app/lib/dailyPhrase.server'
import { fetchBooksForPublic } from '@/app/actions/books'
import { fetchShowsForPublic } from '@/app/actions/cartoons'
import { fetchHomeFeatured } from '@/app/lib/homeFeatured'
import FeaturedCarousel from '@/app/components/home/FeaturedCarousel'
import type { FeaturedShow } from '@/app/components/home/FeaturedHero'
import { HomePageLoading } from '@/app/components/PageLoading'
import { fetchNewOnEpisodes, fetchNewOnShows } from '@/app/components/home/catalogueRows'
import { fetchHomeEpisodes } from '@/app/lib/homeCatalogue'
import { withDataDeadline } from '@/app/lib/boundedFetch'

import { CatalogueSection, FeaturedSection } from '@/app/components/home/HomeSections'

export const revalidate = 3600

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const inherited = await parent
  return { alternates: { canonical: '/' }, openGraph: { ...inherited.openGraph, url: 'https://www.arabicwithm.com/' } }
}

export default async function HomePage() {
  await connection()
  const now = new Date()
  // Start independent reads together. Featured never waits for books, phrase,
  // Spotlight, authentication, or account permissions.
  const shows = withDataDeadline(4000, () => fetchShowsForPublic()).catch(() => [])
  const pairs = fetchHomeFeatured(shows, now)
  const episodes = withDataDeadline(4000, () => fetchHomeEpisodes(shows)).catch(() => [])
  const featured = Promise.all([pairs, episodes, shows]).then(([curated, available, catalogue]): FeaturedShow[] => {
    if (curated.length) return curated.map(pair => {
      const entries = available.filter(entry => entry.show.id === pair.show.id)
      return { ...pair, episode: entries[0]?.episode, episodeCount: pair.show.episodeCount }
    })
    // Outages still use the current Featured component, with an existing show
    // cover where possible. No route can substitute the retired static hero.
    const show = catalogue.find(item => item.slug === 'dbz') ?? catalogue[0]
    return show ? [{ show, episode: available.find(entry => entry.show.id === show.id)?.episode, episodeCount: show.episodeCount }] : []
  })
  const data = withDataDeadline(8000, () => Promise.all([
    fetchBooksForPublic().catch(() => []), fetchNewOnShows().catch(() => []),
    fetchNewOnEpisodes().catch(() => []), loadDailyPhrase(now),
  ]))
  return <>
    <Typography component="h1" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>Learn Arabic through cartoons and books</Typography>
    <Suspense fallback={<FeaturedCarousel items={[]} loading />}><FeaturedSection selection={featured} /></Suspense>
    <Suspense fallback={<HomePageLoading rowsOnly />}><CatalogueSection data={data} now={now} /></Suspense>
  </>
}
