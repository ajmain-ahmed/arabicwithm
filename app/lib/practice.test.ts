import { describe, expect, it } from 'vitest'
import { practiceCategoryFor, selectPracticeWords, type PracticeWord } from './practice'

const word = (id: string, overrides: Partial<PracticeWord> = {}): PracticeWord => ({
  id,
  arabic: id,
  plain: id,
  transliteration: id,
  english: id,
  entryType: 'word',
  addedAt: '2026-01-01T00:00:00.000Z',
  practiceCount: 0,
  mastery: 0,
  ...overrides,
})

describe('practiceCategoryFor', () => {
  it('groups nouns, verbs, and phrases', () => {
    expect(practiceCategoryFor(word('noun', { pos: 'proper_noun' }))).toBe('nouns')
    expect(practiceCategoryFor(word('verb', { pos: 'verb' }))).toBe('verbs')
    expect(practiceCategoryFor(word('phrase', { entryType: 'phrase' }))).toBe('phrases')
  })
})

describe('selectPracticeWords', () => {
  it('selects unseen words before reviewed words', () => {
    const words = [
      word('reviewed', { practiceCount: 4, mastery: 4, lastRating: 'hard' }),
      word('new-1'),
      word('new-2'),
    ]
    const selected = selectPracticeWords(words, 2, () => 0.5)
    expect(selected.map((item) => item.id).sort()).toEqual(['new-1', 'new-2'])
  })

  it('returns unique cards and respects the requested count', () => {
    const words = [word('one'), word('two'), word('three'), word('four')]
    const selected = selectPracticeWords(words, 3, () => 0.5)
    expect(selected).toHaveLength(3)
    expect(new Set(selected.map((item) => item.id)).size).toBe(3)
  })

  it('favours difficult reviewed words over mastered easy words', () => {
    const words = [
      word('very-easy', { practiceCount: 5, mastery: 9, lastRating: 'very_easy' }),
      word('hard', { practiceCount: 2, mastery: 1, lastRating: 'hard' }),
    ]
    const selected = selectPracticeWords(words, 1, () => 0.5)
    expect(selected[0].id).toBe('hard')
  })
})
