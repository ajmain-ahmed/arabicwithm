import { describe, it, expect } from 'vitest'
import { isNewTranscript, normalizeNewTranscript, type NewTranscript } from './cartoons'
import { stripDiacritics } from './arabic'

describe('isNewTranscript', () => {
  it('returns true for the block-based new format', () => {
    const transcript: NewTranscript = [
      {
        tokens: [
          {
            CEFR: 'A1',
            root: null,
            lemma: 'هَلْ',
            arabic: 'هَلْ',
            arabicPlain: 'هل',
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
            CEFR: 'A1',
            root: null,
            lemma: 'هَلْ',
            arabic: 'هَلْ',
            arabicPlain: 'هل',
            entry_type: 'word',
            transliteration: 'hal',
          },
          {
            CEFR: 'A1',
            root: 'ك-و-ن',
            lemma: 'كَانَ',
            arabic: 'سَتَكُونِينَ',
            arabicPlain: 'ستكونين',
            entry_type: 'word',
            transliteration: 'satakūnīna',
          },
          {
            CEFR: 'A1',
            root: 'خ-ي-ر',
            lemma: 'بِخَيْر',
            arabic: 'بِخَيْر',
            arabicPlain: 'بخير',
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
            CEFR: 'A2',
            root: null,
            lemma: 'أَعْتَقِدُ ذَلِكَ',
            arabic: 'أَعْتَقِدُ ذَلِكَ',
            arabicPlain: 'أعتقد ذلك',
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
    expect(first.words[1].root).toBe('ك-و-ن')
    expect(first.words[2].plain).toBe('بخير')

    const second = scriptBlocks[1]
    expect(second.timestamp).toBe(1)
    expect(second.title).toBe('I think so.')
    expect(second.words[0].plain).toBe('أعتقد ذلك')

    // Vocab list deduplicates by lemma.
    expect(vocabList).toHaveLength(4)
    expect(vocabList.map((v) => v.arabic)).toContain('كَانَ')
  })

  it('falls back to stripping diacritics when token-level plain is missing', () => {
    const transcript: NewTranscript = [
      {
        tokens: [
          {
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
    expect(vocabList[0].english).toBe('whether / is it?')
  })
})
