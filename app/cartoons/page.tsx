// app/cartoons/page.tsx
// This is a Server Component — no 'use client' needed.
// It reads the filesystem and passes data to the client shell.

import { getAllShows, getEpisodesForShow } from '../lib/cartoons'
import CartoonsPage from './CartoonsPage'

export const metadata = {
  title: 'Arabic Cartoons | ArabicWithM',
  description: 'Watch your favourite cartoons subtitled in Arabic with CEFR-graded worksheets and quizzes.',
}

export default function Page() {
  const shows = getAllShows()

  // Build a map of show slug → episode slugs for random navigation
  const episodesMap: Record<string, string[]> = {}
  for (const show of shows) {
    const episodes = getEpisodesForShow(show.slug)
    episodesMap[show.slug] = episodes.map((ep) => ep.slug)
  }

  return <CartoonsPage shows={shows} episodesMap={episodesMap} />
}
