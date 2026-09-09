import { describe, expect, it } from 'vitest'
import { canAccessBookChapter, getRemainingFreeMemoryCards, hasPremium, platformDate } from './entitlements'
describe('central access policy', () => {
  it.each([4, 5, 6, 12, 30])('protects a %i chapter book for both languages', chapterCount => {
    const book = { chapterCount, freeChapterCount: 5, premiumExempt: false }
    for (let chapter = 1; chapter <= chapterCount; chapter++) {
      expect(canAccessBookChapter(false, book, chapter)).toBe(chapter <= 5)
      expect(canAccessBookChapter(true, book, chapter)).toBe(true)
    }
    expect(canAccessBookChapter(false, { ...book, premiumExempt: true }, chapterCount)).toBe(true)
  })
  it('rejects invalid chapter indices', () => {
    expect(canAccessBookChapter(true, { chapterCount: 6, freeChapterCount: 5, premiumExempt: false }, -1)).toBe(false)
  })
  it('uses paid status and expiry, including cancellation at period end', () => {
    const now = new Date('2026-09-09T00:00:00Z')
    expect(hasPremium({ status: 'active', current_period_end: '2026-10-01' }, now)).toBe(true)
    for (const status of ['past_due', 'unpaid', 'incomplete', 'canceled', 'expired', 'trialing']) expect(hasPremium({ status, current_period_end: '2026-10-01' }, now)).toBe(false)
    expect(hasPremium({ status: 'active', current_period_end: '2026-09-08' }, now)).toBe(false)
    expect(hasPremium(null, now)).toBe(false)
  })
  it('shares a daily allowance and London calendar boundaries, including DST', () => {
    expect(getRemainingFreeMemoryCards(8)).toBe(12)
    expect(getRemainingFreeMemoryCards(20)).toBe(0)
    expect(getRemainingFreeMemoryCards(24)).toBe(0)
    expect(platformDate(new Date('2026-09-09T23:01:00Z'))).toBe('2026-09-10')
    expect(platformDate(new Date('2026-12-09T23:01:00Z'))).toBe('2026-12-09')
  })
})
