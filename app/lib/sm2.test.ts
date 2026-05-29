import { describe, it, expect } from 'vitest'
import { computeAnswerResult, type ProgressState } from './sm2'
import type { Answer } from '@/app/actions/revision'

const NEW_CARD: ProgressState = {
  repetitions: 0,
  interval_days: 0,
  ease_factor: 2.5,
  lapses: 0,
}

const REVIEW_CARD: ProgressState = {
  repetitions: 3,
  interval_days: 7,
  ease_factor: 2.5,
  lapses: 0,
}

describe('computeAnswerResult', () => {
  describe('learning phase (interval_days === 0)', () => {
    it('again: resets reps, keeps interval 0, reduces ease', () => {
      const result = computeAnswerResult(NEW_CARD, 'again')
      expect(result.repetitions).toBe(0)
      expect(result.interval_days).toBe(0)
      expect(result.ease_factor).toBe(2.3)
      expect(result.graduated).toBe(false)
      expect(result.nextReview).toBeNull()
    })

    it('hard: stays in learning, reduces ease', () => {
      const result = computeAnswerResult(NEW_CARD, 'hard')
      expect(result.repetitions).toBe(1)
      expect(result.interval_days).toBe(0)
      expect(result.ease_factor).toBe(2.35)
      expect(result.graduated).toBe(false)
      expect(result.nextReview).toBeNull()
    })

    it('good: graduates with interval 1, preserves ease', () => {
      const result = computeAnswerResult(NEW_CARD, 'good')
      expect(result.repetitions).toBe(1)
      expect(result.interval_days).toBe(1)
      expect(result.ease_factor).toBe(2.5)
      expect(result.graduated).toBe(true)
      expect(result.nextReview).not.toBeNull()
    })

    it('easy: graduates with interval 1, increases ease', () => {
      const result = computeAnswerResult(NEW_CARD, 'easy')
      expect(result.repetitions).toBe(1)
      expect(result.interval_days).toBe(1)
      expect(result.ease_factor).toBe(2.65)
      expect(result.graduated).toBe(true)
      expect(result.nextReview).not.toBeNull()
    })

    it('again after hard: reps do not go below 0', () => {
      const hard = computeAnswerResult(NEW_CARD, 'hard')
      const again = computeAnswerResult(
        { repetitions: hard.repetitions, interval_days: hard.interval_days, ease_factor: hard.ease_factor, lapses: 0 },
        'again'
      )
      expect(again.repetitions).toBe(0)
      expect(again.interval_days).toBe(0)
    })

    it('ease never drops below 1.3', () => {
      const lowEase: ProgressState = { repetitions: 0, interval_days: 0, ease_factor: 1.35, lapses: 0 }
      const result = computeAnswerResult(lowEase, 'again')
      expect(result.ease_factor).toBe(1.3)
    })
  })

  describe('review phase (interval_days > 0)', () => {
    it('again: lapses, resets interval to 0, reduces ease', () => {
      const result = computeAnswerResult(REVIEW_CARD, 'again')
      expect(result.repetitions).toBe(2)
      expect(result.interval_days).toBe(0)
      expect(result.ease_factor).toBe(2.3)
      expect(result.graduated).toBe(false)
      expect(result.nextReview).toBeNull()
    })

    it('hard: keeps graduated, 1.2x interval, reduces ease', () => {
      const result = computeAnswerResult(REVIEW_CARD, 'hard')
      expect(result.repetitions).toBe(4)
      expect(result.interval_days).toBe(8) // 7 * 1.2 = 8.4 → rounded
      expect(result.ease_factor).toBe(2.35)
      expect(result.graduated).toBe(true)
      expect(result.nextReview).not.toBeNull()
    })

    it('good: multiplies interval by ease factor', () => {
      const result = computeAnswerResult(REVIEW_CARD, 'good')
      expect(result.repetitions).toBe(4)
      expect(result.interval_days).toBe(18) // 7 * 2.5 = 17.5 → rounded
      expect(result.ease_factor).toBe(2.5)
      expect(result.graduated).toBe(true)
    })

    it('easy: multiplies interval by ease * 1.3, increases ease', () => {
      const result = computeAnswerResult(REVIEW_CARD, 'easy')
      expect(result.repetitions).toBe(4)
      expect(result.interval_days).toBe(23) // 7 * 2.5 * 1.3 = 22.75 → rounded
      expect(result.ease_factor).toBe(2.65)
      expect(result.graduated).toBe(true)
    })

    it('nextReview is newInterval days from today', () => {
      const before = new Date()
      const result = computeAnswerResult(REVIEW_CARD, 'good')
      const after = new Date()
      expect(result.nextReview).not.toBeNull()
      const expected = new Date(before)
      expected.setUTCDate(expected.getUTCDate() + result.interval_days)
      // Allow 1-second tolerance for test execution time
      expect(result.nextReview!.getTime()).toBeGreaterThanOrEqual(expected.getTime() - 1000)
      expect(result.nextReview!.getTime()).toBeLessThanOrEqual(expected.getTime() + 1000)
    })

    it('interval never goes below 1 in review phase for hard', () => {
      const shortInterval: ProgressState = { repetitions: 1, interval_days: 1, ease_factor: 2.5, lapses: 0 }
      const result = computeAnswerResult(shortInterval, 'hard')
      expect(result.interval_days).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('handles very high ease factor without overflow', () => {
      const highEase: ProgressState = { repetitions: 10, interval_days: 365, ease_factor: 3.0, lapses: 0 }
      const result = computeAnswerResult(highEase, 'easy')
      expect(result.ease_factor).toBe(3.15)
      expect(result.interval_days).toBeGreaterThan(365)
    })

    it('preserves time-of-day when computing nextReview', () => {
      const result = computeAnswerResult(REVIEW_CARD, 'good')
      const now = new Date()
      if (result.nextReview) {
        expect(result.nextReview.getUTCHours()).toBe(now.getUTCHours())
        expect(result.nextReview.getUTCMinutes()).toBe(now.getUTCMinutes())
      }
    })
  })
})
