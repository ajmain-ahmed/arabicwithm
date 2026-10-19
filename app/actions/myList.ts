// app/actions/myList.ts — Netflix-style per-user saved shows ("My List").
//
// Efficiency notes: one small indexed read for the homepage row (latest 24),
// one membership read for the show-page toggle, and single-row writes.
// Every query is scoped by the server-verified caller's user_id; the table
// also has RLS policies as a second layer for any direct client access.

"use server"

import { serviceClient } from '@/app/lib/supabase'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { rateLimit } from '@/app/lib/rateLimit'
import { normalizeThumbnailCrop, type ThumbnailCrop } from '@/app/lib/thumbnailCrop'

export interface MyListItem {
  showId: string
  slug: string
  title: string
  description?: string
  level: string
  coverCrop?: ThumbnailCrop
  addedAt: string
}

const MY_LIST_HOME_LIMIT = 24
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function fetchMyList(): Promise<MyListItem[]> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return []
  const { data: rows, error } = await serviceClient
    .from('my_list')
    .select('show_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MY_LIST_HOME_LIMIT)
  if (error) {
    console.error('[my-list] list error:', error.message)
    return []
  }
  const ids = (rows ?? []).map((row) => row.show_id)
  if (ids.length === 0) return []
  const { data: shows } = await serviceClient
    .from('shows')
    .select('id, slug, title, description, level, cover_crop')
    .in('id', ids)
  if (!shows?.length) return []
  const showById = new Map(shows.map((show) => [String(show.id), show]))
  const items: MyListItem[] = []
  for (const row of rows ?? []) {
    const show = showById.get(row.show_id)
    if (!show) continue
    items.push({
      showId: row.show_id,
      slug: show.slug,
      title: show.title,
      description: show.description ?? undefined,
      level: show.level ?? '',
      coverCrop: normalizeThumbnailCrop(show.cover_crop),
      addedAt: row.created_at,
    })
  }
  return items
}

/** Lightweight membership read for the show-page toggle. */
export async function fetchMyListShowIds(): Promise<string[]> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return []
  const { data: rows, error } = await serviceClient
    .from('my_list')
    .select('show_id')
    .eq('user_id', userId)
  if (error) {
    console.error('[my-list] ids error:', error.message)
    return []
  }
  return (rows ?? []).map((row) => row.show_id)
}

export async function addToMyList(showId: string): Promise<{ ok: boolean; error?: string }> {
  if (!ID_PATTERN.test(showId)) return { ok: false, error: 'Invalid show.' }
  const userId = await getAuthenticatedUserId()
  if (!userId) return { ok: false, error: 'Sign in to save shows to your list.' }
  if (!rateLimit(`my-list:add:${userId}`, 30, 60_000).ok) {
    return { ok: false, error: 'Too many requests. Try again in a moment.' }
  }
  const { error } = await serviceClient
    .from('my_list')
    .upsert({ user_id: userId, show_id: showId }, { onConflict: 'user_id,show_id', ignoreDuplicates: true })
  if (error) {
    console.error('[my-list] add error:', error.message)
    return { ok: false, error: 'Could not save to your list.' }
  }
  return { ok: true }
}

export async function removeFromMyList(showId: string): Promise<{ ok: boolean; error?: string }> {
  if (!ID_PATTERN.test(showId)) return { ok: false, error: 'Invalid show.' }
  const userId = await getAuthenticatedUserId()
  if (!userId) return { ok: false, error: 'Sign in to edit your list.' }
  if (!rateLimit(`my-list:remove:${userId}`, 30, 60_000).ok) {
    return { ok: false, error: 'Too many requests. Try again in a moment.' }
  }
  const { error } = await serviceClient
    .from('my_list')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId)
  if (error) {
    console.error('[my-list] remove error:', error.message)
    return { ok: false, error: 'Could not update your list.' }
  }
  return { ok: true }
}
