'use server'

import { getAuthenticatedUserId } from '@/app/actions/auth'
import { getShowCoverPath, getYouTubeThumbnailUrl } from '@/app/lib/cartoons'
import {
  extractMemoryCards,
  parseMemoryCardId,
  sampleMemoryCards,
  type MemoryCard,
  type MemoryEpisodeInput,
  type MemoryRating,
} from '@/app/lib/memory'
import { hasServiceClientConfig, serviceClient } from '@/app/lib/supabase'

export interface MemoryShowSource {
  id: string
  slug: string
  title: string
}

export interface MemoryLibrary {
  cards: MemoryCard[]
  shows: MemoryShowSource[]
  scope: 'global' | 'show' | 'episode'
  scopeTitle: string
  selectedShowId?: string
  selectedEpisodeId?: string
  missingScope: boolean
}

export interface MemoryScopeInput {
  showId?: string
  episodeId?: string
}

type EpisodeRecord = Record<string, unknown>

function customEpisodeCover(row: EpisodeRecord): string | undefined {
  const stored = typeof row.cover === 'string' && /^https:\/\//i.test(row.cover) ? row.cover : undefined
  return stored ?? getYouTubeThumbnailUrl(typeof row.youtube_id === 'string' ? row.youtube_id : undefined)
}

function sampleEpisodeRows(rows: EpisodeRecord[], limit: number): EpisodeRecord[] {
  const sampled = [...rows]
  for (let index = sampled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[sampled[index], sampled[randomIndex]] = [sampled[randomIndex], sampled[index]]
  }
  return sampled.slice(0, limit)
}

export async function fetchMemoryLibrary(input: MemoryScopeInput = {}): Promise<MemoryLibrary> {
  if (!hasServiceClientConfig()) {
    return { cards: [], shows: [], scope: 'global', scopeTitle: 'Random practice', missingScope: false }
  }

  const { data: showRows, error: showError } = await serviceClient
    .from('shows')
    .select('id, slug, title')
    .order('title')
  if (showError) throw new Error(showError.message)

  const shows = (showRows ?? []).map((show) => ({ id: String(show.id), slug: String(show.slug), title: String(show.title) }))
  const showsById = new Map(shows.map((show) => [show.id, show]))
  const scope = input.episodeId ? 'episode' : input.showId ? 'show' : 'global'

  let sourceQuery = serviceClient
    .from('episodes')
    .select('id, show_id, slug, title, cover, youtube_id, created_at')
    .order('created_at', { ascending: false })
  if (input.episodeId) sourceQuery = sourceQuery.eq('id', input.episodeId)
  else if (input.showId) sourceQuery = sourceQuery.eq('show_id', input.showId)

  const { data: sourceRows, error: sourceError } = await sourceQuery
  if (sourceError) throw new Error(sourceError.message)

  const selectedSources = scope === 'episode'
    ? ((sourceRows ?? []) as unknown as EpisodeRecord[])
    : sampleEpisodeRows((sourceRows ?? []) as unknown as EpisodeRecord[], 24)
  const selectedIds = selectedSources.map((row) => String(row.id)).filter(Boolean)
  const { data: episodeRows, error: episodeError } = selectedIds.length
    ? await serviceClient
      .from('episodes')
      .select('id, show_id, slug, title, cover, youtube_id, transcript')
      .in('id', selectedIds)
    : { data: [], error: null }
  if (episodeError) throw new Error(episodeError.message)

  const episodes: MemoryEpisodeInput[] = ((episodeRows ?? []) as unknown as EpisodeRecord[]).flatMap((row) => {
    const show = showsById.get(String(row.show_id))
    if (!show) return []
    return [{
      id: String(row.id),
      showId: show.id,
      showSlug: show.slug,
      showTitle: show.title,
      episodeSlug: String(row.slug),
      episodeTitle: String(row.title),
      cover: customEpisodeCover(row) ?? getShowCoverPath(show.slug),
      transcript: row.transcript,
    }]
  })
  const allCards = episodes.flatMap(extractMemoryCards)
  const selectedShow = input.showId ? showsById.get(input.showId) : undefined
  const selectedEpisode = input.episodeId ? episodes[0] : undefined

  return {
    cards: sampleMemoryCards(allCards, scope === 'episode' ? 150 : 80),
    shows,
    scope,
    scopeTitle: selectedEpisode?.episodeTitle ?? selectedShow?.title ?? 'Random practice',
    selectedShowId: selectedEpisode?.showId ?? selectedShow?.id,
    selectedEpisodeId: selectedEpisode?.id,
    missingScope: Boolean((input.episodeId || input.showId) && (sourceRows ?? []).length === 0),
  }
}

export async function recordMemoryReview(cardId: string, rating: MemoryRating): Promise<{ awarded: number; totalXp: number }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { awarded: 0, totalXp: 0 }
  if (rating !== 'again' && rating !== 'known') throw new Error('Invalid Memory rating.')

  const parsed = parseMemoryCardId(cardId)
  if (!parsed) throw new Error('Invalid Memory card.')
  const { data: episode, error: episodeError } = await serviceClient
    .from('episodes')
    .select('id, show_id, slug, title, transcript')
    .eq('id', parsed.episodeId)
    .maybeSingle()
  if (episodeError || !episode) throw new Error('This Memory card is no longer available.')
  const { data: show } = await serviceClient.from('shows').select('id, slug, title').eq('id', episode.show_id).maybeSingle()
  if (!show) throw new Error('This Memory source is no longer available.')
  const validCards = extractMemoryCards({
    id: String(episode.id),
    showId: String(show.id),
    showSlug: String(show.slug),
    showTitle: String(show.title),
    episodeSlug: String(episode.slug),
    episodeTitle: String(episode.title),
    transcript: episode.transcript,
  })
  if (!validCards.some((card) => card.id === cardId)) throw new Error('This Memory card is no longer available.')

  const { data: account, error: accountError } = await serviceClient.auth.admin.getUserById(userId)
  if (accountError || !account.user) throw new Error('Unable to save Memory progress.')
  const metadata = { ...account.user.user_metadata }
  const existingReviews = metadata.memory_reviews && typeof metadata.memory_reviews === 'object' && !Array.isArray(metadata.memory_reviews)
    ? metadata.memory_reviews as Record<string, unknown>
    : {}
  const currentXp = Math.max(0, Math.floor(Number(metadata.memory_xp) || 0))
  if (Object.prototype.hasOwnProperty.call(existingReviews, cardId)) return { awarded: 0, totalXp: currentXp }

  const entries = Object.entries({ ...existingReviews, [cardId]: { rating, reviewedAt: new Date().toISOString() } }).slice(-500)
  const totalXp = currentXp + 1
  const { error: updateError } = await serviceClient.auth.admin.updateUserById(userId, {
    user_metadata: { ...metadata, memory_reviews: Object.fromEntries(entries), memory_xp: totalXp },
  })
  if (updateError) throw new Error('Unable to save Memory progress.')
  return { awarded: 1, totalXp }
}
