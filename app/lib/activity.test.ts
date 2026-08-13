import { describe, expect, it } from 'vitest'
import { addActivity, calculateLearningStreak, formatLearningTime, parseLearningActivity } from './activity'

describe('learning activity', () => {
  it('sanitises profile activity metadata', () => {
    expect(parseLearningActivity({
      learning_activity: { totalSeconds: 125.8, activeDates: ['2026-08-11', 'invalid', '2026-08-11'] },
    })).toEqual({ totalSeconds: 125, activeDates: ['2026-08-11'] })
  })

  it('adds active time and records the date once', () => {
    const activity = addActivity({ totalSeconds: 60, activeDates: ['2026-08-12'] }, 65, new Date(2026, 7, 13))
    expect(activity).toEqual({ totalSeconds: 125, activeDates: ['2026-08-12', '2026-08-13'] })
  })

  it('calculates streaks ending today or yesterday', () => {
    const today = new Date(2026, 7, 13, 12)
    expect(calculateLearningStreak(['2026-08-11', '2026-08-12', '2026-08-13'], today)).toBe(3)
    expect(calculateLearningStreak(['2026-08-10', '2026-08-11', '2026-08-12'], today)).toBe(3)
  })

  it('formats minutes and hours compactly', () => {
    expect(formatLearningTime(59)).toBe('0m')
    expect(formatLearningTime(3_900)).toBe('1h 5m')
    expect(formatLearningTime(7_200)).toBe('2h')
  })
})
