import { normalizeArabicToken, stripDiacritics } from '@/app/lib/arabic'
import type { ExploreTranscriptLine } from '@/app/lib/cartoons'

export interface PuzzleWord {
  id: string
  arabic: string
  english: string
  cefr?: string
}

export interface PuzzleVocabularySource {
  episodeId: string
  episodeTitle: string
  episodeSlug: string
  showTitle: string
  showSlug: string
  words: PuzzleWord[]
}

export interface PuzzleCell {
  row: number
  col: number
}

export interface WordSearchPlacement extends PuzzleWord {
  cells: PuzzleCell[]
}

export interface WordSearchPuzzle {
  grid: string[][]
  placements: WordSearchPlacement[]
}

const USEFUL_POS = new Map([
  ['phrase', 100],
  ['idiom', 100],
  ['verb', 90],
  ['noun', 80],
  ['adjective', 75],
  ['adverb', 65],
])

const ARABIC_FILL_LETTERS = Array.from('ابتثجحخدذرزسشصضطظعغفقكلمنهوي')
const SEARCH_DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
] as const

export function normalizePuzzleArabic(value: string): string {
  return stripDiacritics(value.normalize('NFC'))
    .replace(/[ـ]/gu, '')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/[^\p{Script_Extensions=Arabic}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function puzzleLetters(value: string): string[] {
  return Array.from(normalizePuzzleArabic(value).replace(/\s/gu, ''))
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1))
    ;[result[index], result[next]] = [result[next], result[index]]
  }
  return result
}

/** Builds game-ready vocabulary from transcript tokens without mutating them. */
export function extractPuzzleVocabulary(lines: readonly ExploreTranscriptLine[], limit = 20): PuzzleWord[] {
  const candidates = new Map<string, { word: PuzzleWord; score: number; firstIndex: number; occurrences: number }>()
  let tokenIndex = 0

  for (const line of lines) {
    for (const token of line.words) {
      const firstIndex = tokenIndex++
      const pos = String(token.entry_type === 'phrase' ? 'phrase' : token.pos ?? '').trim().toLowerCase()
      const posScore = USEFUL_POS.get(pos)
      const english = token.english?.trim() ?? ''
      const sourceArabic = token.lemma?.trim() || token.arabic?.trim() || token.plain?.trim() || ''
      const arabic = normalizePuzzleArabic(sourceArabic)
      const letters = puzzleLetters(arabic)

      if (!posScore || !english || !/[A-Za-z]/.test(english)) continue
      if (arabic.includes(' ') || letters.length < 3 || letters.length > 10) continue
      if (/\b(name|surname|character|place name|proper name)\b/i.test(english)) continue

      const lexicalSource = token.headword?.trim() || token.lemma?.trim() || arabic
      const lexicalKey = normalizeArabicToken(normalizePuzzleArabic(lexicalSource)).replace(/\s/gu, '') || arabic
      const existing = candidates.get(lexicalKey)
      if (existing) {
        existing.occurrences += 1
        continue
      }

      candidates.set(lexicalKey, {
        word: {
          id: lexicalKey,
          arabic: letters.join(''),
          english: english.replace(/\s+/g, ' ').trim(),
          cefr: token.cefr?.toLowerCase(),
        },
        score: posScore + (token.headword ? 10 : 0),
        firstIndex,
        occurrences: 1,
      })
    }
  }

  return [...candidates.values()]
    .sort((a, b) => (b.score + Math.min(12, b.occurrences * 3)) - (a.score + Math.min(12, a.occurrences * 3)) || a.firstIndex - b.firstIndex)
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(({ word }) => word)
}

function cellsFor(row: number, col: number, dr: number, dc: number, length: number): PuzzleCell[] {
  return Array.from({ length }, (_, index) => ({ row: row + dr * index, col: col + dc * index }))
}

export function generateWordSearch(
  vocabulary: readonly PuzzleWord[],
  options: { size?: number; count?: number; random?: () => number } = {},
): WordSearchPuzzle {
  const random = options.random ?? Math.random
  const longest = Math.max(0, ...vocabulary.map((word) => puzzleLetters(word.arabic).length))
  const size = Math.max(9, Math.min(14, Math.floor(options.size ?? Math.max(10, longest + 2))))
  const count = Math.max(1, Math.min(10, Math.floor(options.count ?? 8)))
  const grid = Array.from({ length: size }, () => Array<string | null>(size).fill(null))
  const placements: WordSearchPlacement[] = []

  const candidates = shuffle(vocabulary, random)
    .filter((word) => {
      const length = puzzleLetters(word.arabic).length
      return length >= 3 && length <= size
    })
    .sort((a, b) => puzzleLetters(b.arabic).length - puzzleLetters(a.arabic).length)

  for (const word of candidates) {
    if (placements.length >= count) break
    const letters = puzzleLetters(word.arabic)
    let placedCells: PuzzleCell[] | null = null
    for (let attempt = 0; attempt < 160 && !placedCells; attempt += 1) {
      const [dr, dc] = SEARCH_DIRECTIONS[Math.floor(random() * SEARCH_DIRECTIONS.length)]
      const row = Math.floor(random() * size)
      const col = Math.floor(random() * size)
      const cells = cellsFor(row, col, dr, dc, letters.length)
      if (cells.some((cell) => cell.row < 0 || cell.row >= size || cell.col < 0 || cell.col >= size)) continue
      if (cells.some((cell, index) => grid[cell.row][cell.col] !== null && grid[cell.row][cell.col] !== letters[index])) continue
      placedCells = cells
    }
    if (!placedCells) continue
    placedCells.forEach((cell, index) => { grid[cell.row][cell.col] = letters[index] })
    placements.push({ ...word, arabic: letters.join(''), cells: placedCells })
  }

  return {
    grid: grid.map((row) => row.map((letter) => letter ?? ARABIC_FILL_LETTERS[Math.floor(random() * ARABIC_FILL_LETTERS.length)])),
    placements,
  }
}

export function sameCells(first: readonly PuzzleCell[], second: readonly PuzzleCell[]): boolean {
  return first.length === second.length && first.every((cell, index) => cell.row === second[index].row && cell.col === second[index].col)
}

export function straightLineBetween(start: PuzzleCell, end: PuzzleCell): PuzzleCell[] {
  const rowDistance = end.row - start.row
  const colDistance = end.col - start.col
  if (rowDistance !== 0 && colDistance !== 0 && Math.abs(rowDistance) !== Math.abs(colDistance)) return []
  const length = Math.max(Math.abs(rowDistance), Math.abs(colDistance)) + 1
  const dr = Math.sign(rowDistance)
  const dc = Math.sign(colDistance)
  return cellsFor(start.row, start.col, dr, dc, length)
}
