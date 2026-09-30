import { describe, expect, it } from 'vitest'
import {
  extractMemoryCards,
  parseMemoryCardId,
  rankMemoryCards,
  recommendMemoryCardCount,
  sampleMemoryCards,
  scoreMemoryCard,
  type MemoryCard,
  type MemoryEpisodeInput,
} from './memory'

function card(id: string, arabic: string, english: string, timestamp = 0): MemoryCard {
  return {
    id,
    showId: 'show-1',
    showSlug: 'show',
    showTitle: 'Show',
    episodeId: 'episode-1',
    episodeSlug: 'episode',
    episodeTitle: 'Episode',
    timestamp,
    arabic,
    english,
  }
}

const episode: MemoryEpisodeInput = {
  id: 'episode-1',
  showId: 'show-1',
  showSlug: 'show',
  showTitle: 'Show',
  episodeSlug: 'episode',
  episodeTitle: 'Episode',
  transcript: [
    { timestamp: '00:04', translation: 'How are you today?', tokens: [{ arabic: 'كَيْفَ', lemma: 'كَيْفَ', transliteration: 'kayfa', root: null, pos: 'adverb', cefr: 'a1', entry_type: 'word' }, { arabic: 'حَالُكَ', lemma: 'حَال', transliteration: 'haluka', root: 'ح-و-ل', pos: 'noun', cefr: 'a1', entry_type: 'word' }] },
    { timestamp: '00:05', translation: 'Hi', tokens: [{ arabic: 'آه', lemma: 'آه', transliteration: 'ah', root: null, pos: 'interjection', cefr: 'a1', entry_type: 'word' }] },
  ],
}

describe('Memory transcript candidates', () => {
  it('derives useful bilingual cards and rejects tiny fragments', () => {
    const cards = extractMemoryCards(episode)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ id: 'episode-1:0', arabic: 'كَيْفَ حَالُكَ', english: 'How are you today?', timestamp: 4 })
  })

  it('samples without duplicates', () => {
    const cards = extractMemoryCards(episode)
    expect(sampleMemoryCards([...cards, ...cards], 10, () => 0.5)).toHaveLength(1)
  })

  it('parses stable card IDs from the final separator', () => {
    expect(parseMemoryCardId('episode:with:colons:12')).toEqual({ episodeId: 'episode:with:colons', blockIndex: 12 })
    expect(parseMemoryCardId('broken')).toBeNull()
  })

  it('ranks complete reusable sentences above weak fragments', () => {
    const complete = card('complete', 'أين يمكن أن نجد الطعام؟', 'Where can we find the food?', 5)
    const fragment = card('fragment', 'الطعام هنا…', 'The food here...', 2)

    expect(scoreMemoryCard(complete)).toBeGreaterThan(scoreMemoryCard(fragment))
    expect(rankMemoryCards([fragment, complete])[0]?.id).toBe('complete')
  })

  it('rejects isolated low-value words and removes exact or near duplicates', () => {
    const original = card('original', 'كيف يمكن أن أساعدك في هذا؟', 'How can I help you with this?', 1)
    const exactDuplicate = card('exact', 'كيف يمكن أن أساعدك في هذا؟', 'How can I help you with this?', 2)
    const nearDuplicate = card('near', 'كيف يمكن أن أساعدك اليوم في هذا؟', 'How can I help you with this today?', 3)
    const isolatedName = card('name', 'محمود', 'Mahmoud', 4)

    expect(rankMemoryCards([isolatedName, nearDuplicate, exactDuplicate, original])).toHaveLength(1)
  })

  it('does not promote repeated weak material into the eligible deck', () => {
    const filler = card('filler-1', 'مرحبا', 'Hello')
    const repeats = Array.from({ length: 4 }, (_, index) => ({ ...filler, id: `filler-${index}` }))

    expect(rankMemoryCards(repeats)).toEqual([])
  })

  it.each([
    [0, 5],
    [9, 5],
    [10, 10],
    [14, 10],
    [15, 15],
    [19, 15],
    [20, 20],
    [40, 20],
  ])('recommends a supported count for %i available cards', (available, expected) => {
    expect(recommendMemoryCardCount(available)).toBe(expected)
  })
})
