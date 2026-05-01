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

  // ── NEW: expand tokens to include normalized (proclitic-stripped) forms ──
  // e.g. "الوداع" → also add "وداع" so the DB query finds the canonical row
  const expandedTokens = new Set<string>()
  for (const t of tokens) {
    expandedTokens.add(t)
    const norm = normalizeArabicToken(t)
    if (norm && norm !== t && norm.length > 1) {
      expandedTokens.add(norm)
    }
  }
  const tokenArray = Array.from(expandedTokens)
  // ─────────────────────────────────────────────────────────────────────────

  let vocabMap: Record<string, VocabEntry> = {}
  if (tokenArray.length > 0) {
    try {
      // 1. Fetch matching vocabulary rows (join levels to get CEFR code)
      const { data: vocabData, error: vocabErr } = await serviceClient
        .from('vocabulary')
        .select('id, word, diacritics, transliteration, theme_id, levels!inner(code)')
        .in('word', tokenArray)

      if (vocabErr) {
        console.error(`[getEpisode] vocab query error:`, vocabErr.message)
        throw vocabErr
      }

      if (vocabData && vocabData.length > 0) {
        const vocabIds = vocabData.map((v) => v.id)

        // 2. Fetch definitions for matched words
        const { data: defData, error: defErr } = await serviceClient
          .from('definitions')
          .select('vocabulary_id, definition, pos, sort_order')
          .in('vocabulary_id', vocabIds)
          .order('sort_order')

        if (defErr) {
          console.error(`[getEpisode] definitions query error:`, defErr.message)
          throw defErr
        }

        const defMap = new Map<number, { definition: string; pos: string }>()
        for (const d of defData ?? []) {
          // Keep only the first definition per vocab word
          if (!defMap.has(d.vocabulary_id)) {
            defMap.set(d.vocabulary_id, { definition: d.definition, pos: d.pos })
          }
        }

        // 3. Fetch theme names for matched words
        const themeIds = [...new Set((vocabData as any[]).map((v) => v.theme_id).filter(Boolean))]
        const themeMap = new Map<number, string>()
        if (themeIds.length > 0) {
          const { data: themeData, error: themeErr } = await serviceClient
            .from('themes')
            .select('id, display_name')
            .in('id', themeIds)
          if (themeErr) {
            console.error(`[getEpisode] themes query error:`, themeErr.message)
          } else {
            for (const t of themeData ?? []) {
              themeMap.set(t.id, t.display_name)
            }
          }
        }

        // 4. Build vocabMap with multiple keys per entry
        for (const row of vocabData as any[]) {
          const entry: VocabEntry = {
            id: row.id,
            word: row.word,
            word_diacritic: row.diacritics ?? '',
            definition: defMap.get(row.id)?.definition ?? '',
            pos: defMap.get(row.id)?.pos ?? '',
            transliteration: row.transliteration ?? '',
            level: row.levels?.code ?? '',
            theme: themeMap.get(row.theme_id) ?? '',
          }

          // Key 1: exact DB word (e.g. "وداع")
          vocabMap[row.word] = entry

          // Key 2: canonical diacritic-free word
          const bareKey = stripDiacritics(row.word)
          if (bareKey && bareKey !== row.word) {
            vocabMap[bareKey] = entry
          }

          // Key 3: definite-article prepended (e.g. "الوداع")
          const alKey = 'ال' + bareKey
          if (alKey !== row.word && alKey !== bareKey) {
            vocabMap[alKey] = entry
          }

          // Key 4: normalized legacy fallback
          const normKey = normalizeArabicToken(row.word)
          if (normKey && normKey !== row.word && normKey !== bareKey && normKey !== alKey) {
            vocabMap[normKey] = entry
          }
        }

        // TEMPORARY DEBUG: verify keys are present
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