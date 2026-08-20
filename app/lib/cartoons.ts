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
  tags?: string[]
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
  instagramId?: string
  tiktokId?: string
  facebookId?: string
  cover?: string
}

export type VideoProvider = 'youtube' | 'instagram' | 'tiktok' | 'facebook'

export interface EpisodeVideoSource {
  provider: VideoProvider
  id: string
  label: string
}

export interface ExploreTranscriptLine {
  timestamp: number | null
  arabic: string
  arabicPlain: string
  translation: string
  words: CartoonWordEntry[]
}

export interface ExploreEpisode extends EpisodeMeta {
  showSlug: string
  showTitle: string
  transcriptLines: ExploreTranscriptLine[]
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

export function normalizeYouTubeId(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^[A-Za-z0-9_-]{6,}$/.test(trimmed)) return trimmed

  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
    if (hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0]
    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      const queryId = url.searchParams.get('v')?.trim()
      if (queryId) return queryId
      const parts = url.pathname.split('/').filter(Boolean)
      if (['shorts', 'embed', 'live'].includes(parts[0]) && parts[1]) return parts[1]
    }
  } catch {
    // Keep supporting legacy IDs that do not look like URLs.
  }

  return trimmed
}

export function getYouTubeThumbnailUrl(videoId?: string | null): string | undefined {
  const normalized = normalizeYouTubeId(videoId)
  return normalized ? `https://i.ytimg.com/vi/${encodeURIComponent(normalized)}/hqdefault.jpg` : undefined
}

export function normalizeInstagramId(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const typeIndex = parts.findIndex((part) => ['reel', 'reels', 'p', 'tv'].includes(part.toLowerCase()))
      if (typeIndex >= 0 && parts[typeIndex + 1]) return parts[typeIndex + 1]
    }
  } catch {
    // Raw shortcode; handled below.
  }

  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : undefined
}

export function normalizeTikTokId(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^\d+$/.test(trimmed)) return trimmed

  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const videoIndex = parts.findIndex((part) => part.toLowerCase() === 'video')
      const id = videoIndex >= 0 ? parts[videoIndex + 1] : undefined
      if (id && /^\d+$/.test(id)) return id
    }
  } catch {
    // Invalid URL; return undefined below.
  }

  return undefined
}

export function normalizeFacebookId(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^\d+$/.test(trimmed)) return trimmed

  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
    if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com') || hostname === 'fb.watch') {
      return url.toString()
    }
  } catch {
    // Invalid URL; return undefined below.
  }

  return undefined
}

export function getEpisodeVideoSources(episode: Pick<EpisodeMeta, 'youtubeId' | 'instagramId' | 'tiktokId' | 'facebookId'>): EpisodeVideoSource[] {
  const sources: EpisodeVideoSource[] = []
  const youtubeId = normalizeYouTubeId(episode.youtubeId)
  const instagramId = normalizeInstagramId(episode.instagramId)
  const tiktokId = normalizeTikTokId(episode.tiktokId)
  const facebookId = normalizeFacebookId(episode.facebookId)

  if (youtubeId) sources.push({ provider: 'youtube', id: youtubeId, label: 'YouTube' })
  if (instagramId) sources.push({ provider: 'instagram', id: instagramId, label: 'Instagram' })
  if (tiktokId) sources.push({ provider: 'tiktok', id: tiktokId, label: 'TikTok' })
  if (facebookId) sources.push({ provider: 'facebook', id: facebookId, label: 'Facebook' })
  return sources
}

export function getSocialVideoEmbedUrl(
  source: EpisodeVideoSource,
  options: { autoplay?: boolean; muted?: boolean } = {}
): string | undefined {
  const autoplay = options.autoplay ? '1' : '0'
  const muted = options.muted ? '1' : '0'

  if (source.provider === 'instagram') {
    return `https://www.instagram.com/reel/${encodeURIComponent(source.id)}/embed/?autoplay=${autoplay}`
  }
  if (source.provider === 'tiktok') {
    return `https://www.tiktok.com/player/v1/${encodeURIComponent(source.id)}?autoplay=${autoplay}&loop=1&muted=${muted}&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1`
  }
  if (source.provider === 'facebook') {
    const href = /^\d+$/.test(source.id)
      ? `https://www.facebook.com/watch/?v=${source.id}`
      : source.id
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false&autoplay=${options.autoplay ? 'true' : 'false'}&mute=${options.muted ? 'true' : 'false'}`
  }
  return undefined
}

const CARTOON_CATEGORY_ALIASES: Record<string, string | null> = {
  dialogue: null,
  historical: 'History',
  history: 'History',
  'islamic history': 'Islamic Heritage',
  'islamic heritage': 'Islamic Heritage',
  'everyday arabic': 'Everyday Arabic',
}

export function canonicalizeCartoonCategory(value?: string | null): string | null {
  const trimmed = value?.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null

  const key = trimmed.toLowerCase()
  if (Object.prototype.hasOwnProperty.call(CARTOON_CATEGORY_ALIASES, key)) {
    return CARTOON_CATEGORY_ALIASES[key]
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
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
