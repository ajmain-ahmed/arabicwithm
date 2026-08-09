// app/lib/cartoons.ts — shared types and transcript helpers for cartoon episodes.

import { stripDiacritics } from './arabic'

export interface ShowMeta {
  id: string
  slug: string
  title: string
  titleAr?: string
  description?: string
  cover: string
  level: string
  episodeCount: number
  category?: string
  duration?: string
  vocabCount?: number
}

export interface EpisodeMeta {
  id: string
  slug: string
  title: string
  level: string
  tags: string[]
  description?: string
  youtubeId?: string
  cover?: string
}

/* ── Cover image paths ── */

const SHOW_COVERS_DIR = '/covers/shows'
const EPISODE_COVERS_DIR = '/covers/episodes'
export const CARTOONS_BANNER_PATH = '/covers/cartoons-banner.avif'

export function getShowCoverPath(slug: string): string {
  return `${SHOW_COVERS_DIR}/${slug}.avif`
}

export function getEpisodeCoverPath(showSlug: string, episodeSlug: string): string {
  return `${EPISODE_COVERS_DIR}/${showSlug}/${episodeSlug}.avif`
}

/* ── New inline word entry (parsed from markdown tables) ── */
export interface CartoonWordEntry {
  arabic: string        // diacritized form from markdown
  plain: string         // stripped diacritics
  transliteration: string
  english: string
  cefr?: string
  pos?: string          // part of speech
  root?: string | null  // root letters (ف-ع-ل style)
  lemma?: string        // dictionary lemma (diacritized)
  entry_type?: 'word' | 'phrase'
}

export interface ScriptBlock {
  timestamp: number | null
  title: string
  arabicDiacritic: string
  arabicPlain: string
  english: string
  words: CartoonWordEntry[]
  notes: string[]
}

export interface VocabListItem {
  number: number
  arabic: string
  transliteration: string
  english: string
  cefr?: string
}

export interface GrammarPoint {
  number: number
  pattern: string
  explanation: string
  example: string
}

/* ── New block-based transcript format stored in Supabase ── */
export interface NewTranscriptToken {
  cefr?: string
  CEFR?: string
  pos: string
  root: string | null
  lemma: string
  arabic: string
  entry_type: 'word' | 'phrase'
  transliteration: string
  english?: string
}

export interface NewTranscriptBlock {
  tokens: NewTranscriptToken[]
  timestamp: string
  translation: string
}

export type NewTranscript = NewTranscriptBlock[]

export type TranscriptFormat = 'legacy' | 'new'

export interface EpisodeFull extends EpisodeMeta {
  id: string
  show: string
  show_id: string
  scriptBlocks: ScriptBlock[]
  vocabList: VocabListItem[]
  grammarPoints: GrammarPoint[]
  /* ── raw transcript from Supabase (preserve on inline edits) ── */
  transcript?: Record<string, unknown> | NewTranscript
  /* ── which transcript format this episode uses ── */
  transcriptFormat: TranscriptFormat
  /* ── lookup helpers built from script block word tables ── */
  wordMap: Record<string, CartoonWordEntry>   // plain Arabic → entry
  diacritizedMap: Record<string, CartoonWordEntry> // diacritized Arabic → entry
}

export function isNewTranscript(transcript: unknown): transcript is NewTranscript {
  if (!Array.isArray(transcript) || transcript.length === 0) return false
  const first = transcript[0]
  return (
    first != null &&
    typeof first === 'object' &&
    'tokens' in first &&
    Array.isArray(first.tokens) &&
    'timestamp' in first &&
    'translation' in first
  )
}

function parseNewTimestamp(timestamp: string): number | null {
  const parts = timestamp.split(':').map((p) => Number(p))
  if (!parts.every((n) => !isNaN(n))) return null

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 4) {
    // Treat the fourth part as a frame number and assume 25 fps.
    const [h, m, s, frames] = parts
    return h * 3600 + m * 60 + s + frames / 25
  }
  return null
}

/* ── Normalize the new block-based transcript into legacy-style script blocks ── */
export function normalizeNewTranscript(
  blocks: NewTranscript
): { scriptBlocks: ScriptBlock[]; vocabList: VocabListItem[] } {
  const scriptBlocks: ScriptBlock[] = []
  const seenVocab = new Map<string, VocabListItem>()
  let vocabNumber = 1

  for (const block of blocks) {
    const words: CartoonWordEntry[] = []

    const tokenPlains: string[] = []
    const tokenDiacritics: string[] = []

    for (const token of block.tokens) {
      const diacritic = token.arabic.trim()
      const plain = stripDiacritics(diacritic)
      tokenDiacritics.push(diacritic)
      tokenPlains.push(plain)

      // Build a lightweight vocab list keyed by lemma (dictionary form).
      const lemma = token.lemma?.trim() || diacritic
      const tokenCefr = (token.cefr ?? token.CEFR)?.trim().toLowerCase()
      if (!seenVocab.has(lemma)) {
        const vocabItem: VocabListItem = {
          number: vocabNumber++,
          arabic: lemma,
          transliteration: '', // new-format tokens carry surface-form transliterations
          english: token.english ?? '',
        }
        if (tokenCefr) vocabItem.cefr = tokenCefr
        seenVocab.set(lemma, vocabItem)
      }

      const wordEntry: CartoonWordEntry = {
        arabic: diacritic,
        plain,
        transliteration: token.transliteration,
        english: token.english ?? '',
        root: token.root ?? null,
        lemma: token.lemma?.trim() || diacritic,
        entry_type: token.entry_type,
        pos: token.pos?.trim() || 'unknown',
      }
      if (tokenCefr) wordEntry.cefr = tokenCefr
      words.push(wordEntry)
    }

    scriptBlocks.push({
      timestamp: parseNewTimestamp(block.timestamp),
      title: block.translation,
      arabicDiacritic: tokenDiacritics.join(' '),
      arabicPlain: tokenPlains.join(' '),
      english: '',
      words,
      notes: [],
    })
  }

  return { scriptBlocks, vocabList: Array.from(seenVocab.values()) }
}
