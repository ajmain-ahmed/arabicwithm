// app/cartoons/page.tsx
// Server Component — fetches cartoon shows and episode slugs from Supabase.

import { fetchShowsForPublic, fetchEpisodesForShowPublic } from '@/app/actions/cartoons'
import { canonicalizeCartoonCategory } from '@/app/lib/cartoons'
import CartoonsPage from './CartoonsPage'

export const revalidate = 300

export const metadata = {
  title: 'Arabic Cartoons | ArabicWithM',
  description: 'Watch your favourite cartoons with interactive Arabic transcripts.',
}

export default async function Page() {
  const shows = await fetchShowsForPublic()

  // Build a map of show slug → episode slugs for random navigation
  const episodesMap: Record<string, string[]> = {}
  const showCategories: Record<string, string[]> = {}
  const categoryLabels = new Map<string, string>()

  const episodesByShow = await Promise.all(
    shows.map(async (show) => ({
      show,
      episodes: await fetchEpisodesForShowPublic(show.slug),
    }))
  )

  for (const { show, episodes } of episodesByShow) {
    episodesMap[show.slug] = episodes.map((ep) => ep.slug)

    const categoriesForShow = new Map<string, string>()
    const sourceCategories = [show.category, ...episodes.flatMap((ep) => ep.tags)]
    for (const sourceCategory of sourceCategories) {
      const category = canonicalizeCartoonCategory(sourceCategory)
      if (!category) continue

      const categoryKey = category.toLowerCase()
      categoryLabels.set(categoryKey, category)
      categoriesForShow.set(categoryKey, category)
    }
    showCategories[show.slug] = Array.from(categoriesForShow.values())
  }

  const availableCategories = Array.from(categoryLabels.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
  availableCategories.unshift('All Shows')

  return (
    <CartoonsPage
      shows={shows}
      episodesMap={episodesMap}
      showCategories={showCategories}
      availableCategories={availableCategories}
    />
  )
}
