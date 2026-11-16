import { expect, it } from 'vitest'
import { normalizeGrammarNote } from './grammarNote'
it('keeps approved legacy notes readable when optional fields are null or malformed', () => {
  const note = normalizeGrammarNote({ id: 'note', status: 'approved', title_en: 'The predicate', mechanics: null, transformations: {}, examples: [null, { id: 'example', arabic: 'كتاب', highlight: null, explanation: null }] })!
  expect(note.title_en).toContain('predicate (')
  expect(note.mechanics).toBe('')
  expect(note.transformations).toEqual([])
  expect(note.examples).toEqual([expect.objectContaining({ arabic: 'كتاب', highlight: '', explanation: '' })])
})
it.each(['candidate','rejected',undefined])('does not expose %s notes', status => {
  expect(normalizeGrammarNote({ id: 'note', status })).toBeNull()
})
