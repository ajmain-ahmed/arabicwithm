import { describe, expect, it } from 'vitest'
import { dailyRotationIndex } from './dailyRotation'

describe('dailyRotationIndex', () => {
  it('moves to the next item on the next calendar day', () => {
    const today = dailyRotationIndex(5, new Date('2026-08-13T12:00:00Z'))
    const tomorrow = dailyRotationIndex(5, new Date('2026-08-14T12:00:00Z'))

    expect(tomorrow).toBe((today + 1) % 5)
  })

  it('uses the London calendar date around midnight', () => {
    const beforeLondonMidnight = dailyRotationIndex(7, new Date('2026-08-13T22:30:00Z'))
    const afterLondonMidnight = dailyRotationIndex(7, new Date('2026-08-13T23:30:00Z'))

    expect(afterLondonMidnight).toBe((beforeLondonMidnight + 1) % 7)
  })

  it('keeps a single available item selected', () => {
    expect(dailyRotationIndex(1, new Date('2026-08-13T12:00:00Z'))).toBe(0)
  })

  it('returns no selection for an empty collection', () => {
    expect(dailyRotationIndex(0, new Date('2026-08-13T12:00:00Z'))).toBe(-1)
  })
})
