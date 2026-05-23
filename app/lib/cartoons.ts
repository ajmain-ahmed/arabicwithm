// app/lib/cartoons.ts

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { normalizeArabicToken, stripDiacritics } from './arabic'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const CONTENT_DIR = path.join(process.cwd(), 'content/cartoons')

const serviceUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!serviceUrl || !serviceKey) {
  throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY')
}
const serviceClient = createServiceClient(serviceUrl, serviceKey)

function parseJsonb<T = any>(val: any): T | null {
    if (val == null) return null
    if (typeof val === 'string') {
        try { return JSON.parse(val) as T } catch { return null }
    }
    return val as T
}

export interface ShowMeta {
  slug: string
  title: string
  titleAr?: string
  description?: string
  cover: string
  level: string
  episodeCount: number
  order?: number
}

export interface EpisodeMeta {
  slug: string
  title: string
  episode: number
  level: string
  tags: string[]
  description?: string
  youtubeId?: string
  youtubeShort?: boolean
}

export interface VocabEntry {
  id: number
  word: string
  word_diacritic: string
  definition: string
  pos: string
  transliteration: string
  level: string
  theme: string
}

export interface EpisodeFull extends EpisodeMeta {
  content: string
  show: string
  vocabMap: Record<string, VocabEntry>
}

// ── All shows ──────────────────────────────────────────────────────────────────
function isPathContained(targetPath: string, baseDir: string): boolean {
  const resolved = path.resolve(targetPath)
  const base = path.resolve(baseDir)
  return resolved === base || resolved.startsWith(base + path.sep)
}

export function getAllShows(): ShowMeta[] {
  let showDirs: string[]
  try {
    showDirs = fs.readdirSync(CONTENT_DIR).filter((name) => {
      const fullPath = path.join(CONTENT_DIR, name)
      if (!isPathContained(fullPath, CONTENT_DIR)) return false
      return fs.statSync(fullPath).isDirectory()
    })
  } catch {
    return []
  }

  return showDirs
    .map((slug) => {
      const metaPath = path.join(CONTENT_DIR, slug, '_meta.json')
      if (!fs.existsSync(metaPath) || !isPathContained(metaPath, CONTENT_DIR)) return null

      let meta: Record<string, unknown>
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      } catch {
        return null
      }
      const episodes = getEpisodesForShow(slug)

      return {
        slug,
        ...meta,
        episodeCount: episodes.length,
      } as ShowMeta
    })
    .filter(Boolean)
    .sort((a, b) => (a!.order ?? 99) - (b!.order ?? 99)) as ShowMeta[]
}

// ── All episodes for a show ────────────────────────────────────────────────────
export function getEpisodesForShow(show: string): EpisodeMeta[] {
  const showDir = path.join(CONTENT_DIR, show)
  if (!fs.existsSync(showDir) || !isPathContained(showDir, CONTENT_DIR)) return []

  const files = fs.readdirSync(showDir).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_')
  )

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(showDir, file), 'utf8')
      const { data } = matter(raw)

      return {
        slug,
        show,
        title: data.title ?? slug,
        youtubeId: data.youtubeId ?? '',
        youtubeShort: data.youtubeShort ?? false,
        level: data.level ?? 'A1',
        episode: data.episode ?? 0,
        tags: data.tags ?? [],
        description: data.description ?? undefined,
      } as EpisodeMeta
    })
    .sort((a, b) => a.episode - b.episode)
}

// ── Extract unique Arabic tokens from markdown content ─────────────────────────
function extractArabicTokens(content: string): string[] {
  const tokens = new Set<string>()
  const matches = content.match(/[\u0600-\u06FF]+/g) || []
  for (const word of matches) {
    const bare = stripDiacritics(word)
    if (bare.length > 1) tokens.add(bare)
  }
  return Array.from(tokens)
}

// ── Single episode with full content ──────────────────────────────────────────
export async function getEpisode(show: string, episode: string): Promise<EpisodeFull | null> {
  const filePath = path.join(CONTENT_DIR, show, `${episode}.md`)
  if (!isPathContained(filePath, CONTENT_DIR) || !fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)

  const tokens = extractArabicTokens(content)

  // Expand tokens to include normalized (proclitic-stripped) forms
  const expandedTokens = new Set<string>()
  for (const t of tokens) {
    expandedTokens.add(t)
    const norm = normalizeArabicToken(t)
    if (norm && norm !== t && norm.length > 1) {
      expandedTokens.add(norm)
    }
  }
  const tokenArray = Array.from(expandedTokens)

  let vocabMap: Record<string, VocabEntry> = {}
  if (tokenArray.length > 0) {
    try {
      // Fetch matching vocab rows from the new vocabulary table
      const { data: vocabData, error: vocabErr } = await serviceClient
        .from('vocabulary')
        .select('word_id, word_ar, word_di, word_tr, level, theme, definitions, forms')
        .in('word_ar', tokenArray)

      if (vocabErr) {
        console.error(`[getEpisode] vocab query error:`, vocabErr.message)
        throw vocabErr
      }

      if (vocabData && vocabData.length > 0) {
        // Build vocabMap with multiple keys per entry
        for (const row of vocabData as any[]) {
          const definitions = parseJsonb(row.definitions) ?? []
          const primary = definitions[0] ?? null
          const forms = parseJsonb(row.forms) ?? []
          const pos = forms[0]?.type ?? ''

          const entry: VocabEntry = {
            id: row.word_id,
            word: row.word_ar,
            word_diacritic: row.word_di ?? '',
            definition: primary?.direct_english ?? primary?.english ?? '',
            pos,
            transliteration: row.word_tr ?? '',
            level: row.level ?? '',
            theme: row.theme ?? '',
          }

          vocabMap[row.word_ar] = entry

          const bareKey = stripDiacritics(row.word_ar)
          if (bareKey && bareKey !== row.word_ar) {
            vocabMap[bareKey] = entry
          }

          const alKey = 'ال' + bareKey
          if (alKey !== row.word_ar && alKey !== bareKey) {
            vocabMap[alKey] = entry
          }

          const normKey = normalizeArabicToken(row.word_ar)
          if (normKey && normKey !== row.word_ar && normKey !== bareKey && normKey !== alKey) {
            vocabMap[normKey] = entry
          }
        }

        console.log('[getEpisode] vocabMap keys:', Object.keys(vocabMap))
      }
    } catch (e) {
      console.error(`[getEpisode] vocab lookup failed for ${show}/${episode}:`, e)
    }
  }

  return {
    slug: episode,
    show,
    title: data.title ?? episode,
    youtubeId: data.youtubeId ?? '',
    youtubeShort: data.youtubeShort ?? false,
    level: data.level ?? 'A1',
    episode: data.episode ?? 0,
    tags: data.tags ?? [],
    description: data.description ?? undefined,
    content,
    vocabMap,
  }
}

// ── Static params helpers (for generateStaticParams) ──────────────────────────
export function getAllShowSlugs() {
  return getAllShows().map((s) => ({ show: s.slug }))
}

export function getAllEpisodeParams() {
  const shows = getAllShows()
  return shows.flatMap((show) =>
    getEpisodesForShow(show.slug).map((ep) => ({
      show: show.slug,
      episode: ep.slug,
    }))
  )
}

// ── Single show by slug ───────────────────────────────────────────────────────
export function getShowBySlug(slug: string): ShowMeta | undefined {
  return getAllShows().find((s) => s.slug === slug)
}
