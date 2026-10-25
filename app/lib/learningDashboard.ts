import { calculateLearningStreak, summarizeWeeklyActivity, type LearningActivity } from '@/app/lib/activity'
import { platformDate } from '@/app/lib/entitlements'

export function learningCalendarNow(now = new Date()): Date {
  return new Date(`${platformDate(now)}T12:00:00`)
}
export function summarizeLearningDashboard(activity: LearningActivity, now = new Date()) {
  const calendar = learningCalendarNow(now)
  const week = summarizeWeeklyActivity(activity.daily, calendar)
  const weekCards = activity.memory?.weekCards ?? 0
  const weekCompleted = activity.wordSearch?.weekCompleted ?? 0
  return {
    week,
    streak: calculateLearningStreak(activity.activeDates, calendar),
    memory: { value: `${weekCards} card${weekCards === 1 ? '' : 's'}`, label: 'Memory this week', description: `${weekCards} Memory card${weekCards === 1 ? '' : 's'} reviewed this week.` },
    wordSearch: { value: `${weekCompleted} puzzle${weekCompleted === 1 ? '' : 's'}`, label: 'Word Search this week', description: `${weekCompleted} Word Search${weekCompleted === 1 ? '' : 'es'} completed this week.` },
  }
}
