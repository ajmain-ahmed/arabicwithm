import { normalizeArabicToken, stripDiacritics } from '@/app/lib/arabic'
import type { ExploreTranscriptLine } from '@/app/lib/cartoons'

export type PuzzleSourceType = 'episode' | 'book'

export interface PuzzleSourceReference {
  type: PuzzleSourceType
  id: string
  bookId?: string
  chapterNumber?: number
  title: string
  subtitle: string
  href: string
  level?: string
}

export interface PuzzleWordContext {
  sentenceArabic: string
  translation?: string
  timestamp?: number
  chapterNumber?: number
  paragraphNumber?: number
}

export interface PuzzleVocabularyLine extends ExploreTranscriptLine {
  chapterNumber?: number
  paragraphNumber?: number
}

export interface PuzzleWord {
  id: string
  lemma: string
  surfaceForm: string
  english: string
  contextualTranslation?: string
  root?: string
  pos?: string
  cefr?: string
  context?: PuzzleWordContext
}

export interface PuzzleVocabularySource extends PuzzleSourceReference {
  puzzleId: string
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
  difficulty: WordSearchDifficulty
}

export type WordSearchDifficulty = 'easy' | 'regular' | 'hard'

type WordSearchDirection = readonly [rowDelta: number, columnDelta: number]

export interface WordSearchDifficultyConfig {
  label: string
  gridSize: number
  wordCount: number
  minimumWords: number
  preferredMinLength: number
  preferredMaxLength: number
  directions: readonly WordSearchDirection[]
  overlap: 'avoid' | 'moderate' | 'prefer'
  maxBoardWidth: number
  fillerLetters: readonly string[]
}

const USEFUL_POS = new Map([
  ['phrase', 100],
  ['idiom', 100],
  ['verb', 90],
  ['noun', 80],
  ['adjective', 75],
  ['adverb', 65],
])

const NOMINAL_POS = new Set(['noun', 'adjective', 'adverb'])
const ARABIC_FILL_LETTERS = Array.from('ابتثجحخدذرزسشصضطظعغفقكلمنهوي')
const ARABIC_FREQUENCY_FILL_LETTERS = Array.from('ااااااااااااااااااااااااللللللللللممممممننننننوووووويييييبتتترررسسككددحعفقهصطجشخضغظثذز')
const FORWARD_CARDINAL_DIRECTIONS = [[0, 1], [1, 0]] as const satisfies readonly WordSearchDirection[]
const ALL_DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
] as const satisfies readonly WordSearchDirection[]

export const WORD_SEARCH_DIFFICULTIES: Readonly<Record<WordSearchDifficulty, WordSearchDifficultyConfig>> = {
  easy: {
    label: 'Easy',
    gridSize: 10,
    wordCount: 6,
    minimumWords: 5,
    preferredMinLength: 3,
    preferredMaxLength: 5,
    directions: FORWARD_CARDINAL_DIRECTIONS,
    overlap: 'avoid',
    maxBoardWidth: 680,
    fillerLetters: ARABIC_FILL_LETTERS,
  },
  regular: {
    label: 'Regular',
    gridSize: 14,
    wordCount: 8,
    minimumWords: 7,
    preferredMinLength: 4,
    preferredMaxLength: 7,
    directions: ALL_DIRECTIONS,
    overlap: 'moderate',
    maxBoardWidth: 820,
    fillerLetters: ARABIC_FILL_LETTERS,
  },
  hard: {
    label: 'Hard',
    gridSize: 18,
    wordCount: 10,
    minimumWords: 10,
    preferredMinLength: 6,
    preferredMaxLength: 10,
    directions: ALL_DIRECTIONS,
    overlap: 'prefer',
    maxBoardWidth: 940,
    fillerLetters: ARABIC_FREQUENCY_FILL_LETTERS,
  },
}

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

function cleanDisplayArabic(value: string): string {
  return value.normalize('NFC')
    .replace(/[ـ]/gu, '')
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '')
    .trim()
}

function cleanEnglish(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)
}

function lexicalKey(value: string): string {
  const normalized = normalizePuzzleArabic(value)
  return normalizeArabicToken(normalized).replace(/\s/gu, '') || normalized.replace(/\s/gu, '')
}

function reliableLemma(token: ExploreTranscriptLine['words'][number], pos: string): string | null {
  const explicitLemma = cleanDisplayArabic(token.lemma?.trim() ?? '')
  if (explicitLemma && !explicitLemma.includes(' ')) return explicitLemma

  const surface = cleanDisplayArabic(token.arabic || token.plain || '')
  const headword = cleanDisplayArabic(token.headword?.trim() ?? '')
  if (!surface || !headword || headword.includes(' ')) return null

  const plainSurface = normalizePuzzleArabic(surface).replace(/\s/gu, '')
  const plainHeadword = normalizePuzzleArabic(headword).replace(/\s/gu, '')
  if (!plainSurface || !plainHeadword) return null

  // Verbal headwords in the corpus are often roots. Without an explicit
  // lemma, only the exact dictionary form is safe; ambiguous conjugations
  // are skipped instead of being guessed.
  if (pos === 'verb') return plainSurface === plainHeadword ? surface : null

  // Hans-Wehr-linked nominal headwords are safe when their letters remain
  // visibly present in the encountered inflected form (plural/suffix etc.).
  if (NOMINAL_POS.has(pos) && plainSurface.includes(plainHeadword)) return headword
  return plainSurface === plainHeadword ? surface : null
}

function contextScore(line: ExploreTranscriptLine): number {
  const wordCount = line.words.length
  const idealLength = wordCount >= 3 && wordCount <= 14 ? 22 : wordCount <= 22 ? 8 : -10
  return idealLength
    + (line.translation.trim() ? 12 : 0)
    + (line.arabic.trim() ? 8 : 0)
    - Math.max(0, wordCount - 22)
}

function sentenceForLine(line: ExploreTranscriptLine): string {
  return line.arabic.trim() || line.words.map((word) => word.arabic).join(' ').trim()
}

/** Builds lexical vocabulary while retaining the authentic source form. */
export function extractPuzzleVocabulary(lines: readonly PuzzleVocabularyLine[], limit = 20): PuzzleWord[] {
  const candidates = new Map<string, {
    word: PuzzleWord
    score: number
    contextScore: number
    firstIndex: number
    occurrences: number
  }>()
  let tokenIndex = 0

  for (const line of lines) {
    const sentenceArabic = sentenceForLine(line)
    const exampleScore = contextScore(line)
    for (const token of line.words) {
      const firstIndex = tokenIndex++
      const pos = String(token.entry_type === 'phrase' ? 'phrase' : token.pos ?? '').trim().toLowerCase()
      const posScore = USEFUL_POS.get(pos)
      const english = cleanEnglish(token.english ?? '')
      const lemma = reliableLemma(token, pos)
      const surfaceForm = cleanDisplayArabic(token.arabic || token.plain || '')
      const letters = lemma ? puzzleLetters(lemma) : []

      if (!posScore || !lemma || !surfaceForm || !english || !/[A-Za-z]/.test(english)) continue
      if (normalizePuzzleArabic(lemma).includes(' ') || letters.length < 3 || letters.length > 10) continue
      if (pos === 'proper_noun' || /\b(name|surname|character|place name|proper name)\b/i.test(english)) continue

      const id = lexicalKey(lemma)
      if (!id) continue
      const word: PuzzleWord = {
        id,
        lemma,
        surfaceForm,
        english,
        contextualTranslation: line.translation.trim() || undefined,
        root: token.root?.trim() || undefined,
        pos,
        cefr: token.cefr?.toLowerCase(),
        context: sentenceArabic ? {
          sentenceArabic,
          translation: line.translation.trim() || undefined,
          timestamp: line.timestamp ?? undefined,
          chapterNumber: line.chapterNumber,
          paragraphNumber: line.paragraphNumber,
        } : undefined,
      }
      const existing = candidates.get(id)
      if (existing) {
        existing.occurrences += 1
        if (exampleScore > existing.contextScore) {
          existing.word = word
          existing.contextScore = exampleScore
        }
        continue
      }

      candidates.set(id, {
        word,
        score: posScore + (token.lemma ? 14 : token.headword ? 8 : 0),
        contextScore: exampleScore,
        firstIndex,
        occurrences: 1,
      })
    }
  }

  return [...candidates.values()]
    .sort((a, b) => (
      (b.score + b.contextScore + Math.min(12, b.occurrences * 3))
      - (a.score + a.contextScore + Math.min(12, a.occurrences * 3))
      || a.firstIndex - b.firstIndex
    ))
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(({ word }) => word)
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1))
    ;[result[index], result[next]] = [result[next], result[index]]
  }
  return result
}

function cellsFor(row: number, col: number, dr: number, dc: number, length: number): PuzzleCell[] {
  return Array.from({ length }, (_, index) => ({ row: row + dr * index, col: col + dc * index }))
}

export function generateWordSearch(
  vocabulary: readonly PuzzleWord[],
  options: { difficulty?: WordSearchDifficulty; size?: number; count?: number; random?: () => number } = {},
): WordSearchPuzzle {
  const random = options.random ?? Math.random
  const difficulty = options.difficulty ?? 'regular'
  const config = WORD_SEARCH_DIFFICULTIES[difficulty]
  const size = Math.max(6, Math.min(24, Math.floor(options.size ?? config.gridSize)))
  const count = Math.max(1, Math.min(10, Math.floor(options.count ?? config.wordCount)))
  const grid = Array.from({ length: size }, () => Array<string | null>(size).fill(null))
  const placements: WordSearchPlacement[] = []

  const candidates = shuffle(vocabulary, random)
    .filter((word) => {
      const length = puzzleLetters(word.lemma).length
      return length >= 3 && length <= size
    })
    .sort((a, b) => {
      const aLength = puzzleLetters(a.lemma).length
      const bLength = puzzleLetters(b.lemma).length
      if (difficulty === 'easy') return aLength - bLength
      if (difficulty === 'hard') return bLength - aLength
      const midpoint = (config.preferredMinLength + config.preferredMaxLength) / 2
      return Math.abs(aLength - midpoint) - Math.abs(bLength - midpoint)
    })

  for (const word of candidates) {
    if (placements.length >= count) break
    const letters = puzzleLetters(word.lemma)
    const possiblePlacements: Array<{ cells: PuzzleCell[]; overlaps: number }> = []
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const [dr, dc] = config.directions[Math.floor(random() * config.directions.length)]
      const row = Math.floor(random() * size)
      const col = Math.floor(random() * size)
      const cells = cellsFor(row, col, dr, dc, letters.length)
      if (cells.some((cell) => cell.row < 0 || cell.row >= size || cell.col < 0 || cell.col >= size)) continue
      if (cells.some((cell, index) => grid[cell.row][cell.col] !== null && grid[cell.row][cell.col] !== letters[index])) continue
      const overlaps = cells.filter((cell) => grid[cell.row][cell.col] !== null).length
      if (config.overlap === 'avoid' && overlaps > 1) continue
      if (config.overlap === 'moderate' && overlaps > Math.max(2, Math.floor(letters.length / 2))) continue
      possiblePlacements.push({ cells, overlaps })
    }
    const placedCells = possiblePlacements.sort((a, b) => {
      if (config.overlap === 'avoid') return a.overlaps - b.overlaps
      if (config.overlap === 'prefer') return b.overlaps - a.overlaps
      return Math.abs(a.overlaps - 1) - Math.abs(b.overlaps - 1)
    })[0]?.cells
    if (!placedCells) continue
    placedCells.forEach((cell, index) => { grid[cell.row][cell.col] = letters[index] })
    placements.push({ ...word, cells: placedCells })
  }

  return {
    grid: grid.map((row) => row.map((letter) => letter ?? config.fillerLetters[Math.floor(random() * config.fillerLetters.length)])),
    placements,
    difficulty,
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
