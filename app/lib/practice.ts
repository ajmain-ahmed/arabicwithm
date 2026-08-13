import { stripDiacritics } from '@/app/lib/arabic'

export const PRACTICE_WORDS_METADATA_KEY = 'practice_words'
export const PENDING_PRACTICE_WORD_KEY = 'awm-pending-practice-word'

export type PracticeRating = 'very_easy' | 'easy' | 'medium' | 'hard'
export type PracticeCategory = 'nouns' | 'verbs' | 'phrases' | 'other'

export interface PracticeWordInput {
  id: string
  arabic: string
  plain: string
  headword?: string
  transliteration: string
  english: string
  cefr?: string
  pos?: string
  entryType: 'word' | 'phrase'
}

export interface PracticeWord extends PracticeWordInput {
  addedAt: string
  practiceCount: number
  mastery: number
  lastRating?: PracticeRating
  lastPracticedAt?: string
  lastSelectedAt?: string
}

function cleanString(value: unknown, maxLength = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export function createPracticeWordId(entryType: 'word' | 'phrase', headword: string, arabic: string): string {
  const base = stripDiacritics(headword || arabic).trim().replace(/\s+/g, ' ')
  return `${entryType}:${base}`
}

export function practiceCategoryFor(word: Pick<PracticeWordInput, 'entryType' | 'pos'>): PracticeCategory {
  if (word.entryType === 'phrase' || word.pos?.toLowerCase() === 'phrase') return 'phrases'
  const pos = word.pos?.toLowerCase().replace(/[_-]/g, ' ') ?? ''
  if (pos.includes('verb')) return 'verbs'
  if (pos.includes('noun')) return 'nouns'
  return 'other'
}

export function parsePracticeWords(metadata: Record<string, unknown> | null | undefined): PracticeWord[] {
  const rawWords = metadata?.[PRACTICE_WORDS_METADATA_KEY]
  if (!Array.isArray(rawWords)) return []

  const words: PracticeWord[] = []
  const seen = new Set<string>()

  for (const rawWord of rawWords) {
    if (!rawWord || typeof rawWord !== 'object' || Array.isArray(rawWord)) continue
    const record = rawWord as Record<string, unknown>
    const entryType = record.entryType === 'phrase' ? 'phrase' : 'word'
    const arabic = cleanString(record.arabic, 200)
    const headword = cleanString(record.headword, 200)
    const id = cleanString(record.id, 250) || createPracticeWordId(entryType, headword, arabic)
    if (!id || !arabic || seen.has(id)) continue
    seen.add(id)

    const rating = record.lastRating
    const lastRating = rating === 'very_easy' || rating === 'easy' || rating === 'medium' || rating === 'hard'
      ? rating
      : undefined

    words.push({
      id,
      arabic,
      plain: cleanString(record.plain, 200) || stripDiacritics(arabic),
      headword: headword || undefined,
      transliteration: cleanString(record.transliteration, 250),
      english: cleanString(record.english, 500),
      cefr: cleanString(record.cefr, 10) || undefined,
      pos: cleanString(record.pos, 50) || undefined,
      entryType,
      addedAt: cleanString(record.addedAt, 50) || new Date(0).toISOString(),
      practiceCount: Math.max(0, Number(record.practiceCount) || 0),
      mastery: Math.max(0, Math.min(10, Number(record.mastery) || 0)),
      lastRating,
      lastPracticedAt: cleanString(record.lastPracticedAt, 50) || undefined,
      lastSelectedAt: cleanString(record.lastSelectedAt, 50) || undefined,
    })
  }

  return words
}

function daysSince(value?: string, now = Date.now()): number {
  if (!value) return Number.POSITIVE_INFINITY
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, (now - timestamp) / 86_400_000) : Number.POSITIVE_INFINITY
}

export function selectPracticeWords(
  words: PracticeWord[],
  requestedCount: number,
  random: () => number = Math.random,
  now = Date.now()
): PracticeWord[] {
  const count = Math.max(0, Math.min(Math.floor(requestedCount), words.length))
  if (count === 0) return []

  const unseen = words
    .filter((word) => word.practiceCount === 0)
    .map((word) => ({ word, score: random() + Math.min(daysSince(word.lastSelectedAt, now), 7) / 7 }))
    .sort((a, b) => b.score - a.score)
    .map(({ word }) => word)

  if (unseen.length >= count) return unseen.slice(0, count)

  const unseenIds = new Set(unseen.map((word) => word.id))
  const ratingWeight: Record<PracticeRating, number> = {
    hard: 5,
    medium: 3,
    easy: 1.5,
    very_easy: 0.6,
  }

  const reviewed = words
    .filter((word) => !unseenIds.has(word.id))
    .map((word) => {
      const overdueFactor = Math.min(4, 0.5 + daysSince(word.lastPracticedAt, now) / 3)
      const difficultyFactor = word.lastRating ? ratingWeight[word.lastRating] : 2
      const familiarityFactor = 1 / (1 + word.mastery * 0.25)
      const recentSelectionPenalty = daysSince(word.lastSelectedAt, now) < 1 ? 0.15 : 1
      const weight = Math.max(0.05, overdueFactor * difficultyFactor * familiarityFactor * recentSelectionPenalty)
      return { word, score: Math.pow(Math.max(random(), 0.0001), 1 / weight) }
    })
    .sort((a, b) => b.score - a.score)
    .map(({ word }) => word)

  return [...unseen, ...reviewed].slice(0, count)
}
