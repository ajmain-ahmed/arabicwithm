'use server'

import { getAuthenticatedUserId } from '@/app/actions/auth'
import { ACTIVE_DAY_MINIMUM_SECONDS, localDateKey, parseLearningActivity, type LearningActivity } from '@/app/lib/activity'
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
const ALLOWED_GOALS = new Set([2 * 3600, 5 * 3600, 10 * 3600])

async function requireUserId(): Promise<string> {
  const userId = await getAuthenticatedUserId()
  if (!userId) throw new Error('You must be signed in to save learning activity.')
  return userId
}

async function legacyActivityForUser(userId: string): Promise<LearningActivity> {
  const { data, error } = await serviceClient.auth.admin.getUserById(userId)
  if (error) throw new Error(error.message)
  return parseLearningActivity(data.user?.user_metadata)
}

async function ensureLearningProfile(userId: string) {
  const { data: existing, error: selectError } = await serviceClient
    .from('learning_profiles')
    .select('user_id, weekly_goal_seconds, legacy_active_seconds, tracked_active_seconds')
    .eq('user_id', userId)
    .maybeSingle()
  if (selectError) throw new Error(selectError.message)
  if (existing) return existing

  const legacy = await legacyActivityForUser(userId)
  const { error: insertError } = await serviceClient
    .from('learning_profiles')
    .upsert({ user_id: userId, legacy_active_seconds: legacy.totalSeconds }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (insertError) throw new Error(insertError.message)

  const { data: created, error: createdError } = await serviceClient
    .from('learning_profiles')
    .select('user_id, weekly_goal_seconds, legacy_active_seconds, tracked_active_seconds')
    .eq('user_id', userId)
    .single()
  if (createdError) throw new Error(createdError.message)
  return created
}

async function activityForUser(userId: string): Promise<LearningActivity> {
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
  if (error) throw new Error(error.message)

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
    totalSeconds: Number(profile.legacy_active_seconds) + Number(profile.tracked_active_seconds),
    activeDates,
    daily,
    weeklyGoalSeconds: profile.weekly_goal_seconds,
  }
}

export async function fetchLearningActivity(): Promise<LearningActivity> {
  return activityForUser(await requireUserId())
}

export async function recordActiveLearning(input: RecordActivityInput): Promise<LearningActivity> {
  const userId = await requireUserId()
  await ensureLearningProfile(userId)

  const seconds = Math.min(MAX_BATCH_SECONDS, Math.max(0, Math.floor(Number(input.activeSeconds) || 0)))
  const videoSeconds = Math.min(seconds, Math.max(0, Math.floor(Number(input.videoSeconds) || 0)))
  const readingSeconds = Math.min(seconds - videoSeconds, Math.max(0, Math.floor(Number(input.readingSeconds) || 0)))
  const wordLookups = Math.min(100, Math.max(0, Math.floor(Number(input.wordLookups) || 0)))
  const date = DATE_KEY_PATTERN.test(input.date) ? input.date : localDateKey(new Date())
  if (seconds === 0 && wordLookups === 0) return activityForUser(userId)

  const { error } = await serviceClient.rpc('increment_learning_activity', {
    p_user_id: userId,
    p_activity_date: date,
    p_active_seconds: seconds,
    p_reading_seconds: readingSeconds,
    p_video_seconds: videoSeconds,
    p_word_lookups: wordLookups,
  })
  if (error) throw new Error(error.message)
  return activityForUser(userId)
}

export async function updateWeeklyLearningGoal(seconds: number | null): Promise<LearningActivity> {
  const userId = await requireUserId()
  await ensureLearningProfile(userId)
  const goal = seconds === null ? null : Math.floor(Number(seconds))
  if (goal !== null && !ALLOWED_GOALS.has(goal)) throw new Error('Choose a 2, 5, or 10 hour weekly goal.')

  const { error } = await serviceClient
    .from('learning_profiles')
    .update({ weekly_goal_seconds: goal, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return activityForUser(userId)
}
