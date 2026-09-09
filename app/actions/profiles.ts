'use server'
import { z } from 'zod'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { fetchBooksForPublic, fetchChaptersForBookPublic } from '@/app/actions/books'
import { serviceClient } from '@/app/lib/supabase'
import { calculateLearningLevel, parseLearningActivity } from '@/app/lib/activity'
import { platformDate } from '@/app/lib/entitlements'

export async function updateProfile(input: { displayName: string; isPublic: boolean; shareReading: boolean }) {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to edit your profile.')
  const value = z.object({ displayName: z.string().trim().min(1).max(60), isPublic: z.boolean(), shareReading: z.boolean() }).parse(input)
  const { error } = await serviceClient.from('public_profiles').upsert({ user_id: userId, display_name: value.displayName, is_public: value.isPublic, share_reading: value.shareReading })
  if (error) throw new Error('Unable to save profile.')
}
export async function fetchPublicProfile(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null
  const viewer = await getAuthenticatedUserId()
  const own = viewer === id
  const { data: profile, error } = await serviceClient.from('public_profiles').select('display_name, is_public, share_reading').eq('user_id', id).maybeSingle()
  if (error) throw new Error('Unable to load profile.')
  if (!own && !profile?.is_public) return null
  const monday = new Date(platformDate() + 'T12:00:00Z')
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
  const [account, activity, memory, weekly, legacy] = await Promise.all([
    serviceClient.auth.admin.getUserById(id),
    serviceClient.from('learning_profiles').select('legacy_active_seconds, tracked_active_seconds').eq('user_id', id).maybeSingle(),
    serviceClient.rpc('memory_totals', { p_user_id: id }),
    serviceClient.rpc('memory_totals', { p_user_id: id, p_since: monday.toISOString().slice(0, 10) }),
    serviceClient.from('memory_legacy_progress').select('xp').eq('user_id', id).maybeSingle(),
  ])
  if (account.error || activity.error || memory.error || weekly.error || legacy.error) throw new Error('Unable to load learning statistics.')
  const user = account.data.user
  if (!user) return null
  const totals = memory.data as { cards: number; xp: number }
  const week = weekly.data as { cards: number; xp: number }
  const xp = totals.xp + Number(legacy.data?.xp ?? 0)
  const seconds = activity.data ? Number(activity.data.legacy_active_seconds) + Number(activity.data.tracked_active_seconds) : parseLearningActivity(user.user_metadata).totalSeconds
  const raw = user.user_metadata.book_progress
  const progress = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, { chapterSlug?: string }> : {}
  const books = own || profile?.share_reading ? await fetchBooksForPublic() : []
  const shelf = await Promise.all(books.filter(book => progress[book.slug]?.chapterSlug).map(async book => {
    const chapters = await fetchChaptersForBookPublic(book.id)
    const index = chapters.findIndex(ch => ch.slug === progress[book.slug].chapterSlug)
    return { slug: book.slug, title: book.title, author: book.author, cover: book.cover, chapter: index >= 0 ? chapters[index].title : 'Reading', position: index + 1, total: chapters.length, href: index >= 0 ? `/books/${book.slug}/${chapters[index].slug}` : `/books/${book.slug}` }
  }))
  // Explicit public DTO: never return auth metadata, email or billing records.
  return { id, own, displayName: profile?.display_name ?? 'Arabic learner', isPublic: profile?.is_public ?? false, shareReading: profile?.share_reading ?? false,
    joined: user.created_at.slice(0, 10), level: calculateLearningLevel(seconds, xp).level, xp, weekXp: week.xp, memoryCards: totals.cards, shelf }
}
export type PublicProfile = NonNullable<Awaited<ReturnType<typeof fetchPublicProfile>>>
