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
  vocabMap: Record<string, VocabEntry[]>     // ← array: multiple entries per bare key
  diacritizedMap: Record<string, VocabEntry> // ← NEW: exact word_di lookup
  diacritizedIndex: Record<string, string>   // ← NEW: bare → diacritized form from script
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
function extractArabicTokens(content: string): { bare: string; diacritized: string }[] {
  const seen = new Map<string, string>() // bare → first diacritized occurrence
  const matches = content.match(/[\u0600-\u06FF]+/g) || []
  for (const word of matches) {
    const bare = stripDiacritics(word)
    if (bare.length > 1 && !seen.has(bare)) {
      seen.set(bare, word) // store the first diacritized form we see
    }
  }
  return Array.from(seen.entries()).map(([bare, diacritized]) => ({ bare, diacritized }))
}

// ── Single episode with full content ──────────────────────────────────────────
export async function getEpisode(show: string, episode: string): Promise<EpisodeFull | null> {
  const filePath = path.join(CONTENT_DIR, show, `${episode}.md`)
  if (!isPathContained(filePath, CONTENT_DIR) || !fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)

  const tokenPairs = extractArabicTokens(content)

  // ── Expanded token set for DB query ──────────────────────────────────────────
  // We must generate ALL possible stripped forms because the DB stores base
  // forms (e.g. "كتاب") but scripts contain cliticized forms (e.g. "كتابهم").
  // The client strips proclitics/enclitics aggressively, so we must match
  // that here to ensure every base form is fetched.

  const PROCLITICS = [
    'ال', 'و', 'ف', 'ب', 'ل', 'ك', 'س', 'أ', 'سأ',
    'وب', 'فب', 'ول', 'فل', 'وبال', 'فبال', 'ولل', 'فلل',
    'بال', 'فال', 'وال', 'لل', 'كال', 'وس', 'فس',
  ]

  const ENCLITICS = [
    'ك', 'ه', 'ها', 'هم', 'هن', 'نا', 'ي', 'ن',
    'كما', 'هما', 'تا', 'تما', 'ان', 'ين', 'ون',
    'ات', 'تك', 'ته', 'تها', 'تهم', 'تهن', 'تنا', 'تي', 'تن',
  ]

  function getAllStrippedForms(word: string): string[] {
    const forms = new Set<string>()
    forms.add(word)

    // Ta marbuta ↔ heh alternation
    if (word.endsWith('ة')) {
      forms.add(word.slice(0, -1) + 'ه')
    } else if (word.endsWith('ه')) {
      forms.add(word.slice(0, -1) + 'ة')
    }

    // Alif normalization (أ/إ/آ/ٱ → ا)
    const alifNorm = word.replace(/[أإآٱ]/g, 'ا')
    if (alifNorm !== word) {
      forms.add(alifNorm)
    }

    // Single proclitic
    for (const p of PROCLITICS) {
      if (word.startsWith(p) && word.length - p.length >= 3) {
        forms.add(word.slice(p.length))
      }
    }

    // Single enclitic
    for (const e of ENCLITICS) {
      if (word.endsWith(e) && word.length - e.length >= 3) {
        forms.add(word.slice(0, -e.length))
      }
    }

    // Proclitic + enclitic combined
    for (const p of PROCLITICS) {
      for (const e of ENCLITICS) {
        if (
          word.startsWith(p) &&
          word.endsWith(e) &&
          word.length - p.length - e.length >= 3
        ) {
          forms.add(word.slice(p.length, -e.length))
        }
      }
    }

    return Array.from(forms)
  }

  const expandedTokens = new Set<string>()
  const diacritizedIndex: Record<string, string> = {}

  for (const { bare, diacritized } of tokenPairs) {
    expandedTokens.add(bare)
    diacritizedIndex[bare] = diacritized
    for (const form of getAllStrippedForms(bare)) {
      if (form.length > 1) {
        expandedTokens.add(form)
      }
    }
  }
  const tokenArray = Array.from(expandedTokens)
  // ── end expanded token set ───────────────────────────────────────────────────

  let vocabMap: Record<string, VocabEntry[]> = {}
  let diacritizedMap: Record<string, VocabEntry> = {}
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
          const formsJson = parseJsonb(row.forms) ?? []
          const pos = formsJson[0]?.type ?? ''

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

          // Helper to push entry into vocabMap array (deduped by word_id)
          const pushEntry = (key: string) => {
            if (!vocabMap[key]) vocabMap[key] = []
            if (!vocabMap[key].some((e: VocabEntry) => e.id === entry.id)) {
              vocabMap[key].push(entry)
            }
          }

          pushEntry(row.word_ar)
          diacritizedMap[row.word_di] = entry  // ← exact diacritized lookup

          const bareKey = stripDiacritics(row.word_ar)
          if (bareKey && bareKey !== row.word_ar) pushEntry(bareKey)

          const alKey = 'ال' + bareKey
          if (alKey !== row.word_ar && alKey !== bareKey) pushEntry(alKey)

          // Ta marbuta cross-key
          if (bareKey.endsWith('ة')) {
            const hehVariant = bareKey.slice(0, -1) + 'ه'
            if (hehVariant !== bareKey) pushEntry(hehVariant)
          } else if (bareKey.endsWith('ه')) {
            const taVariant = bareKey.slice(0, -1) + 'ة'
            if (taVariant !== bareKey) pushEntry(taVariant)
          }

          // Alif-normalized key
          const alifNormKey = bareKey.replace(/[أإآٱ]/g, 'ا')
          if (alifNormKey !== bareKey && alifNormKey !== row.word_ar) {
            pushEntry(alifNormKey)
          }

          const normKey = normalizeArabicToken(row.word_ar)
          if (normKey && normKey !== row.word_ar && normKey !== bareKey && normKey !== alKey) {
            pushEntry(normKey)
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
    diacritizedMap,
    diacritizedIndex,
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
