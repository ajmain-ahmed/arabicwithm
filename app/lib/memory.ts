import { isNewTranscript, normalizeNewTranscript } from '@/app/lib/cartoons'
import { stripDiacritics } from '@/app/lib/arabic'

export type MemoryDirection = 'english' | 'arabic'
export type MemoryRating = 'again' | 'known'

export interface MemoryEpisodeInput {
  id: string
  showId: string
  showSlug: string
  showTitle: string
  episodeSlug: string
  episodeTitle: string
  cover?: string
  transcript: unknown
}

export interface MemoryCard {
  id: string
  showId: string
  showSlug: string
  showTitle: string
  episodeId: string
  episodeSlug: string
  episodeTitle: string
  cover?: string
  timestamp: number | null
  arabic: string
  english: string
}

function hasUsefulArabic(value: string): boolean {
  return (value.match(/\p{Script=Arabic}/gu) ?? []).length >= 3
}

function hasUsefulEnglish(value: string): boolean {
  return (value.match(/[A-Za-z]/g) ?? []).length >= 3
}

const REUSABLE_SINGLE_ARABIC = new Set(['شكرا', 'عفوا', 'مرحبا', 'تفضل', 'وداعا'])
const LOW_VALUE_ENGLISH = new Set(['ah', 'oh', 'uh', 'um', 'hmm', 'hm', 'hey'])
const REUSABLE_STRUCTURE = /(^|\s)(هل|كيف|أين|متى|لماذا|ماذا|أريد|يمكن|يجب|ليس|هذا|هذه|أنا|نحن|إذا|لأن|من|ما)(\s|$)/u

function normalizedWords(value: string): string[] {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function normalizedCardKey(card: MemoryCard): string {
  return `${normalizedWords(card.arabic).join(' ')}|${normalizedWords(card.english).join(' ')}`
}

/** Pedagogical score used before a transcript line can enter Memory. */
export function scoreMemoryCard(card: MemoryCard): number {
  const arabicWords = normalizedWords(card.arabic)
  const englishWords = normalizedWords(card.english)
  if (!hasUsefulArabic(card.arabic) || !hasUsefulEnglish(card.english)) return 0
  if (LOW_VALUE_ENGLISH.has(englishWords.join(' '))) return 0
  if (arabicWords.length === 1 && !REUSABLE_SINGLE_ARABIC.has(arabicWords[0])) return 0
  if (englishWords.length === 1 && !REUSABLE_SINGLE_ARABIC.has(arabicWords.join(' '))) return 0

  let score = 1
  if (arabicWords.length >= 2) score += 1
  if (arabicWords.length >= 4 && arabicWords.length <= 14) score += 3
  else if (arabicWords.length === 3 || arabicWords.length <= 20) score += 1
  if (englishWords.length >= 3 && englishWords.length <= 18) score += 2
  if (/[?؟!.]$/.test(card.english) || /[؟!.]$/.test(card.arabic)) score += 2
  if (REUSABLE_STRUCTURE.test(stripDiacritics(card.arabic))) score += 2
  if (/\.{2,}|…|[-–—]\s*$/.test(card.arabic) || /\.{2,}|…|[-–—]\s*$/.test(card.english)) score -= 2
  if (arabicWords.length > 24 || englishWords.length > 30) score -= 2
  return Math.max(0, score)
}

function nearDuplicate(first: MemoryCard, second: MemoryCard): boolean {
  const firstWords = new Set(normalizedWords(first.arabic))
  const secondWords = new Set(normalizedWords(second.arabic))
  if (!firstWords.size || !secondWords.size) return false
  const overlap = [...firstWords].filter((word) => secondWords.has(word)).length
  const union = new Set([...firstWords, ...secondWords]).size
  return overlap / union >= 0.82
}

/** Returns deterministic, high-value, de-duplicated cards in best-first order. */
export function rankMemoryCards(cards: readonly MemoryCard[]): MemoryCard[] {
  const exactFrequency = new Map<string, number>()
  for (const card of cards) {
    const key = normalizedCardKey(card)
    exactFrequency.set(key, (exactFrequency.get(key) ?? 0) + 1)
  }
  const ranked = cards
    .map((card) => {
      const learningScore = scoreMemoryCard(card)
      return {
        card,
        learningScore,
        score: learningScore + Math.min(2, (exactFrequency.get(normalizedCardKey(card)) ?? 1) - 1),
      }
    })
    .filter((candidate) => candidate.learningScore >= 4)
    .sort((a, b) => b.score - a.score || (a.card.timestamp ?? Number.MAX_SAFE_INTEGER) - (b.card.timestamp ?? Number.MAX_SAFE_INTEGER) || a.card.id.localeCompare(b.card.id))

  const selected: MemoryCard[] = []
  for (const { card } of ranked) {
    if (selected.some((existing) => normalizedCardKey(existing) === normalizedCardKey(card) || nearDuplicate(existing, card))) continue
    selected.push(card)
  }
  return selected
}

export function recommendMemoryCardCount(availableCards: number): 5 | 10 | 15 | 20 {
  if (availableCards >= 20) return 20
  if (availableCards >= 15) return 15
  if (availableCards >= 10) return 10
  return 5
}

function legacyBlocks(transcript: unknown): Array<Record<string, unknown>> {
  if (!transcript || typeof transcript !== 'object' || Array.isArray(transcript)) return []
  const blocks = (transcript as Record<string, unknown>).scriptBlocks
  return Array.isArray(blocks) ? blocks.filter((block): block is Record<string, unknown> => Boolean(block && typeof block === 'object')) : []
}

export function extractMemoryCards(episode: MemoryEpisodeInput): MemoryCard[] {
  const blocks = isNewTranscript(episode.transcript)
    ? normalizeNewTranscript(episode.transcript).scriptBlocks as unknown as Array<Record<string, unknown>>
    : legacyBlocks(episode.transcript)

  const candidates = blocks.flatMap((block, index) => {
    const words = Array.isArray(block.words) ? block.words as Array<Record<string, unknown>> : []
    const arabic = String(
      block.arabicDiacritic
      || block.arabicPlain
      || words.map((word) => word.arabic ?? word.plain ?? '').filter(Boolean).join(' ')
      || ''
    ).trim()
    const english = String(block.english || block.title || '').trim()
    if (!hasUsefulArabic(arabic) || !hasUsefulEnglish(english)) return []

    const rawTimestamp = block.timestamp
    const timestamp = rawTimestamp == null || !Number.isFinite(Number(rawTimestamp)) ? null : Number(rawTimestamp)
    return [{
      id: `${episode.id}:${index}`,
      showId: episode.showId,
      showSlug: episode.showSlug,
      showTitle: episode.showTitle,
      episodeId: episode.id,
      episodeSlug: episode.episodeSlug,
      episodeTitle: episode.episodeTitle,
      cover: episode.cover,
      timestamp,
      arabic,
      english,
    }]
  })
  return rankMemoryCards(candidates)
}

export function sampleMemoryCards(
  cards: readonly MemoryCard[],
  limit = 20,
  random: () => number = Math.random,
): MemoryCard[] {
  const unique = Array.from(new Map(cards.map((card) => [card.id, card])).values())
  for (let index = unique.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1))
    ;[unique[index], unique[randomIndex]] = [unique[randomIndex], unique[index]]
  }
  return unique.slice(0, Math.min(20, Math.max(0, limit)))
}

export function parseMemoryCardId(value: string): { episodeId: string; blockIndex: number } | null {
  const separator = value.lastIndexOf(':')
  if (separator <= 0) return null
  const episodeId = value.slice(0, separator)
  const blockIndex = Number(value.slice(separator + 1))
  if (!episodeId || !Number.isSafeInteger(blockIndex) || blockIndex < 0) return null
  return { episodeId, blockIndex }
}
