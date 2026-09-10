export const EXPLORE_AUDIO_STORAGE_KEY = 'awm-explore-sound-enabled-v1'
export const EXPLORE_AUDIO_EVENT = 'awm-explore-sound-preference-change'
export const EXPLORE_READING_DURATION_MS = 10_000

import type { ExploreEpisode, ExploreEpisodeMeta } from '@/app/lib/cartoons'
import type { ExploreBookChapterMeta, ExploreBookPage } from '@/app/actions/books'

let inMemorySoundPreference: boolean | null = null

export interface ExploreDefinitionEntry {
  arabic: string
  plain?: string
  headword?: string
  lemma?: string
  entry_type?: 'word' | 'phrase'
}

export function parseExploreSoundPreference(value: string | null): boolean {
  return value !== 'muted'
}

export function getExploreSoundPreference(): boolean {
  if (typeof window === 'undefined') return inMemorySoundPreference ?? true
  try {
    const preference = parseExploreSoundPreference(window.localStorage.getItem(EXPLORE_AUDIO_STORAGE_KEY))
    inMemorySoundPreference = preference
    return preference
  } catch {
    return inMemorySoundPreference ?? true
  }
}

export function setExploreSoundPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return
  inMemorySoundPreference = enabled
  try {
    window.localStorage.setItem(EXPLORE_AUDIO_STORAGE_KEY, enabled ? 'sound' : 'muted')
  } catch {
    // The current Explore session still keeps the preference in React state.
  }
  window.dispatchEvent(new CustomEvent(EXPLORE_AUDIO_EVENT, { detail: enabled }))
}

export function subscribeToExploreSoundPreference(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handleStorage = (event: StorageEvent) => {
    if (event.key === EXPLORE_AUDIO_STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(EXPLORE_AUDIO_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(EXPLORE_AUDIO_EVENT, onChange)
  }
}

export function definitionCacheKey(context: string, entry: ExploreDefinitionEntry): string {
  const identity = entry.headword ?? entry.lemma ?? entry.plain ?? entry.arabic
  return `${context}|${entry.entry_type ?? 'word'}|${identity.normalize('NFC')}`
}

export function nextExploreIndex(currentIndex: number, itemCount: number): number | null {
  if (itemCount <= 1 || currentIndex < 0 || currentIndex >= itemCount) return null
  return (currentIndex + 1) % itemCount
}

// A visit has its own seed; pagination retains that seed for stable ordering.
export const EXPLORE_PAGE_SIZE = 12
export const EXPLORE_PREFETCH_AHEAD = 3

export type ExploreFeedItem =
  | { kind: 'video'; episode: ExploreEpisode }
  | { kind: 'book'; page: ExploreBookPage }

export interface ExploreFeedBatch {
  items: ExploreFeedItem[]
  hasMore: boolean
}

/* Plan-level items: cheap to build and cache in bulk. */
export type ExploreFeedPlanItem =
  | { kind: 'video'; episodeId: string }
  | { kind: 'book'; chapterId: string; pageIndex: number }

export interface ExploreFeedPlanBatch {
  items: ExploreFeedPlanItem[]
  hasMore: boolean
}

export function getExploreSeed(): string {
  return crypto.randomUUID()
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffled<T>(items: readonly T[], seed: string): T[] {
  const random = mulberry32(hashSeed(seed))
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

export function buildExploreFeedPlan(
  episodes: readonly ExploreEpisodeMeta[],
  bookChapters: readonly ExploreBookChapterMeta[],
  bookPageCounts: Record<string, number>,
  seed: string,
): ExploreFeedPlanItem[] {
  const videos = seededShuffled(episodes, `${seed}:videos`).map((episode) => ({
    kind: 'video' as const,
    episodeId: episode.id,
  }))
  const bookSlots = bookChapters.flatMap((chapter) => {
    const pageCount = Math.max(0, bookPageCounts[chapter.chapterId] ?? 0)
    return Array.from({ length: pageCount }, (_, pageIndex) => ({
      kind: 'book' as const,
      chapterId: chapter.chapterId,
      pageIndex,
    }))
  })
  const pages = seededShuffled(bookSlots, `${seed}:books`)
  if (videos.length === 0) return pages

  const items: ExploreFeedPlanItem[] = []
  let pageIndex = 0
  videos.forEach((video, index) => {
    items.push(video)
    if ((index + 1) % 3 === 0 && pages.length > 0) {
      items.push(pages[pageIndex % pages.length])
      pageIndex += 1
    }
  })
  return items
}

export function sliceExploreFeedBatch(
  allItems: readonly ExploreFeedPlanItem[],
  page: number,
  pageSize = EXPLORE_PAGE_SIZE,
): ExploreFeedPlanBatch {
  const safePage = Number.isInteger(page) && page >= 0 ? page : 0
  const start = safePage * pageSize
  return {
    items: allItems.slice(start, start + pageSize),
    hasMore: start + pageSize < allItems.length,
  }
}
