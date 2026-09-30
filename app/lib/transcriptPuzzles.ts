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

export interface CrosswordEntry extends PuzzleWord {
  answer: string
  direction: 'across' | 'down'
  number: number
  cells: PuzzleCell[]
}

export interface CrosswordPuzzle {
  grid: Array<Array<string | null>>
  entries: CrosswordEntry[]
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
    .replace(/[^\p{Script_Extensions=Arabic}\s]/gu, '')
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

type WorkingCrosswordEntry = Omit<CrosswordEntry, 'number'>

function crosswordCandidateCells(answer: string, intersection: PuzzleCell, letterIndex: number, direction: 'across' | 'down'): PuzzleCell[] {
  const [dr, dc] = direction === 'across' ? [0, -1] : [1, 0]
  return cellsFor(intersection.row - dr * letterIndex, intersection.col - dc * letterIndex, dr, dc, puzzleLetters(answer).length)
}

function canPlaceCrossword(
  grid: Array<Array<string | null>>,
  cells: readonly PuzzleCell[],
  letters: readonly string[],
  direction: 'across' | 'down',
): boolean {
  const size = grid.length
  if (cells.some((cell) => cell.row < 0 || cell.row >= size || cell.col < 0 || cell.col >= size)) return false
  let intersections = 0
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]
    const existing = grid[cell.row][cell.col]
    if (existing !== null) {
      if (existing !== letters[index]) return false
      intersections += 1
      continue
    }
    const neighbours = direction === 'across'
      ? [[cell.row - 1, cell.col], [cell.row + 1, cell.col]]
      : [[cell.row, cell.col - 1], [cell.row, cell.col + 1]]
    if (neighbours.some(([row, col]) => row >= 0 && row < size && col >= 0 && col < size && grid[row][col] !== null)) return false
  }
  if (intersections !== 1) return false
  const first = cells[0]
  const last = cells[cells.length - 1]
  const [dr, dc] = direction === 'across' ? [0, -1] : [1, 0]
  const before = { row: first.row - dr, col: first.col - dc }
  const after = { row: last.row + dr, col: last.col + dc }
  return [before, after].every((cell) => cell.row < 0 || cell.row >= size || cell.col < 0 || cell.col >= size || grid[cell.row][cell.col] === null)
}

function buildCrossword(vocabulary: readonly PuzzleWord[], size: number, count: number, random: () => number): WorkingCrosswordEntry[] {
  const grid = Array.from({ length: size }, () => Array<string | null>(size).fill(null))
  const candidates = shuffle(vocabulary, random).filter((word) => {
    const length = puzzleLetters(word.arabic).length
    return length >= 3 && length <= size - 2
  })
  const first = [...candidates].sort((a, b) => puzzleLetters(b.arabic).length - puzzleLetters(a.arabic).length)[0]
  if (!first) return []
  const firstLetters = puzzleLetters(first.arabic)
  const firstCells = crosswordCandidateCells(first.arabic, { row: Math.floor(size / 2), col: Math.floor(size / 2) + Math.floor(firstLetters.length / 2) }, 0, 'across')
  firstCells.forEach((cell, index) => { grid[cell.row][cell.col] = firstLetters[index] })
  const entries: WorkingCrosswordEntry[] = [{ ...first, answer: firstLetters.join(''), direction: 'across', cells: firstCells }]

  for (const word of candidates) {
    if (entries.length >= count || word.id === first.id) continue
    const letters = puzzleLetters(word.arabic)
    let placement: { cells: PuzzleCell[]; direction: 'across' | 'down' } | null = null
    const existingEntries = shuffle(entries, random)
    for (const existing of existingEntries) {
      const direction = existing.direction === 'across' ? 'down' : 'across'
      const existingLetters = puzzleLetters(existing.answer)
      const matches = shuffle(existingLetters.flatMap((letter, existingIndex) => letters.flatMap((candidateLetter, letterIndex) => letter === candidateLetter ? [{ existingIndex, letterIndex }] : [])), random)
      for (const match of matches) {
        const cells = crosswordCandidateCells(word.arabic, existing.cells[match.existingIndex], match.letterIndex, direction)
        if (!canPlaceCrossword(grid, cells, letters, direction)) continue
        placement = { cells, direction }
        break
      }
      if (placement) break
    }
    if (!placement) continue
    placement.cells.forEach((cell, index) => { grid[cell.row][cell.col] = letters[index] })
    entries.push({ ...word, answer: letters.join(''), direction: placement.direction, cells: placement.cells })
  }
  return entries
}

export function generateCrossword(
  vocabulary: readonly PuzzleWord[],
  options: { size?: number; count?: number; random?: () => number } = {},
): CrosswordPuzzle {
  const random = options.random ?? Math.random
  const size = Math.max(11, Math.min(17, Math.floor(options.size ?? 15)))
  const count = Math.max(3, Math.min(10, Math.floor(options.count ?? 8)))
  let best: WorkingCrosswordEntry[] = []
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const entries = buildCrossword(vocabulary, size, count, random)
    if (entries.length > best.length) best = entries
    if (best.length >= count) break
  }
  if (best.length === 0) return { grid: [], entries: [] }

  const allCells = best.flatMap((entry) => entry.cells)
  const minRow = Math.min(...allCells.map((cell) => cell.row))
  const maxRow = Math.max(...allCells.map((cell) => cell.row))
  const minCol = Math.min(...allCells.map((cell) => cell.col))
  const maxCol = Math.max(...allCells.map((cell) => cell.col))
  const answerGrid = Array.from({ length: maxRow - minRow + 1 }, () => Array<string | null>(maxCol - minCol + 1).fill(null))
  const shifted = best.map((entry) => ({ ...entry, cells: entry.cells.map((cell) => ({ row: cell.row - minRow, col: cell.col - minCol })) }))
  shifted.forEach((entry) => entry.cells.forEach((cell, index) => { answerGrid[cell.row][cell.col] = puzzleLetters(entry.answer)[index] }))

  const numberByStart = new Map<string, number>()
  const starts = [...new Set(shifted.map((entry) => `${entry.cells[0].row}:${entry.cells[0].col}`))]
    .sort((a, b) => {
      const [ar, ac] = a.split(':').map(Number)
      const [br, bc] = b.split(':').map(Number)
      return ar - br || ac - bc
    })
  starts.forEach((key, index) => numberByStart.set(key, index + 1))

  return {
    grid: answerGrid,
    entries: shifted.map((entry) => ({ ...entry, number: numberByStart.get(`${entry.cells[0].row}:${entry.cells[0].col}`) ?? 0 })),
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
