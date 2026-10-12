import { describe, expect, it } from 'vitest'
import { formatSupportAmount, parseSupportAmountToPence } from './supportAmount'

describe('support amount helpers', () => {
  it('parses whole and decimal GBP amounts without floating-point rounding', () => {
    expect(parseSupportAmountToPence('5')).toBe(500)
    expect(parseSupportAmountToPence('10.5')).toBe(1050)
    expect(parseSupportAmountToPence(' 20.05 ')).toBe(2005)
  })

  it('rejects zero, negative, malformed, and over-precise values', () => {
    expect(parseSupportAmountToPence('0')).toBeNull()
    expect(parseSupportAmountToPence('-5')).toBeNull()
    expect(parseSupportAmountToPence('abc')).toBeNull()
    expect(parseSupportAmountToPence('4.999')).toBeNull()
  })

  it('formats pence as GBP', () => {
    expect(formatSupportAmount(500)).toBe('£5.00')
  })
})
