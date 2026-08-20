import { describe, it, expect } from 'vitest'
import {
  canonicalizeCartoonCategory,
  getEpisodeCoverPath,
  getYouTubeThumbnailUrl,
  getEpisodeVideoSources,
  getSocialVideoEmbedUrl,
  normalizeFacebookId,
  normalizeInstagramId,
  normalizeTikTokId,
  normalizeYouTubeId,
  getShowCoverPath,
  isNewTranscript,
  normalizeNewTranscript,
  type NewTranscript,
} from './cartoons'
import { stripDiacritics } from './arabic'

describe('isNewTranscript', () => {
  it('returns true for the block-based new format', () => {
    const transcript: NewTranscript = [
      {
        tokens: [
          {
            cefr: 'a1',
            pos: 'particle',
            root: null,
            lemma: 'هَلْ',
            arabic: 'هَلْ',
            entry_type: 'word',
            transliteration: 'hal',
          },
        ],
        timestamp: '0:00',
        translation: 'Is it?',
      },
    ]
    expect(isNewTranscript(transcript)).toBe(true)
  })

  it('returns false for a legacy transcript object', () => {
    expect(isNewTranscript({ scriptBlocks: [], vocabList: [], grammarPoints: [] })).toBe(false)
  })

  it('returns false for an empty array', () => {
    expect(isNewTranscript([])).toBe(false)
  })
})

describe('normalizeNewTranscript', () => {
  it('derives block-level Arabic by joining token Arabic values', () => {
    const transcript: NewTranscript = [
      {
        tokens: [
          {
            cefr: 'A1',
            pos: 'particle',
            root: null,
            lemma: 'هَلْ',
            arabic: 'هَلْ',
            entry_type: 'word',
            transliteration: 'hal',
          },
          {
            CEFR: 'A1',
            pos: 'verb',
            root: 'ك-و-ن',
            lemma: 'كَانَ',
            arabic: 'سَتَكُونِينَ',
            entry_type: 'word',
            transliteration: 'satakūnīna',
          },
          {
            cefr: 'A1',
            pos: 'phrase',
            root: 'خ-ي-ر',
            lemma: 'بِخَيْر',
            arabic: 'بِخَيْر',
            entry_type: 'word',
            transliteration: 'bi-khayr',
          },
        ],
        timestamp: '0:00',
        translation: 'Will you be okay?',
      },
      {
        tokens: [
          {
            cefr: 'A2',
            pos: 'phrase',
            root: null,
            lemma: 'أَعْتَقِدُ ذَلِكَ',
            arabic: 'أَعْتَقِدُ ذَلِكَ',
            entry_type: 'phrase',
            transliteration: "aʿtaqidu dhālika",
          },
        ],
        timestamp: '0:01',
        translation: 'I think so.',
      },
    ]

    const { scriptBlocks, vocabList } = normalizeNewTranscript(transcript)

    expect(scriptBlocks).toHaveLength(2)

    const first = scriptBlocks[0]
    expect(first.timestamp).toBe(0)
    expect(first.title).toBe('Will you be okay?')
    expect(first.arabicDiacritic).toBe('هَلْ سَتَكُونِينَ بِخَيْر')
    expect(first.arabicPlain).toBe('هل ستكونين بخير')
    expect(first.words).toHaveLength(3)
    expect(first.words[0].plain).toBe('هل')
    expect(first.words[0].pos).toBe('particle')
    expect(first.words[0].cefr).toBe('a1')
    expect(first.words[1].root).toBe('ك-و-ن')
    expect(first.words[1].cefr).toBe('a1')
    expect(first.words[2].plain).toBe('بخير')

    const second = scriptBlocks[1]
    expect(second.timestamp).toBe(1)
    expect(second.title).toBe('I think so.')
    expect(second.words[0].plain).toBe('أعتقد ذلك')

    // Vocab list deduplicates by lemma and lowercases cefr.
    expect(vocabList).toHaveLength(4)
    expect(vocabList.map((v) => v.arabic)).toContain('كَانَ')
    expect(vocabList.every((v) => !v.cefr || v.cefr === v.cefr.toLowerCase())).toBe(true)
  })

  it('falls back to stripping diacritics when token-level plain is missing', () => {
    const transcript: NewTranscript = [
      {
        tokens: [
          {
            pos: 'particle',
            root: null,
            lemma: 'هَلْ',
            arabic: 'هَلْ',
            entry_type: 'word',
            transliteration: 'hal',
            english: 'whether / is it?',
          },
        ],
        timestamp: '0:00',
        translation: 'Is it?',
      },
    ]

    const { scriptBlocks, vocabList } = normalizeNewTranscript(transcript)
    expect(scriptBlocks[0].arabicPlain).toBe(stripDiacritics('هَلْ'))
    expect(scriptBlocks[0].words[0].english).toBe('whether / is it?')
    expect(scriptBlocks[0].words[0].plain).toBe(stripDiacritics('هَلْ'))
    expect(scriptBlocks[0].words[0].pos).toBe('particle')
    expect(vocabList[0].english).toBe('whether / is it?')
  })

  it('parses 4-part timecode timestamps assuming 25 fps', () => {
    const transcript: NewTranscript = [
      {
        tokens: [{ cefr: 'A1', pos: 'particle', root: null, lemma: 'هَلْ', arabic: 'هَلْ', entry_type: 'word', transliteration: 'hal' }],
        timestamp: '00:00:03:16',
        translation: 'Block at 3.64s',
      },
    ]

    const { scriptBlocks } = normalizeNewTranscript(transcript)
    expect(scriptBlocks[0].timestamp).toBe(3 + 16 / 25)
  })

  it('falls back to null for unrecognised timestamp formats', () => {
    const transcript: NewTranscript = [
      {
        tokens: [{ cefr: 'A1', pos: 'particle', root: null, lemma: 'هَلْ', arabic: 'هَلْ', entry_type: 'word', transliteration: 'hal' }],
        timestamp: 'not-a-time',
        translation: 'No valid time',
      },
      {
        tokens: [{ cefr: 'A1', pos: 'particle', root: null, lemma: 'هَلْ', arabic: 'هَلْ', entry_type: 'word', transliteration: 'hal' }],
        timestamp: '00:00:00:00:00',
        translation: 'Too many parts',
      },
    ]

    const { scriptBlocks } = normalizeNewTranscript(transcript)
    expect(scriptBlocks[0].timestamp).toBeNull()
    expect(scriptBlocks[1].timestamp).toBeNull()
  })
})

describe('cover paths', () => {
  it('derives show cover from slug', () => {
    expect(getShowCoverPath('tmnt')).toBe('/covers/shows/tmnt.avif')
  })

  it('derives episode cover from show and episode slugs', () => {
  expect(getEpisodeCoverPath('cotp', 'cotp-1')).toBe('/covers/episodes/cotp/cotp-1.avif')
  })
})

describe('YouTube media helpers', () => {
  it('accepts IDs and extracts IDs from common YouTube links', () => {
    expect(normalizeYouTubeId(' PcstB8t_Dlc ')).toBe('PcstB8t_Dlc')
    expect(normalizeYouTubeId('https://youtu.be/PcstB8t_Dlc?t=3')).toBe('PcstB8t_Dlc')
    expect(normalizeYouTubeId('https://www.youtube.com/watch?v=PcstB8t_Dlc')).toBe('PcstB8t_Dlc')
    expect(normalizeYouTubeId('https://youtube.com/shorts/PcstB8t_Dlc')).toBe('PcstB8t_Dlc')
  })

  it('builds the matching YouTube thumbnail URL', () => {
    expect(getYouTubeThumbnailUrl('PcstB8t_Dlc')).toBe('https://i.ytimg.com/vi/PcstB8t_Dlc/hqdefault.jpg')
  })
})

describe('social video helpers', () => {
  it('extracts provider IDs from public video links', () => {
    expect(normalizeInstagramId('https://www.instagram.com/reel/C8abc_12-/')).toBe('C8abc_12-')
    expect(normalizeTikTokId('https://www.tiktok.com/@arabic/video/7391234567890123456')).toBe('7391234567890123456')
    expect(normalizeFacebookId('1234567890')).toBe('1234567890')
    expect(normalizeFacebookId('https://www.facebook.com/watch/?v=1234567890')).toContain('facebook.com/watch/')
  })

  it('orders all available inline sources and builds autoplay embed URLs', () => {
    const sources = getEpisodeVideoSources({
      instagramId: 'C8abc_12-',
      tiktokId: '7391234567890123456',
    })
    expect(sources.map((source) => source.provider)).toEqual(['instagram', 'tiktok'])
    expect(getSocialVideoEmbedUrl(sources[0], { autoplay: true })).toContain('autoplay=1')
    expect(getSocialVideoEmbedUrl(sources[1], { autoplay: true, muted: true })).toContain('muted=1')
  })
})

describe('canonicalizeCartoonCategory', () => {
  it('merges logical duplicates into the preferred public labels', () => {
    expect(canonicalizeCartoonCategory('Historical')).toBe('History')
    expect(canonicalizeCartoonCategory('history')).toBe('History')
    expect(canonicalizeCartoonCategory('Islamic History')).toBe('Islamic Heritage')
    expect(canonicalizeCartoonCategory('Islamic Heritage')).toBe('Islamic Heritage')
  })

  it('removes dialogue and capitalizes retained categories', () => {
    expect(canonicalizeCartoonCategory('dialogue')).toBeNull()
    expect(canonicalizeCartoonCategory(' comedy ')).toBe('Comedy')
    expect(canonicalizeCartoonCategory('biography')).toBe('Biography')
    expect(canonicalizeCartoonCategory('anime')).toBe('Anime')
  })
})
