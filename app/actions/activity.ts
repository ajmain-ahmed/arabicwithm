'use server'

import { loadLearningSnapshot } from '@/app/lib/learningSnapshot'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { parseLearningActivity, type LearningActivity } from '@/app/lib/activity'
import { rateLimit } from '@/app/lib/rateLimit'
import { serviceClient } from '@/app/lib/supabase'
import { platformDate } from '@/app/lib/entitlements'

interface RecordActivityInput {
  date: string
  activeSeconds: number
  readingSeconds?: number
  videoSeconds?: number
  wordLookups?: number
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_BATCH_SECONDS = 120

async function requireUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('You must be signed in to save learning activity.')
  return userId
}

function databaseError(context: string, error: unknown): Error {
  console.error(`[activity] ${context}:`, error)
  return new Error('Unable to load learning activity. Please try again.')
}

async function legacyActivityForUser(userId: string): Promise<LearningActivity> {
  const { data, error } = await serviceClient.auth.admin.getUserById(userId)
  if (error) throw databaseError('legacy metadata lookup failed', error)
  return parseLearningActivity(data.user?.user_metadata)
}

async function ensureLearningProfile(userId: string) {
  const { data: existing, error: selectError } = await serviceClient
    .from('learning_profiles')
    .select('user_id, weekly_goal_seconds, legacy_active_seconds, tracked_active_seconds')
    .eq('user_id', userId)
    .maybeSingle()
  if (selectError) throw databaseError('learning profile lookup failed', selectError)
  if (existing) return existing

  const legacy = await legacyActivityForUser(userId)
  const { error: insertError } = await serviceClient
    .from('learning_profiles')
    .upsert({ user_id: userId, legacy_active_seconds: legacy.totalSeconds }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (insertError) throw databaseError('learning profile create failed', insertError)

  const { data: created, error: createdError } = await serviceClient
    .from('learning_profiles')
    .select('user_id, weekly_goal_seconds, legacy_active_seconds, tracked_active_seconds')
    .eq('user_id', userId)
    .single()
  if (createdError) throw databaseError('learning profile reload failed', createdError)
  return created
}

async function activityForUser(userId: string): Promise<LearningActivity> {
  const [profile, legacy] = await Promise.all([
    ensureLearningProfile(userId),
    legacyActivityForUser(userId),
  ])
  return loadLearningSnapshot(userId, { learning_activity: legacy }, profile)
}

export async function fetchLearningActivity(): Promise<LearningActivity> {
  return activityForUser(await requireUserId())
}

export async function recordActiveLearning(input: RecordActivityInput, expectedUserId?: string): Promise<LearningActivity | null> {
  const userId = await getAuthenticatedUserId()
  // A background flush can finish after sign-out or an account switch.
  if (!userId || (expectedUserId && expectedUserId !== userId)) return null
  const limited = rateLimit(`activity:${userId}`, 30, 60 * 1000)
  if (!limited.ok) return activityForUser(userId)
  await ensureLearningProfile(userId)

  const seconds = Math.min(MAX_BATCH_SECONDS, Math.max(0, Math.floor(Number(input.activeSeconds) || 0)))
  const videoSeconds = Math.min(seconds, Math.max(0, Math.floor(Number(input.videoSeconds) || 0)))
  const readingSeconds = Math.min(seconds - videoSeconds, Math.max(0, Math.floor(Number(input.readingSeconds) || 0)))
  const wordLookups = Math.min(100, Math.max(0, Math.floor(Number(input.wordLookups) || 0)))
  const today = platformDate()
  const requested = typeof input.date === 'string' && DATE_KEY_PATTERN.test(input.date) && !Number.isNaN(Date.parse(input.date))
    ? input.date
    : today
  const date = requested <= today ? requested : today
  if (seconds === 0 && wordLookups === 0) return activityForUser(userId)

  const { error } = await serviceClient.rpc('increment_learning_activity', {
    p_user_id: userId,
    p_activity_date: date,
    p_active_seconds: seconds,
    p_reading_seconds: readingSeconds,
    p_video_seconds: videoSeconds,
    p_word_lookups: wordLookups,
  })
  if (error) {
    console.error('[recordActiveLearning] rpc failed:', error)
    throw new Error('Unable to record learning activity. Please try again.')
  }
  return activityForUser(userId)
}

