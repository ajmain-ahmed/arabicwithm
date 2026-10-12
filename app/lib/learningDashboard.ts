import { calculateLearningLevel, calculateLearningStreak, formatLearningTime, summarizeWeeklyActivity, type LearningActivity } from '@/app/lib/activity'
import { platformDate } from '@/app/lib/entitlements'

export function learningCalendarNow(now = new Date()): Date {
  return new Date(`${platformDate(now)}T12:00:00`)
}
export function longestLearningStreak(dates: string[]): number {
  let longest = 0, current = 0, previous = 0
  for (const date of [...new Set(dates)].sort()) {
    const day = Date.parse(`${date}T12:00:00Z`) / 86400000
    if (!Number.isFinite(day)) continue
    current = day - previous === 1 ? current + 1 : 1
    longest = Math.max(longest, current); previous = day
  }
  return longest
}
export function summarizeLearningDashboard(activity: LearningActivity, now = new Date()) {
  const calendar = learningCalendarNow(now)
  const xp = activity.xp?.totalXp ?? activity.memory?.totalXp ?? 0
  const level = calculateLearningLevel(activity.totalSeconds, xp)
  const week = summarizeWeeklyActivity(activity.daily, calendar)
  return {
    level, week, xp, weekXp: activity.xp?.weekXp ?? activity.memory?.weekXp ?? 0,
    streak: calculateLearningStreak(activity.activeDates, calendar),
    longestStreak: longestLearningStreak(activity.activeDates),
    nextLevelPoints: Math.max(0, level.nextLevelMinutes - Math.floor(activity.totalSeconds / 60) - xp),
    memory: { value: `${activity.memory?.weekXp ?? 0} XP`, label: 'Memory this week', description: `${activity.memory?.weekXp ?? 0} XP earned from ${activity.memory?.weekCards ?? 0} Memory cards this week.`, totalDescription: `${activity.memory?.totalXp ?? 0} total Memory XP; ${activity.memory?.total ?? 0} dated reviews recorded.` },
    wordSearch: { value: `${activity.wordSearch?.weekXp ?? 0} XP`, label: 'Word Search this week', description: `${activity.wordSearch?.weekXp ?? 0} XP earned from ${activity.wordSearch?.weekCompleted ?? 0} completed Word Searches this week.` },
    time: formatLearningTime(activity.totalSeconds),
  }
}
