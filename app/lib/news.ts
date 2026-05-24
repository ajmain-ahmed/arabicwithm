// app/lib/news.ts

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { normalizeArabicToken, stripDiacritics } from './arabic'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const CONTENT_DIR = path.join(process.cwd(), 'content/news/articles')
const META_PATH = path.join(process.cwd(), 'content/news/_meta.json')

const serviceUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!serviceUrl || !serviceKey) {
  throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY')
}
const serviceClient = createServiceClient(serviceUrl, serviceKey)

function parseJsonb<T = unknown>(val: unknown): T | null {
  if (val == null) return null
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T } catch { return null }
  }
  return val as T
}

export interface NewsSource {
  id: string
  name: string
  logo?: string
}

export interface NewsTopic {
  id: string
  label: string
}

export interface ArticleMeta {
  slug: string
  title: string
  image: string
  source: string
  date: string
  cefr: string
  topics: string[]
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

export interface ArticleFull extends ArticleMeta {
  content: string
  vocabMap: Record<string, VocabEntry>
}

// ── Topics & Sources ──────────────────────────────────────────────────────────
export function getNewsMeta(): { sources: NewsSource[]; topics: string[] } {
  try {
    const raw = fs.readFileSync(META_PATH, 'utf8')
    const data = JSON.parse(raw)
    return {
      sources: data.sources ?? [],
      topics: data.topics ?? [],
    }
  } catch {
    return { sources: [], topics: [] }
  }
}

// ── All articles ──────────────────────────────────────────────────────────────
function isPathContained(targetPath: string, baseDir: string): boolean {
  const resolved = path.resolve(targetPath)
  const base = path.resolve(baseDir)
  return resolved === base || resolved.startsWith(base + path.sep)
}

export function getAllArticles(): ArticleMeta[] {
  let files: string[]
  try {
    files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8')
      const { data } = matter(raw)

      return {
        slug: data.slug ?? slug,
        title: data.title ?? slug,
        image: data.image ?? '',
        source: data.source ?? '',
        date: data.date ?? '',
        cefr: data.cefr ?? 'A1',
        topics: data.topics ?? [],
      } as ArticleMeta
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ── Extract unique Arabic tokens from content ─────────────────────────────────
function extractArabicTokens(content: string): string[] {
  const tokens = new Set<string>()
  const matches = content.match(/[\u0600-\u06FF]+/g) || []
  for (const word of matches) {
    const bare = stripDiacritics(word)
    if (bare.length > 1) tokens.add(bare)
  }
  return Array.from(tokens)
}

// ── Single article with vocab map ─────────────────────────────────────────────
export async function getArticle(slug: string): Promise<ArticleFull | null> {
  // Search all files to find one whose frontmatter slug OR filename matches
  let filePath: string | null = null
  let matchedData: Record<string, unknown> = {}

  try {
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'))
    for (const file of files) {
      const candidatePath = path.join(CONTENT_DIR, file)
      if (!isPathContained(candidatePath, CONTENT_DIR)) continue
      const raw = fs.readFileSync(candidatePath, 'utf8')
      const { data } = matter(raw)
      const fileSlug = file.replace(/\.md$/, '')
      const frontmatterSlug = (data.slug as string) ?? fileSlug
      if (frontmatterSlug === slug || fileSlug === slug) {
        filePath = candidatePath
        matchedData = data as Record<string, unknown>
        break
      }
    }
  } catch {
    return null
  }

  if (!filePath) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { content } = matter(raw)

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

  const vocabMap: Record<string, VocabEntry> = {}
  if (tokenArray.length > 0) {
    try {
      const { data: vocabData, error: vocabErr } = await serviceClient
        .from('vocabulary')
        .select('word_id, word_ar, word_di, word_tr, level, theme, definitions, forms')
        .in('word_ar', tokenArray)

      if (vocabErr) {
        console.error(`[getArticle] vocab query error:`, vocabErr.message)
        throw vocabErr
      }

      if (vocabData && vocabData.length > 0) {
        for (const row of vocabData as Record<string, unknown>[]) {
          const definitions = (parseJsonb(row.definitions) ?? []) as Array<Record<string, unknown>>
          const primary = definitions[0] ?? null
          const forms = (parseJsonb(row.forms) ?? []) as Array<Record<string, unknown>>
          const pos = (forms[0]?.type as string) ?? ''

          const entry: VocabEntry = {
            id: row.word_id as number,
            word: (row.word_ar as string) ?? '',
            word_diacritic: (row.word_di as string) ?? '',
            definition: (primary?.direct_english as string) ?? (primary?.english as string) ?? '',
            pos,
            transliteration: (row.word_tr as string) ?? '',
            level: (row.level as string) ?? '',
            theme: (row.theme as string) ?? '',
          }

          const wordAr = (row.word_ar as string) ?? ''
          vocabMap[wordAr] = entry

          const bareKey = stripDiacritics(wordAr)
          if (bareKey && bareKey !== wordAr) {
            vocabMap[bareKey] = entry
          }

          const alKey = 'ال' + bareKey
          if (alKey !== wordAr && alKey !== bareKey) {
            vocabMap[alKey] = entry
          }

          const normKey = normalizeArabicToken(wordAr)
          if (normKey && normKey !== wordAr && normKey !== bareKey && normKey !== alKey) {
            vocabMap[normKey] = entry
          }
        }
      }
    } catch (e) {
      console.error(`[getArticle] vocab lookup failed for ${slug}:`, e)
    }
  }

  return {
    slug: (matchedData.slug as string) ?? slug,
    title: (matchedData.title as string) ?? slug,
    image: (matchedData.image as string) ?? '',
    source: (matchedData.source as string) ?? '',
    date: (matchedData.date as string) ?? '',
    cefr: (matchedData.cefr as string) ?? 'A1',
    topics: (matchedData.topics as string[]) ?? [],
    content,
    vocabMap,
  }
}

// ── Static params helper ──────────────────────────────────────────────────────
export function getAllArticleSlugs() {
  return getAllArticles().map((a) => ({ slug: a.slug }))
}
