import { describe, expect, it } from 'vitest'
import { extractMemoryCards, parseMemoryCardId, sampleMemoryCards, type MemoryEpisodeInput } from './memory'

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
})
