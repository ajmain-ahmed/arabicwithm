import { describe, it, expect } from 'vitest'
import { stripDiacritics, normalizeArabicToken } from './arabic'

describe('arabic', () => {
  it('strips diacritics', () => {
    expect(stripDiacritics('كِتَاب')).toBe('كتاب')
    expect(stripDiacritics('الْعَرَبِيَّة')).toBe('العربية')
  })

  it('normalizes Arabic tokens by removing prefixes and suffixes', () => {
    expect(normalizeArabicToken('الكتاب')).toBe('كتاب')
    expect(normalizeArabicToken('والمكتبة')).toBe('مكتبة')
  })
})
