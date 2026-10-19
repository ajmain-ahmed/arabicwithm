// app/actions/myList.ts — Netflix-style per-user saved episodes ("My List").
//
// Efficiency notes: one small indexed read for the homepage row (latest 24),
// one membership read for the watch-page toggle, and single-row writes.
// Every query is scoped by the server-verified caller's user_id; the table
// also has RLS policies as a second layer for any direct client access.

"use server"

import { serviceClient } from '@/app/lib/supabase'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { rateLimit } from '@/app/lib/rateLimit'
import { normalizeThumbnailCrop, type ThumbnailCrop } from '@/app/lib/thumbnailCrop'

export interface MyListItem {
  episodeId: string
  slug: string
  showSlug: string
  showTitle: string
  title: string
  level: string
  coverCrop?: ThumbnailCrop
  addedAt: string
}

const MY_LIST_HOME_LIMIT = 24
const EPISODE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function mapRows(rows: Array<{ episode_id: string; created_at: string }>, episodes: Array<{ id: string; slug: string; title: string; level: string | null; show_id: string; cover_crop: unknown }> | null, shows: Array<{ id: string; slug: string; title: string }> | null): MyListItem[] {
  const episodeById = new Map((episodes ?? []).map((episode) => [String(episode.id), episode]))
  const showById = new Map((shows ?? []).map((show) => [String(show.id), show]))
  const items: MyListItem[] = []
  for (const row of rows) {
    const episode = episodeById.get(row.episode_id)
    if (!episode) continue
    const show = showById.get(String(episode.show_id))
    if (!show) continue
    items.push({
      episodeId: row.episode_id,
      slug: episode.slug,
      showSlug: show.slug,
      showTitle: show.title,
      title: episode.title,
      level: episode.level ?? '',
      coverCrop: normalizeThumbnailCrop(episode.cover_crop),
      addedAt: row.created_at,
    })
  }
  return items
}

export async function fetchMyList(): Promise<MyListItem[]> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return []
  const { data: rows, error } = await serviceClient
    .from('my_list')
    .select('episode_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MY_LIST_HOME_LIMIT)
  if (error) {
    console.error('[my-list] list error:', error.message)
    return []
  }
  const ids = (rows ?? []).map((row) => row.episode_id)
  if (ids.length === 0) return []
  const { data: episodes } = await serviceClient
    .from('episodes')
    .select('id, slug, title, level, show_id, cover_crop')
    .in('id', ids)
  if (!episodes?.length) return []
  const showIds = Array.from(new Set(episodes.map((episode) => String(episode.show_id))))
  const { data: shows } = await serviceClient
    .from('shows')
    .select('id, slug, title')
    .in('id', showIds)
  return mapRows(rows ?? [], episodes, shows)
}

/** Lightweight membership read for the watch-page toggle. */
export async function fetchMyListEpisodeIds(): Promise<string[]> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return []
  const { data: rows, error } = await serviceClient
    .from('my_list')
    .select('episode_id')
    .eq('user_id', userId)
  if (error) {
    console.error('[my-list] ids error:', error.message)
    return []
  }
  return (rows ?? []).map((row) => row.episode_id)
}

export async function addToMyList(episodeId: string): Promise<{ ok: boolean; error?: string }> {
  if (!EPISODE_ID_PATTERN.test(episodeId)) return { ok: false, error: 'Invalid episode.' }
  const userId = await getAuthenticatedUserId()
  if (!userId) return { ok: false, error: 'Sign in to save episodes to your list.' }
  if (!rateLimit(`my-list:add:${userId}`, 30, 60_000).ok) {
    return { ok: false, error: 'Too many requests. Try again in a moment.' }
  }
  const { error } = await serviceClient
    .from('my_list')
    .upsert({ user_id: userId, episode_id: episodeId }, { onConflict: 'user_id,episode_id', ignoreDuplicates: true })
  if (error) {
    console.error('[my-list] add error:', error.message)
    return { ok: false, error: 'Could not save to your list.' }
  }
  return { ok: true }
}

export async function removeFromMyList(episodeId: string): Promise<{ ok: boolean; error?: string }> {
  if (!EPISODE_ID_PATTERN.test(episodeId)) return { ok: false, error: 'Invalid episode.' }
  const userId = await getAuthenticatedUserId()
  if (!userId) return { ok: false, error: 'Sign in to edit your list.' }
  if (!rateLimit(`my-list:remove:${userId}`, 30, 60_000).ok) {
    return { ok: false, error: 'Too many requests. Try again in a moment.' }
  }
  const { error } = await serviceClient
    .from('my_list')
    .delete()
    .eq('user_id', userId)
    .eq('episode_id', episodeId)
  if (error) {
    console.error('[my-list] remove error:', error.message)
    return { ok: false, error: 'Could not update your list.' }
  }
  return { ok: true }
}
