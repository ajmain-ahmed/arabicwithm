// app/cartoons/page.tsx
// Server Component — fetches cartoon shows and episode slugs from Supabase.

import { fetchShowsForPublic, fetchEpisodesForShowPublic } from '@/app/actions/cartoons'
import CartoonsPage from './CartoonsPage'

export const revalidate = 300

export const metadata = {
  title: 'Arabic Cartoons | ArabicWithM',
  description: 'Watch your favourite cartoons subtitled in Arabic with CEFR-graded worksheets and quizzes.',
}

export default async function Page() {
  const shows = await fetchShowsForPublic()

  // Build a map of show slug → episode slugs for random navigation
  const episodesMap: Record<string, string[]> = {}
  for (const show of shows) {
    const episodes = await fetchEpisodesForShowPublic(show.slug)
    episodesMap[show.slug] = episodes.map((ep) => ep.slug)
  }

  return <CartoonsPage shows={shows} episodesMap={episodesMap} />
}
