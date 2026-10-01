import { describe, expect, it } from 'vitest'
import { calculateWordSearchAccuracy, calculateWordSearchXp, formatWordSearchDuration, shouldCompleteWordSearch } from './wordSearchProgress'

describe('Word Search progress', () => {
  it('rewards completion and accuracy without a speed bonus', () => {
    expect(calculateWordSearchXp({ wordCount: 8, wordsFound: 8, mistakes: 0, hintsUsed: 0, revealsUsed: 3, durationSeconds: 600 })).toBe(38)
    expect(calculateWordSearchXp({ wordCount: 8, wordsFound: 8, mistakes: 2, hintsUsed: 1, revealsUsed: 0, durationSeconds: 30 })).toBe(28)
  })

  it('does not award incomplete activities', () => {
    expect(calculateWordSearchXp({ wordCount: 8, wordsFound: 7, mistakes: 0, hintsUsed: 0, revealsUsed: 0, durationSeconds: 20 })).toBe(0)
  })

  it('formats time naturally and calculates accuracy', () => {
    expect(formatWordSearchDuration(43)).toBe('43 sec')
    expect(formatWordSearchDuration(78)).toBe('1 min 18 sec')
    expect(calculateWordSearchAccuracy(10, 1)).toBe(91)
  })

  it('fires completion only for the first final-word transition', () => {
    expect(shouldCompleteWordSearch(8, 8, false)).toBe(true)
    expect(shouldCompleteWordSearch(8, 8, true)).toBe(false)
    expect(shouldCompleteWordSearch(7, 8, false)).toBe(false)
  })
})
