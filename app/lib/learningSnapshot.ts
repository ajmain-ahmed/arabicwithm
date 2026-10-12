import 'server-only'
import { serviceClient } from '@/app/lib/supabase'
import { parseLearningActivity, type DailyLearningActivity, type LearningActivity } from '@/app/lib/activity'
import { platformDate } from '@/app/lib/entitlements'

export async function loadLearningSnapshot(userId: string, metadata: unknown, profile: { legacy_active_seconds: number; tracked_active_seconds: number; weekly_goal_seconds?: number | null } | null): Promise<LearningActivity> {
  const legacy = parseLearningActivity(metadata)
  const monday = new Date(`${platformDate()}T12:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  const since = monday.toISOString().slice(0, 10)
  const [history, total, week, memory, memoryWeek, memoryLegacy] = await Promise.all([
    serviceClient.rpc('website_learning_history', { p_user_id: userId }),
    serviceClient.rpc('learning_xp_totals', { p_user_id: userId }),
    serviceClient.rpc('learning_xp_totals', { p_user_id: userId, p_since: since }),
    serviceClient.rpc('website_memory_totals', { p_user_id: userId }),
    serviceClient.rpc('website_memory_totals', { p_user_id: userId, p_since: since }),
    serviceClient.from('memory_legacy_progress').select('xp').eq('user_id', userId).maybeSingle(),
  ])
  if ([history, total, week, memory, memoryWeek, memoryLegacy].some(r => r.error)) throw new Error('Unable to load learning statistics. Please try again.')
  const recorded = history.data as unknown as { daily: DailyLearningActivity[]; activeDates: string[]; totals: NonNullable<LearningActivity['lifetime']> }
  const xp = total.data as { xp: number; wordSearchXp: number; wordSearches: number }
  const weekly = week.data as typeof xp
  const allCards = memory.data as { cards: number; xp: number }
  const weekCards = memoryWeek.data as typeof allCards
  return {
    totalSeconds: profile ? Number(profile.legacy_active_seconds) + Number(profile.tracked_active_seconds) : legacy.totalSeconds,
    daily: recorded.daily,
    activeDates: [...new Set([...legacy.activeDates, ...recorded.activeDates])].sort(),
    weeklyGoalSeconds: profile?.weekly_goal_seconds ?? legacy.weeklyGoalSeconds,
    lifetime: recorded.totals,
    xp: { totalXp: Number(xp.xp), weekXp: Number(weekly.xp) },
    memory: { total: Number(allCards.cards), totalXp: Number(allCards.xp) + Number(memoryLegacy.data?.xp ?? 0), weekCards: Number(weekCards.cards), weekXp: Number(weekCards.xp) },
    wordSearch: { total: Number(xp.wordSearches), totalXp: Number(xp.wordSearchXp), weekCompleted: Number(weekly.wordSearches), weekXp: Number(weekly.wordSearchXp) },
  }
}
