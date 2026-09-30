import { describe, expect, it } from 'vitest'
import type { ExploreTranscriptLine } from './cartoons'
import { extractPuzzleVocabulary, generateCrossword, generateWordSearch, normalizePuzzleArabic, sameCells, straightLineBetween } from './transcriptPuzzles'

const lines: ExploreTranscriptLine[] = [{
  timestamp: 0,
  arabic: '',
  arabicPlain: '',
  translation: '',
  words: [
    { arabic: 'مُسْتَشْفَى', plain: 'مستشفى', lemma: 'مُسْتَشْفَى', headword: 'مستشفى', transliteration: 'mustashfa', english: 'hospital', pos: 'noun', cefr: 'a2', entry_type: 'word' },
    { arabic: 'سَافَرَ', plain: 'سافر', lemma: 'سَافَرَ', headword: 'سافر', transliteration: 'safara', english: 'to travel', pos: 'verb', cefr: 'a1', entry_type: 'word' },
    { arabic: 'وَ', plain: 'و', transliteration: 'wa', english: 'and', pos: 'conjunction', entry_type: 'word' },
    { arabic: 'مُسْتَشْفَى', plain: 'مستشفى', lemma: 'مُسْتَشْفَى', headword: 'مستشفى', transliteration: 'mustashfa', english: 'hospital', pos: 'noun', cefr: 'a2', entry_type: 'word' },
  ],
}]

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

describe('transcript puzzle vocabulary', () => {
  it('normalizes diacritics without changing the source transcript', () => {
    expect(normalizePuzzleArabic('مُسْتَشْفَى')).toBe('مستشفى')
    expect(extractPuzzleVocabulary(lines).map((word) => word.english)).toEqual(expect.arrayContaining(['hospital', 'to travel']))
    expect(lines[0].words[0].arabic).toBe('مُسْتَشْفَى')
  })

  it('places Arabic letters and English clues in a word search', () => {
    const vocabulary = extractPuzzleVocabulary(lines)
    const puzzle = generateWordSearch(vocabulary, { size: 10, count: 2, random: seededRandom(25) })
    expect(puzzle.placements).toHaveLength(2)
    expect(puzzle.grid.flat().every((letter) => /\p{Script=Arabic}/u.test(letter))).toBe(true)
    expect(puzzle.placements.map((word) => word.english)).toContain('hospital')
  })

  it('recognizes straight selections in both directions', () => {
    const cells = straightLineBetween({ row: 1, col: 1 }, { row: 1, col: 3 })
    expect(sameCells(cells, [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }])).toBe(true)
    expect(sameCells([...cells].reverse(), straightLineBetween({ row: 1, col: 3 }, { row: 1, col: 1 }))).toBe(true)
    expect(straightLineBetween({ row: 0, col: 0 }, { row: 1, col: 2 })).toEqual([])
  })

  it('creates a connected crossword with across and down entries', () => {
    const vocabulary = [
      ['مستشفى', 'hospital'], ['سافر', 'to travel'], ['قرار', 'decision'], ['رفيق', 'companion'],
      ['قريب', 'near'], ['طريق', 'road'], ['سريع', 'fast'], ['رسالة', 'message'], ['سلام', 'peace'],
    ].map(([arabic, english]) => ({ id: arabic, arabic, english }))
    const puzzle = generateCrossword(vocabulary, { count: 6, random: seededRandom(37) })
    expect(puzzle.entries.length).toBeGreaterThanOrEqual(3)
    expect(new Set(puzzle.entries.map((entry) => entry.direction))).toEqual(new Set(['across', 'down']))
    expect(puzzle.grid.flat().filter(Boolean).every((letter) => /\p{Script=Arabic}/u.test(String(letter)))).toBe(true)
  })
})
