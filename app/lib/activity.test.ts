import { describe, expect, it } from 'vitest'
import {
  activityKindForPath,
  calculateLearningLevel,
  calculateLearningStreak,
  calculateWeekOverWeekPercent,
  formatLearningTime,
  minutesRequiredForLevel,
  parseLearningActivity,
  shouldCountActiveTime,
  summarizeWeeklyActivity,
} from './activity'

describe('learning activity', () => {
  it('sanitises legacy profile activity metadata', () => {
    expect(parseLearningActivity({
      learning_activity: { totalSeconds: 125.8, activeDates: ['2026-08-11', 'invalid', '2026-08-11'] },
    })).toEqual({
      totalSeconds: 125,
      activeDates: ['2026-08-11'],
      daily: [],
      weeklyGoalSeconds: null,
    })
  })

  it('calculates streaks ending today or yesterday', () => {
    const today = new Date(2026, 7, 13, 12)
    expect(calculateLearningStreak(['2026-08-11', '2026-08-12', '2026-08-13'], today)).toBe(3)
    expect(calculateLearningStreak(['2026-08-10', '2026-08-11', '2026-08-12'], today)).toBe(3)
  })

  it('uses the requested cumulative level curve in whole minutes', () => {
    expect(minutesRequiredForLevel(1)).toBe(0)
    expect(minutesRequiredForLevel(2)).toBe(60)
    expect(minutesRequiredForLevel(10)).toBe(Math.round(Math.pow(9, 1.35) * 60))
    expect(calculateLearningLevel(0)).toMatchObject({ level: 1, progressPercent: 0 })
    expect(calculateLearningLevel(60 * 60)).toMatchObject({ level: 2, progressPercent: 0 })
    expect(calculateLearningLevel(minutesRequiredForLevel(7) * 60).level).toBe(7)
  })

  it('summarises Monday-based current and previous weeks', () => {
    const summary = summarizeWeeklyActivity([
      { date: '2026-08-10', activeSeconds: 120, readingSeconds: 60, videoSeconds: 60, wordLookups: 2 },
      { date: '2026-08-11', activeSeconds: 30, readingSeconds: 30, videoSeconds: 0, wordLookups: 1 },
      { date: '2026-08-17', activeSeconds: 180, readingSeconds: 120, videoSeconds: 60, wordLookups: 3 },
      { date: '2026-08-21', activeSeconds: 300, readingSeconds: 0, videoSeconds: 300, wordLookups: 4 },
    ], new Date(2026, 7, 21, 12))
    expect(summary).toEqual({
      thisWeekSeconds: 480,
      previousWeekSeconds: 150,
      todaySeconds: 300,
      readingSeconds: 120,
      videoSeconds: 360,
      wordLookups: 7,
      activeDays: 2,
      comparisonPercent: 220,
    })
  })

  it('does not calculate misleading comparisons without both periods', () => {
    expect(calculateWeekOverWeekPercent(100, 0)).toBeNull()
    expect(calculateWeekOverWeekPercent(0, 100)).toBeNull()
    expect(calculateWeekOverWeekPercent(75, 100)).toBe(-25)
  })

  it('only counts visible, engaged learning or active video', () => {
    const now = 1_000_000
    expect(activityKindForPath('/books/story/chapter-1', false)).toBe('reading')
    expect(activityKindForPath('/', false)).toBeNull()
    expect(shouldCountActiveTime({ visible: true, kind: 'reading', now, lastInteractionAt: now - 30_000 })).toBe(true)
    expect(shouldCountActiveTime({ visible: true, kind: 'reading', now, lastInteractionAt: now - 180_000 })).toBe(false)
    expect(shouldCountActiveTime({ visible: true, kind: 'video', now, lastInteractionAt: 0 })).toBe(true)
    expect(shouldCountActiveTime({ visible: false, kind: 'video', now, lastInteractionAt: now })).toBe(false)
  })

  it('formats minutes and hours compactly', () => {
    expect(formatLearningTime(59)).toBe('0m')
    expect(formatLearningTime(3_900)).toBe('1h 5m')
    expect(formatLearningTime(7_200)).toBe('2h')
  })
})
