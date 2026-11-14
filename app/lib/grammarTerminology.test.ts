import { expect, it } from 'vitest'
import { grammarTerminology } from './grammarTerminology'
it('uses one Arabic companion with no transliteration and is idempotent', () => {
  const text = grammarTerminology(
    'jussive (majzūm / مَجْزُومٌ), nominative, predicate (khabar), direct object',
  )
  expect(text).toBe(
    'jussive (مَجْزُومٌ), nominative (مَرْفُوعٌ), predicate (خَبَرٌ), direct object (مَفْعُولٌ بِهِ)',
  )
  expect(grammarTerminology(text)).toBe(text)
  expect(grammarTerminology('verb (compare the two endings)')).toContain(
    '(compare the two endings)',
  )
})
