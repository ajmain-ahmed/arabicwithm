'use server'

import { loadMemoryProgress } from '@/app/actions/memory'
import { getAuthenticatedAccess, type AuthenticatedAccess } from '@/app/actions/auth'
import { ACTIVE_DAY_MINIMUM_SECONDS, localDateKey, parseLearningActivity, type LearningActivity } from '@/app/lib/activity'
import { rateLimit } from '@/app/lib/rateLimit'
import { serviceClient } from '@/app/lib/supabase'

interface RecordActivityInput {
  date: string
  activeSeconds: number
  readingSeconds?: number
  videoSeconds?: number
  wordLookups?: number
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_BATCH_SECONDS = 120

/* Legacy activity lived in user_metadata, which nothing writes anymore (the
   values were migrated into learning_profiles / learning_activity_daily).
   Snapshot the parsed metadata once per user instead of paying an Admin API
   round trip on every sync. */
const legacyCache = new Map<string, LearningActivity>()
const LEGACY_CACHE_MAX = 10_000

function databaseError(context: string, error: unknown): Error {
  console.error(`[activity] ${context}:`, error)
  return new Error('Unable to load learning activity. Please try again.')
}

async function legacyActivityForUser(userId: string): Promise<LearningActivity> {
  const cached = legacyCache.get(userId)
  if (cached) return cached
  const { data, error } = await serviceClient.auth.admin.getUserById(userId)
  if (error) throw databaseError('legacy metadata lookup failed', error)
  const parsed = parseLearningActivity(data.user?.user_metadata)
  if (legacyCache.size >= LEGACY_CACHE_MAX) legacyCache.clear()
  legacyCache.set(userId, parsed)
  return parsed
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

async function activityForUser(access: AuthenticatedAccess): Promise<LearningActivity> {
  const userId = access.userId
  const [profile, legacy] = await Promise.all([
    ensureLearningProfile(userId),
    legacyActivityForUser(userId),
  ])
  const earliest = new Date()
  earliest.setDate(earliest.getDate() - 400)
  const { data, error } = await serviceClient
    .from('learning_activity_daily')
    .select('activity_date, active_seconds, reading_seconds, video_seconds, word_lookups')
    .eq('user_id', userId)
    .gte('activity_date', localDateKey(earliest))
    .order('activity_date')
  if (error) throw databaseError('daily activity lookup failed', error)

  const daily = (data ?? []).map((day) => ({
    date: day.activity_date,
    activeSeconds: Number(day.active_seconds),
    readingSeconds: Number(day.reading_seconds),
    videoSeconds: Number(day.video_seconds),
    wordLookups: Number(day.word_lookups),
  }))
  const activeDates = Array.from(new Set([
    ...legacy.activeDates,
    ...daily.filter((day) => day.activeSeconds >= ACTIVE_DAY_MINIMUM_SECONDS).map((day) => day.date),
  ])).sort().slice(-400)

  return {
    memory: await loadMemoryProgress(access).then(result => result.ok ? result.data : undefined),
    totalSeconds: Number(profile.legacy_active_seconds) + Number(profile.tracked_active_seconds),
    activeDates,
    daily,
    weeklyGoalSeconds: profile.weekly_goal_seconds,
  }
}

export async function fetchLearningActivity(): Promise<LearningActivity> {
  const access = await getAuthenticatedAccess()
  if (!access) throw new Error('You must be signed in to save learning activity.')
  return activityForUser(access)
}

/* Cheap ack: the client already holds its pending-activity state, so a sync
   must not re-run the full read pipeline (that was ~10+ queries, three auth
   round trips, and an Admin API call per sync per user). The dashboard
   refetches on mount. */
export async function recordActiveLearning(input: RecordActivityInput): Promise<void> {
  const access = await getAuthenticatedAccess()
  if (!access) throw new Error('You must be signed in to save learning activity.')
  const limited = rateLimit(`activity:${access.userId}`, 30, 60 * 1000)
  if (!limited.ok) return
  await ensureLearningProfile(access.userId)

  const seconds = Math.min(MAX_BATCH_SECONDS, Math.max(0, Math.floor(Number(input.activeSeconds) || 0)))
  const videoSeconds = Math.min(seconds, Math.max(0, Math.floor(Number(input.videoSeconds) || 0)))
  const readingSeconds = Math.min(seconds - videoSeconds, Math.max(0, Math.floor(Number(input.readingSeconds) || 0)))
  const wordLookups = Math.min(100, Math.max(0, Math.floor(Number(input.wordLookups) || 0)))
  const today = localDateKey(new Date())
  const requested = typeof input.date === 'string' && DATE_KEY_PATTERN.test(input.date) && !Number.isNaN(Date.parse(input.date))
    ? input.date
    : today
  const earliest = new Date()
  earliest.setDate(earliest.getDate() - 400)
  /* Clamp to the same 400-day window the read query returns. */
  const date = requested <= today && requested >= localDateKey(earliest) ? requested : today
  if (seconds === 0 && wordLookups === 0) return

  const { error } = await serviceClient.rpc('increment_learning_activity', {
    p_user_id: access.userId,
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
}
