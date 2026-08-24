export const LEARNING_ACTIVITY_METADATA_KEY = 'learning_activity'
export const LEARNING_ACTIVITY_EVENT = 'awm-learning-activity-updated'
export const WORD_LOOKUP_EVENT = 'awm-word-lookup'

export const ACTIVE_DAY_MINIMUM_SECONDS = 60
export const DEFAULT_INACTIVITY_THRESHOLD_MS = 2 * 60 * 1000

export type ActivityKind = 'reading' | 'video' | 'other'

export interface DailyLearningActivity {
  date: string
  activeSeconds: number
  readingSeconds: number
  videoSeconds: number
  wordLookups: number
}

export interface LearningActivity {
  totalSeconds: number
  activeDates: string[]
  daily: DailyLearningActivity[]
  weeklyGoalSeconds: number | null
}

export interface LearningLevelProgress {
  level: number
  currentLevelMinutes: number
  nextLevelMinutes: number
  progressPercent: number
}

export interface WeeklyActivitySummary {
  thisWeekSeconds: number
  previousWeekSeconds: number
  todaySeconds: number
  readingSeconds: number
  videoSeconds: number
  wordLookups: number
  activeDays: number
  comparisonPercent: number | null
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function safeWholeNumber(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

export function localDateKey(value: Date | string | number): string {
  if (typeof value === 'string' && DATE_KEY_PATTERN.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLearningActivity(value: unknown): LearningActivity {
  const metadata = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const raw = metadata[LEARNING_ACTIVITY_METADATA_KEY] ?? metadata
  const record = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const rawDates = Array.isArray(record.activeDates) ? record.activeDates : []
  const activeDates = Array.from(new Set(
    rawDates.filter((date): date is string => typeof date === 'string' && DATE_KEY_PATTERN.test(date))
  )).sort().slice(-400)
  const daily = (Array.isArray(record.daily) ? record.daily : []).flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const day = entry as Record<string, unknown>
    if (typeof day.date !== 'string' || !DATE_KEY_PATTERN.test(day.date)) return []
    return [{
      date: day.date,
      activeSeconds: safeWholeNumber(day.activeSeconds),
      readingSeconds: safeWholeNumber(day.readingSeconds),
      videoSeconds: safeWholeNumber(day.videoSeconds),
      wordLookups: safeWholeNumber(day.wordLookups),
    }]
  }).sort((left, right) => left.date.localeCompare(right.date)).slice(-400)
  const goal = Number(record.weeklyGoalSeconds)

  return {
    totalSeconds: safeWholeNumber(record.totalSeconds),
    activeDates: Array.from(new Set([
      ...activeDates,
      ...daily.filter((day) => day.activeSeconds >= ACTIVE_DAY_MINIMUM_SECONDS).map((day) => day.date),
    ])).sort().slice(-400),
    daily,
    weeklyGoalSeconds: Number.isFinite(goal) && goal > 0 ? Math.floor(goal) : null,
  }
}

export function emptyLearningActivity(): LearningActivity {
  return { totalSeconds: 0, activeDates: [], daily: [], weeklyGoalSeconds: null }
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

export function minutesRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  return Math.round(Math.pow(safeLevel - 1, 1.35) * 60)
}

export function calculateLearningLevel(totalSeconds: number): LearningLevelProgress {
  const totalMinutes = Math.floor(Math.max(0, totalSeconds) / 60)
  let level = 1
  while (minutesRequiredForLevel(level + 1) <= totalMinutes) level += 1
  const currentLevelMinutes = minutesRequiredForLevel(level)
  const nextLevelMinutes = minutesRequiredForLevel(level + 1)
  const span = Math.max(1, nextLevelMinutes - currentLevelMinutes)
  const progressPercent = Math.max(0, Math.min(100, Math.floor(
    ((totalMinutes - currentLevelMinutes) / span) * 100
  )))
  return { level, currentLevelMinutes, nextLevelMinutes, progressPercent }
}

export function startOfLocalWeek(now = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const mondayOffset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - mondayOffset)
  return start
}

export function calculateWeekOverWeekPercent(currentSeconds: number, previousSeconds: number): number | null {
  if (currentSeconds <= 0 || previousSeconds <= 0) return null
  return Math.round(((currentSeconds - previousSeconds) / previousSeconds) * 100)
}

export function summarizeWeeklyActivity(daily: DailyLearningActivity[], now = new Date()): WeeklyActivitySummary {
  const thisWeekStart = startOfLocalWeek(now)
  const previousWeekStart = new Date(thisWeekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const nextWeekStart = new Date(thisWeekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const thisWeekKey = localDateKey(thisWeekStart)
  const previousWeekKey = localDateKey(previousWeekStart)
  const nextWeekKey = localDateKey(nextWeekStart)
  const todayKey = localDateKey(now)

  let thisWeekSeconds = 0
  let previousWeekSeconds = 0
  let todaySeconds = 0
  let readingSeconds = 0
  let videoSeconds = 0
  let wordLookups = 0
  let activeDays = 0

  for (const day of daily) {
    if (day.date >= thisWeekKey && day.date < nextWeekKey) {
      thisWeekSeconds += day.activeSeconds
      readingSeconds += day.readingSeconds
      videoSeconds += day.videoSeconds
      wordLookups += day.wordLookups
      if (day.activeSeconds >= ACTIVE_DAY_MINIMUM_SECONDS) activeDays += 1
      if (day.date === todayKey) todaySeconds += day.activeSeconds
    } else if (day.date >= previousWeekKey && day.date < thisWeekKey) {
      previousWeekSeconds += day.activeSeconds
    }
  }

  return {
    thisWeekSeconds,
    previousWeekSeconds,
    todaySeconds,
    readingSeconds,
    videoSeconds,
    wordLookups,
    activeDays,
    comparisonPercent: calculateWeekOverWeekPercent(thisWeekSeconds, previousWeekSeconds),
  }
}

export function activityKindForPath(pathname: string, videoPlaying: boolean): ActivityKind | null {
  if (videoPlaying) return 'video'
  if (/^\/books\/[^/]+\/[^/]+/.test(pathname)) return 'reading'
  if (/^\/cartoons\/[^/]+\/[^/]+/.test(pathname) || pathname === '/explore' || pathname.startsWith('/practice')) return 'other'
  return null
}

export function shouldCountActiveTime({
  visible,
  kind,
  now,
  lastInteractionAt,
  inactivityThresholdMs = DEFAULT_INACTIVITY_THRESHOLD_MS,
}: {
  visible: boolean
  kind: ActivityKind | null
  now: number
  lastInteractionAt: number
  inactivityThresholdMs?: number
}): boolean {
  if (!visible || !kind) return false
  return kind === 'video' || now - lastInteractionAt <= inactivityThresholdMs
}

export function formatLearningTime(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function dispatchWordLookup(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(WORD_LOOKUP_EVENT))
}
