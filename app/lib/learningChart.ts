import type { LearningActivity } from '@/app/lib/activity'
import { learningCalendarNow } from '@/app/lib/learningDashboard'
import { localDateKey } from '@/app/lib/activity'
export function learningChartDays(activity: LearningActivity, days: number, now = new Date()) {
  const end = learningCalendarNow(now)
  const daily = new Map(activity.daily.map(day => [day.date, day]))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end); date.setDate(date.getDate() - days + index + 1)
    const key = localDateKey(date), recorded = daily.get(key)
    return { date: key, seconds: recorded?.activeSeconds ?? 0, xp: recorded?.xp ?? 0 }
  })
}
