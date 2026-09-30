import { describe, expect, it } from 'vitest'
import { formatReadingTime, normalizeReadingTimeMinutes } from './readingTime'

describe('reading time', () => {
  it('formats minute and hour durations for display', () => {
    expect(formatReadingTime(20)).toBe('20 min read')
    expect(formatReadingTime(60)).toBe('1 hr read')
    expect(formatReadingTime(85)).toBe('1 hr 25 min read')
  })

  it('normalizes optional admin values to positive whole minutes', () => {
    expect(normalizeReadingTimeMinutes('45')).toBe(45)
    expect(normalizeReadingTimeMinutes(20.6)).toBe(21)
    expect(normalizeReadingTimeMinutes('')).toBeNull()
    expect(normalizeReadingTimeMinutes(0)).toBeNull()
  })
})
