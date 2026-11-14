import { expect, it } from 'vitest'
import { phraseWordGlosses, sourcePhraseGlosses } from './dailyPhrase'
import { platformDate } from './entitlements'

it('keeps glosses aligned and rejects partial, reversed or phrase-level tokenization', () => {
  const words = [
    { arabic: 'عَلَى', english: 'on' },
    { arabic: 'الْفَوْرِ', english: 'the spot' },
  ]
  expect(phraseWordGlosses('على الفور', words)).toEqual(words)
  expect(phraseWordGlosses('على   الفور', words)).toEqual(words)
  expect(phraseWordGlosses('على الفور', [...words].reverse())).toEqual([])
  expect(phraseWordGlosses('على الفور', words.slice(0, 1))).toEqual([])
  expect(phraseWordGlosses('على الفور', [{ arabic: 'على الفور', english: 'immediately' }])).toEqual(
    [],
  )
  expect(
    sourcePhraseGlosses('على الفور', [{ arabic: 'عاد', english: 'returned' }, ...words]),
  ).toEqual(words)
})
it('uses the London date at midnight and across daylight saving time', () => {
  expect(platformDate(new Date('2026-06-14T22:59:59Z'))).toBe('2026-06-14')
  expect(platformDate(new Date('2026-06-14T23:00:00Z'))).toBe('2026-06-15')
  expect(platformDate(new Date('2026-11-14T23:59:59Z'))).toBe('2026-11-14')
  expect(platformDate(new Date('2026-11-15T00:00:00Z'))).toBe('2026-11-15')
})
