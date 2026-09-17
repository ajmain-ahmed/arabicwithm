import { describe, expect, it } from 'vitest'
import { CEFR_LEVELS, CEFR_PALETTE, getCefrPalette, parseCefrLevel } from './cefr'

describe('CEFR colour palette', () => {
  it('assigns every CEFR level a distinct colour', () => {
    const colors = CEFR_LEVELS.map((level) => CEFR_PALETTE[level].background)
    expect(new Set(colors).size).toBe(CEFR_LEVELS.length)
  })

  it('normalises lowercase and composite level labels', () => {
    expect(parseCefrLevel('a1')).toBe('A1')
    expect(parseCefrLevel('A2-B1')).toBe('A2')
    expect(getCefrPalette('b2')).toBe(CEFR_PALETTE.B2)
  })

  it('provides a neutral fallback for non-CEFR labels', () => {
    expect(parseCefrLevel('Beginner')).toBeNull()
    expect(getCefrPalette('Beginner').background).toBe('#5f5954')
  })
})
