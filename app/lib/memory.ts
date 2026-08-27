import { isNewTranscript, normalizeNewTranscript } from '@/app/lib/cartoons'

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

function legacyBlocks(transcript: unknown): Array<Record<string, unknown>> {
  if (!transcript || typeof transcript !== 'object' || Array.isArray(transcript)) return []
  const blocks = (transcript as Record<string, unknown>).scriptBlocks
  return Array.isArray(blocks) ? blocks.filter((block): block is Record<string, unknown> => Boolean(block && typeof block === 'object')) : []
}

export function extractMemoryCards(episode: MemoryEpisodeInput): MemoryCard[] {
  const blocks = isNewTranscript(episode.transcript)
    ? normalizeNewTranscript(episode.transcript).scriptBlocks as unknown as Array<Record<string, unknown>>
    : legacyBlocks(episode.transcript)

  return blocks.flatMap((block, index) => {
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
}

export function sampleMemoryCards(
  cards: readonly MemoryCard[],
  limit = 80,
  random: () => number = Math.random,
): MemoryCard[] {
  const unique = Array.from(new Map(cards.map((card) => [card.id, card])).values())
  for (let index = unique.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1))
    ;[unique[index], unique[randomIndex]] = [unique[randomIndex], unique[index]]
  }
  return unique.slice(0, Math.max(0, limit))
}

export function parseMemoryCardId(value: string): { episodeId: string; blockIndex: number } | null {
  const separator = value.lastIndexOf(':')
  if (separator <= 0) return null
  const episodeId = value.slice(0, separator)
  const blockIndex = Number(value.slice(separator + 1))
  if (!episodeId || !Number.isSafeInteger(blockIndex) || blockIndex < 0) return null
  return { episodeId, blockIndex }
}
