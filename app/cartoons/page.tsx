import { Suspense } from 'react'
import { fetchShowsForPublic, fetchAllEpisodesForPublic } from '@/app/actions/cartoons'
import { canonicalizeCartoonCategory, WATCH_LEVELS } from '@/app/lib/cartoons'
import CartoonsPage, { CartoonsPageSkeleton } from './CartoonsPage'

export const revalidate = 3600

export const metadata = {
  title: 'Arabic Cartoons | ArabicWithM',
  description: 'Watch your favourite cartoons with interactive Arabic transcripts.',
}

const PAGE_SIZE = 24
type SearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase())
}

function sanitizeParam(value: string, allowed: string[]): string {
  return allowed.includes(value) ? value : ''
}

export default function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<CartoonsPageSkeleton />}>
      <Catalogue searchParams={searchParams} />
    </Suspense>
  )
}

async function Catalogue({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const [shows, allEpisodes] = await Promise.all([
    fetchShowsForPublic(),
    fetchAllEpisodesForPublic(),
  ])
  const showById = new Map(shows.map((show) => [show.id, show]))
  const episodesByShow = new Map<string, typeof allEpisodes>()
  for (const episode of allEpisodes) {
    const list = episodesByShow.get(episode.showId) ?? []
    list.push(episode)
    episodesByShow.set(episode.showId, list)
  }

  const showCategories: Record<string, string> = {}
  const categoryLabels = new Map<string, string>()
  const mainCategoryKeys = new Set<string>()
  const showAdditionalTags: Record<string, string[]> = {}
  for (const show of shows) {
    const category = canonicalizeCartoonCategory(show.category)
    if (category) {
      categoryLabels.set(category.toLowerCase(), category)
      showCategories[show.slug] = category
      mainCategoryKeys.add(category.toLowerCase())
    }
    const showTags = new Map<string, string>()
    for (const rawTag of (episodesByShow.get(show.id) ?? []).flatMap((episode) => episode.tags)) {
      const tag = rawTag.trim().replace(/\s+/g, ' ')
      if (!tag) continue
      const broadCategory = canonicalizeCartoonCategory(tag)
      if (broadCategory && mainCategoryKeys.has(broadCategory.toLowerCase())) continue
      showTags.set(tag.toLowerCase(), tag)
    }
    showAdditionalTags[show.slug] = Array.from(showTags.values())
  }

  const availableCategories = [
    'All Categories',
    ...Array.from(categoryLabels.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
  ]
  const filters = {
    category: sanitizeParam(firstParam(sp.category), availableCategories),
    level: sanitizeParam(firstParam(sp.level), WATCH_LEVELS),
  }

  const episodeRows = allEpisodes.flatMap((episode) => {
    const show = showById.get(episode.showId)
    if (!show) return []
    return [{ episode, show, showCategory: showCategories[show.slug] }]
  }).sort((left, right) => (right.episode.createdAt ?? '').localeCompare(left.episode.createdAt ?? ''))

  /* Search filters the already-cached catalogue in memory — no DB cost. */
  const query = firstParam(sp.q).slice(0, 80)
  const searchedEpisodes = query
    ? episodeRows.filter(({ episode, show }) => matchesQuery(episode.title, query) || matchesQuery(show.title, query))
    : episodeRows
  const searchedShows = query
    ? shows.filter((show) => matchesQuery(show.title, query))
    : shows

  const filteredEpisodes = searchedEpisodes.filter(({ episode, showCategory }) => {
    if (filters.category && showCategory !== filters.category) return false
    if (filters.level && episode.level !== filters.level) return false
    return true
  })

  const filteredShows = searchedShows.filter((show) => {
    if (filters.category && showCategories[show.slug] !== filters.category) return false
    if (filters.level && show.level !== filters.level) return false
    return true
  })

  /* Grey out filter options that would produce zero results (given the other
     active filter), so users never reach an empty grid through the UI. */
  const episodesMatch = (category: string, level: string) =>
    episodeRows.some(({ episode, showCategory }) =>
      (!category || category === 'All Categories' || showCategory === category) &&
      (!level || episode.level === level))
  const showsMatch = (category: string, level: string) =>
    shows.some((show) =>
      (!category || category === 'All Categories' || showCategories[show.slug] === category) &&
      (!level || show.level === level))
  const optionHasResults = (category: string, level: string) => episodesMatch(category, level) || showsMatch(category, level)
  const disabledCategories = availableCategories.filter(
    (category) => category !== 'All Categories' && !optionHasResults(category, filters.level)
  )
  const disabledLevels = WATCH_LEVELS.filter(
    (level) => !optionHasResults(filters.category || 'All Categories', level)
  )

  const episodePageCount = Math.max(1, Math.ceil(filteredEpisodes.length / PAGE_SIZE))
  const showPageCount = Math.max(1, Math.ceil(filteredShows.length / PAGE_SIZE))
  const requestedPage = Number.parseInt(firstParam(sp.page), 10)
  const page = Math.min(Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1), Math.max(episodePageCount, showPageCount))
  const slice = <T,>(list: T[]) => list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <CartoonsPage
      shows={slice(filteredShows)}
      episodes={slice(filteredEpisodes).map(({ episode, show, showCategory }) => ({
        ...episode,
        showId: show.id,
        showSlug: show.slug,
        showTitle: show.title,
        showCategory,
      }))}
      query={query}
      showAdditionalTags={Object.fromEntries(slice(filteredShows).map((show) => [show.slug, showAdditionalTags[show.slug] ?? []]))}
      episodeCounts={Object.fromEntries(slice(filteredShows).map((show) => [show.slug, episodesByShow.get(show.id)?.length ?? 0]))}
      availableCategories={availableCategories}
      disabledCategories={disabledCategories}
      disabledLevels={disabledLevels}
      filters={filters}
      page={page}
      episodePageCount={episodePageCount}
      showPageCount={showPageCount}
      totalEpisodes={filteredEpisodes.length}
      totalShows={filteredShows.length}
    />
  )
}
