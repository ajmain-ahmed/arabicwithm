export const LEARNING_ACTIVITY_METADATA_KEY = 'learning_activity'
export const LEARNING_ACTIVITY_EVENT = 'awm-learning-activity-updated'

export interface LearningActivity {
  totalSeconds: number
  activeDates: string[]
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function localDateKey(value: Date | string | number): string {
  if (typeof value === 'string' && DATE_KEY_PATTERN.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLearningActivity(metadata: Record<string, unknown> | null | undefined): LearningActivity {
  const raw = metadata?.[LEARNING_ACTIVITY_METADATA_KEY]
  const record = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const seconds = Number(record.totalSeconds)
  const rawDates = Array.isArray(record.activeDates) ? record.activeDates : []
  const activeDates = Array.from(new Set(
    rawDates
      .filter((date): date is string => typeof date === 'string' && DATE_KEY_PATTERN.test(date))
  )).sort().slice(-400)

  return {
    totalSeconds: Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0,
    activeDates,
  }
}

export function addActivity(activity: LearningActivity, seconds: number, date = new Date()): LearningActivity {
  const dateKey = localDateKey(date)
  const activeDates = dateKey
    ? Array.from(new Set([...activity.activeDates, dateKey])).sort().slice(-400)
    : activity.activeDates
  return {
    totalSeconds: activity.totalSeconds + Math.max(0, Math.floor(seconds)),
    activeDates,
  }
}

export function calculateLearningStreak(dateValues: Array<string | undefined>, now = new Date()): number {
  const dates = new Set(dateValues.map((value) => value ? localDateKey(value) : '').filter(Boolean))
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (dates.has(localDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function formatLearningTime(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
