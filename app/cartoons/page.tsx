import { fetchShowsForPublic, fetchEpisodesForShowPublic } from '@/app/actions/cartoons'
import { canonicalizeCartoonCategory } from '@/app/lib/cartoons'
import CartoonsPage from './CartoonsPage'

export const revalidate = false

export const metadata = {
  title: 'Arabic Cartoons | ArabicWithM',
  description: 'Watch your favourite cartoons with interactive Arabic transcripts.',
}

export default async function Page() {
  const shows = await fetchShowsForPublic()
  const episodesMap: Record<string, string[]> = {}
  const showCategories: Record<string, string> = {}
  const showAdditionalTags: Record<string, string[]> = {}
  const categoryLabels = new Map<string, string>()

  const episodesByShow = await Promise.all(
    shows.map(async (show) => ({
      show,
      episodes: await fetchEpisodesForShowPublic(show.slug),
    }))
  )

  for (const { show } of episodesByShow) {
    const category = canonicalizeCartoonCategory(show.category)
    if (!category) continue
    categoryLabels.set(category.toLowerCase(), category)
    showCategories[show.slug] = category
  }

  const episodes = episodesByShow.flatMap(({ show, episodes: showEpisodes }) => {
    episodesMap[show.slug] = showEpisodes.map((episode) => episode.slug)
    return showEpisodes.map((episode) => ({
      ...episode,
      showId: show.id,
      showSlug: show.slug,
      showTitle: show.title,
      showCategory: showCategories[show.slug],
    }))
  }).sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))

  const mainCategoryKeys = new Set(categoryLabels.keys())
  const additionalTagLabels = new Map<string, string>()
  for (const { show, episodes: showEpisodes } of episodesByShow) {
    const showTags = new Map<string, string>()
    for (const rawTag of showEpisodes.flatMap((episode) => episode.tags)) {
      const tag = rawTag.trim().replace(/\s+/g, ' ')
      if (!tag) continue
      const broadCategory = canonicalizeCartoonCategory(tag)
      if (broadCategory && mainCategoryKeys.has(broadCategory.toLowerCase())) continue
      showTags.set(tag.toLowerCase(), tag)
      additionalTagLabels.set(tag.toLowerCase(), tag)
    }
    showAdditionalTags[show.slug] = Array.from(showTags.values())
  }

  const availableCategories = [
    'All Categories',
    ...Array.from(categoryLabels.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
  ]
  const availableAdditionalTags = Array.from(additionalTagLabels.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )

  return (
    <CartoonsPage
      shows={shows}
      episodes={episodes}
      episodesMap={episodesMap}
      showCategories={showCategories}
      showAdditionalTags={showAdditionalTags}
      availableCategories={availableCategories}
      availableAdditionalTags={availableAdditionalTags}
    />
  )
}
