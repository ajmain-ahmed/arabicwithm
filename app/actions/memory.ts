'use server'

import { isMissingDatabaseFeature, LEARNING_SETUP_MESSAGE } from '@/app/lib/databaseErrors'
import { z } from 'zod'
import { fetchPremiumStatus } from '@/app/actions/premium'
import { MEMORY, platformDate } from '@/app/lib/entitlements'
import { getAuthenticatedUserId } from '@/app/actions/auth'
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
      cover: `/api/covers/episodes/${row.id}`,
      transcript: row.transcript,
    }]
  })
  const allCards = episodes.flatMap(extractMemoryCards)
  const selectedShow = input.showId ? showsById.get(input.showId) : undefined
  const selectedEpisode = input.episodeId ? episodes[0] : undefined

  return {
    cards: sampleMemoryCards(allCards, MEMORY.sessionCards),
    shows,
    scope,
    scopeTitle: selectedEpisode?.episodeTitle ?? selectedShow?.title ?? 'Random practice',
    selectedShowId: selectedEpisode?.showId ?? selectedShow?.id,
    selectedEpisodeId: selectedEpisode?.id,
    missingScope: Boolean((input.episodeId || input.showId) && (sourceRows ?? []).length === 0),
  }
}

export async function recordMemoryReview(cardId: string, rating: MemoryRating, completionId: string, nextSession: SavedMemorySession): Promise<{ accepted: boolean; awarded: number; totalXp: number; used: number }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to save Memory practice.')
  z.string().uuid().parse(completionId)
  const state = sessionSchema.parse(nextSession)
  if (state.index < 1 || state.cards[state.index - 1]?.id !== cardId || state.completionIds[state.index - 1] !== completionId) throw new Error('Invalid session progress.')
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

  const { data, error } = await serviceClient.rpc('complete_memory_card', {
    p_user_id: userId, p_completion_id: completionId, p_card_id: cardId, p_rating: rating,
    p_xp: MEMORY.xpPerCard, p_daily_limit: MEMORY.dailyFreeCards, p_session: state,
  })
  if (error) throw new Error('Unable to save Memory progress. Please try again.')
  return { ...(data as { accepted: boolean; used: number }), awarded: 0, totalXp: 0 }
}

export async function fetchMemoryProgress() {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to view your Memory progress.')
  const today = platformDate()
  const monday = new Date(today + 'T12:00:00Z')
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
  const [daily, total, week, entitlement] = await Promise.all([
    serviceClient.from('memory_reviews').select('completion_id', { count: 'exact', head: true }).eq('user_id', userId).eq('activity_date', today),
    serviceClient.rpc('memory_totals', { p_user_id: userId }),
    serviceClient.rpc('memory_totals', { p_user_id: userId, p_since: monday.toISOString().slice(0, 10) }),
    fetchPremiumStatus(),
  ])
  const errors = [daily.error, total.error, week.error]
  if (errors.some(Boolean)) console.error('[memory database queries]', errors.filter(Boolean))
  if (errors.some(isMissingDatabaseFeature)) throw new Error(LEARNING_SETUP_MESSAGE)
  if (errors.some(Boolean)) throw new Error('Unable to load Memory progress. Please try again.')
  const all = (total.data ?? { cards: 0, xp: 0 }) as { cards: number; xp: number }
  const weekly = (week.data ?? { cards: 0, xp: 0 }) as { cards: number; xp: number }
  return { used: daily.count ?? 0, total: all.cards, totalXp: 0, weekCards: weekly.cards, weekXp: 0, premium: entitlement.premium }
}

const sessionSchema = z.object({
  cards: z.array(z.object({ id: z.string().max(100), showId: z.string(), showSlug: z.string(), showTitle: z.string(), episodeId: z.string(), episodeSlug: z.string(), episodeTitle: z.string(), cover: z.string().optional(), timestamp: z.number().nullable(), arabic: z.string().max(20000), english: z.string().max(20000) })).max(MEMORY.sessionCards),
  index: z.number().int().min(0).max(MEMORY.sessionCards), completed: z.number().int().min(0).max(MEMORY.sessionCards),
  sessionXp: z.number().int().min(0).transform(() => 0), direction: z.enum(['arabic','english']),
  completionIds: z.array(z.string().uuid()).max(MEMORY.sessionCards),
})
export type SavedMemorySession = z.infer<typeof sessionSchema>
export async function saveMemorySession(input: SavedMemorySession) {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to save your session.')
  const state = { ...sessionSchema.parse(input), sessionXp: 0 }
  const { error } = await serviceClient.from('memory_sessions').upsert({ user_id: userId, state, updated_at: new Date().toISOString() })
  if (error) throw new Error('Unable to save session. Please try again.')
}
export async function fetchSavedMemorySession(): Promise<SavedMemorySession | null> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return null
  const { data, error } = await serviceClient.from('memory_sessions').select('state').eq('user_id', userId).maybeSingle()
  if (isMissingDatabaseFeature(error)) throw new Error(LEARNING_SETUP_MESSAGE)
  if (error) throw new Error('Unable to load saved session.')
  const parsed = sessionSchema.safeParse(data?.state)
  return parsed.success && parsed.data.index < parsed.data.cards.length ? parsed.data : null
}

// Expected storage errors must cross the production Server Action boundary as
// data: thrown errors are intentionally redacted by Next.js.
export async function loadMemoryProgress() {
  try { return { ok: true as const, data: await fetchMemoryProgress() } }
  catch (error) {
    console.error('[memory progress]', error)
    return { ok: false as const, error: error instanceof Error && error.message === LEARNING_SETUP_MESSAGE ? LEARNING_SETUP_MESSAGE : 'Unable to load Memory progress. Please sign in and try again.' }
  }
}
export async function loadSavedMemorySession() {
  try { return { ok: true as const, data: await fetchSavedMemorySession() } }
  catch (error) {
    console.error('[memory session]', error)
    return { ok: false as const, error: error instanceof Error && error.message === LEARNING_SETUP_MESSAGE ? LEARNING_SETUP_MESSAGE : 'Unable to load your saved session. Please try again.' }
  }
}
