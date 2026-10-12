'use server'

import { z } from 'zod'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { fetchBooksForPublic, fetchChaptersForBookPublic } from '@/app/actions/books'
import { loadLearningSnapshot } from '@/app/lib/learningSnapshot'
import { summarizeLearningDashboard } from '@/app/lib/learningDashboard'
import { parseReadingList } from '@/app/lib/readingList'
import { accountHasPremium } from '@/app/lib/accountPremium'
import { normalizeThumbnailCrop } from '@/app/lib/thumbnailCrop'
import { serviceClient } from '@/app/lib/supabase'
import { usernameSchema } from '@/app/lib/username'
import { revalidatePath } from 'next/cache'
import { getAuthClient } from '@/app/lib/supabase/server'

const profileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  isPublic: z.boolean(),
  shareReading: z.boolean(),
  username: usernameSchema.optional(),
})

export async function updateProfile(input: z.infer<typeof profileInputSchema>) {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to edit your profile.')

  const value = profileInputSchema.parse(input)
  if (value.username !== undefined) {
    const client = await getAuthClient()
    const { error } = await client.rpc('set_public_handle', { p_handle: value.username })
    if (error) throw new Error(error.message.includes('PUBLIC_ID_TAKEN') ? 'That username is already taken.' : 'Unable to save username.')
  }
  const { error } = await serviceClient.from('public_profiles').upsert({
    user_id: userId,
    display_name: value.displayName,
    is_public: value.isPublic,
    share_reading: value.shareReading,
  })
  if (error) throw new Error(error.code === '23505' ? 'That username is already taken.' : 'Unable to save profile.')
  revalidatePath('/profile')
}

export async function checkUsernameAvailability(input: string): Promise<boolean> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('Sign in to select a username.')
  const username = usernameSchema.parse(input)
  const { data, error } = await serviceClient.from('leaderboard_public_profiles').select('user_id').eq('handle', username).maybeSingle()
  if (error) throw new Error('Unable to check username availability.')
  return !data || data.user_id === userId
}

export async function fetchPublicProfile(identifier: string) {
  let id = identifier
  if (!z.string().uuid().safeParse(id).success) {
    const username = usernameSchema.safeParse(identifier)
    if (!username.success) return null
    const { data, error } = await serviceClient.from('leaderboard_public_profiles').select('user_id').eq('handle', username.data).maybeSingle()
    if (error) throw new Error('Unable to load profile.')
    if (!data) return null
    id = data.user_id
  }

  const viewer = await getAuthenticatedUserId()
  const own = viewer === id
  const { data: profile, error } = await serviceClient
    .from('public_profiles')
    .select('display_name, is_public, share_reading')
    .eq('user_id', id)
    .maybeSingle()
  if (error) throw new Error('Unable to load profile.')
  if (!own && !profile?.is_public) return null
  const { data: publicIdentity, error: handleError } = await serviceClient.from('leaderboard_public_profiles').select('handle').eq('user_id', id).maybeSingle()
  if (handleError) throw new Error('Unable to load username.')

  const [account, activity] = await Promise.all([
    serviceClient.auth.admin.getUserById(id),
    serviceClient.from('learning_profiles').select('legacy_active_seconds, tracked_active_seconds, weekly_goal_seconds').eq('user_id', id).maybeSingle(),
  ])
  if (account.error || activity.error) throw new Error('Unable to load profile statistics.')
  const user = account.data.user
  if (!user) return null
  const learning = await loadLearningSnapshot(id, user.user_metadata, activity.data)
  const summary = summarizeLearningDashboard(learning)
  const progress = parseReadingList(user.user_metadata.book_progress)
  const premium = await accountHasPremium(id)
  const avatar = typeof user.user_metadata.avatar_url === 'string' && /^https?:\/\//.test(user.user_metadata.avatar_url) ? user.user_metadata.avatar_url : null
  const books = own || profile?.share_reading ? await fetchBooksForPublic() : []
  const shelf = await Promise.all(
    books
      .filter((book) => progress[book.slug]?.chapterSlug && !progress[book.slug]?.hiddenFromList)
      .map(async (book) => {
        const chapters = await fetchChaptersForBookPublic(book.id)
        const index = chapters.findIndex((chapter) => chapter.slug === progress[book.slug].chapterSlug)
        if (index < 0) return null
        return {
          slug: book.slug,
          title: book.title,
          author: book.author,
          cover: book.cover,
          coverCrop: book.coverCrop,
          chapter: chapters[index].title,
          position: index + 1,
          total: chapters.length,
          href: `/books/${book.slug}/${chapters[index].slug}`,
        }
      }),
  )

  // Explicit public DTO: never expose auth metadata, email, or billing records.
  return {
    id,
    own,
    displayName: profile?.display_name ?? String(user.user_metadata.full_name ?? user.user_metadata.name ?? 'Arabic learner'),
    username: publicIdentity?.handle ?? null,
    isPublic: profile?.is_public ?? false,
    shareReading: profile?.share_reading ?? false,
    joined: user.created_at.slice(0, 10),
    avatar,
    avatarCrop: normalizeThumbnailCrop(user.user_metadata.avatar_crop),
    featuredTrophies: Array.isArray(user.user_metadata.featured_trophies) ? user.user_metadata.featured_trophies.filter((id: unknown): id is string => typeof id === 'string').slice(0, 4) : undefined,
    premium,
    learning,
    summary,
    level: summary.level.level,
    xp: summary.xp,
    weekXp: summary.weekXp,
    memoryCards: learning.memory?.total ?? 0,
    shelf: shelf.filter((book) => book !== null),
  }
}

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof fetchPublicProfile>>>

/** Persist existing profile display preferences only after validating earned milestones. */
export async function saveTrophyHighlights(input:string[]) {
 const id=await getAuthenticatedUserId()
 if(!id)throw new Error('Sign in to choose trophies.')
 const selected=z.array(z.string().max(100)).max(4).parse(input)
 const {data:activity,error:activityError}=await serviceClient.from('learning_profiles').select('legacy_active_seconds,tracked_active_seconds,weekly_goal_seconds').eq('user_id',id).maybeSingle()
 if(activityError)throw new Error('Unable to verify your achievements.')
 // User-editable Auth metadata must not manufacture earned milestones.
 const learning=await loadLearningSnapshot(id,{},activity)
 const {achievementMetrics,achievementPreview}=await import('@/app/lib/achievements')
 const valid=achievementPreview(achievementMetrics(learning),selected).map(item=>item.id)
 if(valid.length!==selected.length)throw new Error('Choose only achievements you have earned.')
 const {error}=await serviceClient.auth.admin.updateUserById(id,{user_metadata:{featured_trophies:valid}})
 if(error)throw new Error('Unable to save trophy highlights. Please retry.')
 return valid
}
