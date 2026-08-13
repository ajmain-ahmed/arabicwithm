import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BOOK_TEXT_SCALE,
  MAX_BOOK_TEXT_SCALE,
  MIN_BOOK_TEXT_SCALE,
  normalizeBookTextScale,
} from './bookReaderSettings'

describe('normalizeBookTextScale', () => {
  it('accepts valid numeric and stored string values', () => {
    expect(normalizeBookTextScale(1.2)).toBe(1.2)
    expect(normalizeBookTextScale('0.9')).toBe(0.9)
  })

  it('clamps values to the reader limits', () => {
    expect(normalizeBookTextScale(0.2)).toBe(MIN_BOOK_TEXT_SCALE)
    expect(normalizeBookTextScale(2)).toBe(MAX_BOOK_TEXT_SCALE)
  })

  it('uses the smaller default for invalid stored values', () => {
    expect(normalizeBookTextScale(null)).toBe(DEFAULT_BOOK_TEXT_SCALE)
    expect(normalizeBookTextScale('not-a-size')).toBe(DEFAULT_BOOK_TEXT_SCALE)
  })
})
