import { describe, expect, it } from 'vitest'
import type { ExploreTranscriptLine } from './cartoons'
import { extractPuzzleVocabulary, generateWordSearch, normalizePuzzleArabic, sameCells, straightLineBetween, WORD_SEARCH_DIFFICULTIES, type PuzzleWord } from './transcriptPuzzles'

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

const difficultyWords: PuzzleWord[] = [
  ['قلم', 'pen'], ['كتاب', 'book'], ['بيت', 'house'], ['مدرسة', 'school'],
  ['سيارة', 'car'], ['مكتبة', 'library'], ['حديقة', 'garden'], ['مستشفى', 'hospital'],
  ['استكشاف', 'exploration'], ['مسؤولية', 'responsibility'], ['استقلال', 'independence'], ['استراتيجية', 'strategy'],
].map(([lemma, english], index) => ({ id: `word-${index}`, lemma, surfaceForm: lemma, english }))

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

  it('centralizes the three requested difficulty configurations', () => {
    expect(WORD_SEARCH_DIFFICULTIES.easy).toMatchObject({ gridSize: 10, wordCount: 6, overlap: 'avoid' })
    expect(WORD_SEARCH_DIFFICULTIES.regular).toMatchObject({ gridSize: 14, wordCount: 8, overlap: 'moderate' })
    expect(WORD_SEARCH_DIFFICULTIES.hard).toMatchObject({ gridSize: 18, wordCount: 10, overlap: 'prefer' })
  })

  it.each([
    ['easy', 10, 6],
    ['regular', 14, 8],
    ['hard', 18, 10],
  ] as const)('generates a playable %s puzzle at the configured dimensions', (difficulty, size, count) => {
    const puzzle = generateWordSearch(difficultyWords, { difficulty, random: seededRandom(42) })
    expect(puzzle.difficulty).toBe(difficulty)
    expect(puzzle.grid).toHaveLength(size)
    expect(puzzle.grid.every((row) => row.length === size)).toBe(true)
    expect(puzzle.placements).toHaveLength(count)
  })

  it('keeps Easy placements horizontal or vertical and prefers shorter words than Hard', () => {
    const easy = generateWordSearch(difficultyWords, { difficulty: 'easy', random: seededRandom(7) })
    const hard = generateWordSearch(difficultyWords, { difficulty: 'hard', random: seededRandom(7) })
    expect(easy.placements.every((placement) => {
      const first = placement.cells[0]
      const last = placement.cells.at(-1)!
      return (first.row === last.row || first.col === last.col) && last.row >= first.row && last.col >= first.col
    })).toBe(true)
    const averageLength = (puzzle: typeof easy) => puzzle.placements.reduce((sum, word) => sum + normalizePuzzleArabic(word.lemma).length, 0) / puzzle.placements.length
    expect(averageLength(easy)).toBeLessThan(averageLength(hard))
  })
})
