import { describe, expect, it } from 'vitest'
import type { ExploreTranscriptLine } from './cartoons'
import { extractPuzzleVocabulary, generateWordSearch, normalizePuzzleArabic, sameCells, straightLineBetween } from './transcriptPuzzles'

const lines: ExploreTranscriptLine[] = [{
  timestamp: 12,
  arabic: 'كَتَبَ الطَّالِبُ كِتَابَهُ في المَدْرَسَةِ.',
  arabicPlain: '',
  translation: 'The student wrote his book at school.',
  words: [
    { arabic: 'كَتَبَ', plain: 'كتب', lemma: 'كَتَبَ', headword: 'كتب', transliteration: 'kataba', english: 'to write', pos: 'verb', cefr: 'a1', entry_type: 'word' },
    { arabic: 'كِتَابَهُ', plain: 'كتابه', headword: 'كتاب', transliteration: 'kitabahu', english: 'book', pos: 'noun', cefr: 'a1', entry_type: 'word' },
    { arabic: 'المَدْرَسَةِ', plain: 'المدرسة', headword: 'مدرسة', transliteration: 'al-madrasa', english: 'school', pos: 'noun', cefr: 'a1', entry_type: 'word' },
    { arabic: 'يَكْتُبُونَ', plain: 'يكتبون', headword: 'كتب', transliteration: 'yaktubuna', english: 'they write', pos: 'verb', entry_type: 'word' },
  ],
}, {
  timestamp: 18,
  arabic: 'هذا كِتَابٌ مفيد.',
  arabicPlain: '',
  translation: 'This is a useful book.',
  words: [
    { arabic: 'كِتَابٌ', plain: 'كتاب', headword: 'كتاب', transliteration: 'kitab', english: 'book', pos: 'noun', cefr: 'a1', entry_type: 'word' },
  ],
}]

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

describe('word-search lexical vocabulary', () => {
  it('normalizes punctuation only for lookup and grid use', () => {
    expect(normalizePuzzleArabic('الكتاب؟')).toBe('الكتاب')
    expect(normalizePuzzleArabic('السفر،')).toBe('السفر')
    expect(normalizePuzzleArabic('«قرار»…')).toBe('قرار')
  })

  it('keeps lemma, surface form, and authentic context separate', () => {
    const vocabulary = extractPuzzleVocabulary(lines)
    const book = vocabulary.find((word) => word.id.includes('كتاب'))
    expect(book).toMatchObject({
      lemma: 'كتاب',
      surfaceForm: 'كِتَابَهُ',
      english: 'book',
      contextualTranslation: 'The student wrote his book at school.',
    })
    expect(book?.context?.sentenceArabic).toContain('كِتَابَهُ')
    expect(lines[0].words[1].arabic).toBe('كِتَابَهُ')
  })

  it('deduplicates surface forms by lexical lemma and keeps one lexical entry', () => {
    const books = extractPuzzleVocabulary(lines).filter((word) => word.id.includes('كتاب'))
    expect(books).toHaveLength(1)
  })

  it('excludes conjugated verbs when no reliable lemma is present', () => {
    const vocabulary = extractPuzzleVocabulary(lines)
    expect(vocabulary.some((word) => normalizePuzzleArabic(word.surfaceForm) === 'يكتبون')).toBe(false)
    expect(vocabulary.find((word) => word.id === 'كتب')?.lemma).toBe('كَتَبَ')
  })

  it('places canonical lemma letters and retains learning metadata', () => {
    const vocabulary = extractPuzzleVocabulary(lines)
    const puzzle = generateWordSearch(vocabulary, { size: 10, count: 3, random: seededRandom(25) })
    expect(puzzle.placements.length).toBeGreaterThanOrEqual(2)
    expect(puzzle.grid.flat().every((letter) => /\p{Script=Arabic}/u.test(letter))).toBe(true)
    expect(puzzle.placements.some((word) => word.lemma === 'كَتَبَ')).toBe(true)
    expect(puzzle.placements.every((word) => Boolean(word.surfaceForm))).toBe(true)
  })

  it('recognizes straight selections in both directions', () => {
    const cells = straightLineBetween({ row: 1, col: 1 }, { row: 1, col: 3 })
    expect(sameCells(cells, [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }])).toBe(true)
    expect(sameCells([...cells].reverse(), straightLineBetween({ row: 1, col: 3 }, { row: 1, col: 1 }))).toBe(true)
    expect(straightLineBetween({ row: 0, col: 0 }, { row: 1, col: 2 })).toEqual([])
  })
})
