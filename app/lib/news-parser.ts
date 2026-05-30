// app/lib/news-parser.ts
// Parser for graded news articles (A0–C2) from markdown files.
// Extracts frontmatter, bilingual paragraphs, word breakdowns with DB links.

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripDiacritics } from './arabic'

const ARTICLES_DIR = path.join(process.cwd(), 'content/news/articles')

const serviceUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!serviceUrl || !serviceKey) {
  throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY')
}
const serviceClient = createServiceClient(serviceUrl, serviceKey)

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface ParsedArticle {
  slug: string
  title: string
  titlePlain: string
  titleEnglish: string
  level: string
  date: string
  source: string
  author: string
  topic: string[]
  image: string
  paragraphs: Paragraph[]
  wordBreakdown: WordBreakdown[]
  dbLinkMap: Record<string, number>
}

export interface Paragraph {
  arabicDi: string
  plain: string
  english: string
}

export interface WordBreakdown {
  arabic: string
  plain: string
  root: string
  english: string
  pos: string
  dbLink: string | null
  dbWordId: number | null
}

/* ─────────────────────────────────────────────
   Directory scanning
───────────────────────────────────────────── */

export function getArticleLevels(): string[] {
  try {
    return fs
      .readdirSync(ARTICLES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  } catch {
    return []
  }
}

export function getArticlesForLevel(level: string): string[] {
  const levelDir = path.join(ARTICLES_DIR, level)
  try {
    return fs
      .readdirSync(levelDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
  } catch {
    return []
  }
}

export function getAllArticleSlugsGrouped(): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const level of getArticleLevels()) {
    result[level] = getArticlesForLevel(level)
  }
  return result
}

/* ─────────────────────────────────────────────
   Single article parser
───────────────────────────────────────────── */

export async function parseArticle(slug: string): Promise<ParsedArticle | null> {
  // Find the file across all level subdirectories
  let filePath: string | null = null
  let level = ''

  for (const lvl of getArticleLevels()) {
    const candidate = path.join(ARTICLES_DIR, lvl, `${slug}.md`)
    if (fs.existsSync(candidate)) {
      filePath = candidate
      level = lvl
      break
    }
  }

  if (!filePath) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data: frontmatter, content: body } = matter(raw)

  // ── Normalize frontmatter ──
  const title = (frontmatter.title as string) ?? slug
  const titlePlain = (frontmatter.title_plain as string) ?? ''
  const titleEnglish = (frontmatter.title_english as string) ?? ''
  const date = (frontmatter.date as string) ?? (frontmatter.date_published as string) ?? ''
  const source = (frontmatter.source as string) ?? ''
  const author = (frontmatter.author as string) ?? ''
  const topic = frontmatter.topic
    ? Array.isArray(frontmatter.topic)
      ? frontmatter.topic
      : [frontmatter.topic as string]
    : []
  const fmLevel = (frontmatter.level as string) ?? level

  // ── Extract image ──
  const image = extractImagePath(body)

  // ── Parse body sections ──
  const paragraphs = extractParagraphs(body)
  const wordBreakdown = extractWordBreakdown(body)

  // ── Resolve DB links ──
  const dbLinkMap = await resolveDbLinks(wordBreakdown)

  // Attach resolved IDs to breakdown rows
  const enrichedBreakdown = wordBreakdown.map((row) => {
    const dbWordId = row.dbLink ? dbLinkMap[row.dbLink] ?? null : null
    return { ...row, dbWordId }
  })

  return {
    slug,
    title,
    titlePlain,
    titleEnglish,
    level: fmLevel,
    date,
    source,
    author,
    topic,
    image,
    paragraphs,
    wordBreakdown: enrichedBreakdown,
    dbLinkMap,
  }
}

/* ─────────────────────────────────────────────
   Extract image path
───────────────────────────────────────────── */

function extractImagePath(body: string): string {
  // Look for markdown image syntax in the body
  const match = body.match(/!\[([^\]]*)\]\(([^)]+)\)/)
  if (!match) return ''
  let imgPath = match[2]
  // Strip 'public/' prefix since public assets are served from root
  if (imgPath.startsWith('public/')) {
    imgPath = imgPath.slice('public'.length)
  }
  return imgPath
}

/* ─────────────────────────────────────────────
   Extract paragraphs from article tables
───────────────────────────────────────────── */

function extractParagraphs(body: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const lines = body.split('\n')

  let inTable = false
  let headerCols: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect table header row (contains pipes, not separator line)
    if (line.startsWith('|') && line.includes('|') && !line.replace(/[\|\-\s]/g, '').length) {
      // This is a separator line like |---|---|---|
      inTable = true
      continue
    }

    if (line.startsWith('|')) {
      const cols = splitPipeRow(line)

      // If we haven't set header yet, this is the header
      if (!inTable) {
        headerCols = cols.map((c) => c.toLowerCase())
        // Check if this looks like a paragraph table (has English, no DB Link)
        const hasEnglish = headerCols.some((c) => c.includes('english'))
        const hasDbLink = headerCols.some((c) => c.includes('db link'))
        if (hasEnglish && !hasDbLink) {
          inTable = true
        }
        continue
      }

      // Data row in a paragraph table
      if (inTable) {
        const p = parseParagraphRow(cols, headerCols)
        if (p) paragraphs.push(p)
      }
      continue
    }

    // Non-table line resets state
    inTable = false
    headerCols = []
  }

  return paragraphs
}

function parseParagraphRow(cols: string[], headers: string[]): Paragraph | null {
  // Find column indices by fuzzy matching headers
  const arabicIdx = findColIndex(headers, ['arabic', 'diacritics', 'tashkeel'])
  const plainIdx = findColIndex(headers, ['plain'])
  const englishIdx = findColIndex(headers, ['english'])

  if (arabicIdx === -1 || englishIdx === -1) return null

  const arabicDi = (cols[arabicIdx] ?? '').trim()
  const plain = plainIdx >= 0 ? (cols[plainIdx] ?? '').trim() : stripDiacritics(arabicDi)
  const english = (cols[englishIdx] ?? '').trim()

  if (!arabicDi || !english) return null

  return { arabicDi, plain, english }
}

/* ─────────────────────────────────────────────
   Extract word breakdown from tables
───────────────────────────────────────────── */

function extractWordBreakdown(body: string): WordBreakdown[] {
  const words: WordBreakdown[] = []
  const lines = body.split('\n')

  let inTable = false
  let headerCols: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('|') && line.includes('|') && !line.replace(/[\|\-\s]/g, '').length) {
      inTable = true
      continue
    }

    if (line.startsWith('|')) {
      const cols = splitPipeRow(line)

      if (!inTable) {
        headerCols = cols.map((c) => c.toLowerCase())
        const hasDbLink = headerCols.some((c) => c.includes('db link'))
        if (hasDbLink) {
          inTable = true
        }
        continue
      }

      if (inTable) {
        const w = parseWordBreakdownRow(cols, headerCols)
        if (w) words.push(w)
      }
      continue
    }

    inTable = false
    headerCols = []
  }

  return words
}

function parseWordBreakdownRow(cols: string[], headers: string[]): WordBreakdown | null {
  // Find column indices
  const arabicIdx = findColIndex(headers, ['arabic word', 'arabic'])
  const plainIdx = findColIndex(headers, ['plain arabic', 'plain'])
  const rootIdx = findColIndex(headers, ['root'])
  const englishIdx = findColIndex(headers, ['english'])
  const posIdx = findColIndex(headers, ['part of speech', 'type', 'pos'])
  // DB Link: use the LAST occurrence if there are multiple
  const dbLinkIdx = findLastColIndex(headers, ['db link'])

  if (arabicIdx === -1 || englishIdx === -1) return null

  const arabic = (cols[arabicIdx] ?? '').trim()
  const plain = plainIdx >= 0 ? (cols[plainIdx] ?? '').trim() : stripDiacritics(arabic)
  const root = rootIdx >= 0 ? (cols[rootIdx] ?? '').trim() : ''
  const english = (cols[englishIdx] ?? '').trim()
  const pos = posIdx >= 0 ? (cols[posIdx] ?? '').trim() : ''
  const dbLinkRaw = dbLinkIdx >= 0 ? (cols[dbLinkIdx] ?? '').trim() : ''
  const dbLink = dbLinkRaw && dbLinkRaw !== '—' ? dbLinkRaw : null

  if (!arabic || !english) return null

  return { arabic, plain, root, english, pos, dbLink, dbWordId: null }
}

/* ─────────────────────────────────────────────
   DB Link resolution (one Supabase query)
───────────────────────────────────────────── */

async function resolveDbLinks(words: WordBreakdown[]): Promise<Record<string, number>> {
  const dbLinkMap: Record<string, number> = {}

  // Collect unique DB link Arabic words (strip level suffix)
  const dbWords = new Set<string>()
  for (const w of words) {
    if (!w.dbLink) continue
    const stripped = stripDbLinkLevel(w.dbLink)
    if (stripped) dbWords.add(stripped)
  }

  if (dbWords.size === 0) return dbLinkMap

  const wordArray = Array.from(dbWords)

  try {
    const { data, error } = await serviceClient
      .from('vocabulary')
      .select('word_id, word_ar, word_di')
      .or(wordArray.map((w) => `word_ar.eq.${w},word_di.eq.${w}`).join(','))

    if (error) {
      console.error('[resolveDbLinks] query error:', error.message)
      return dbLinkMap
    }

    if (!data) return dbLinkMap

    // Build lookup by both word_ar and word_di
    const byWordAr = new Map<string, number>()
    const byWordDi = new Map<string, number>()
    for (const row of data as Record<string, unknown>[]) {
      const id = row.word_id as number
      const ar = (row.word_ar as string) ?? ''
      const di = (row.word_di as string) ?? ''
      if (ar) byWordAr.set(ar, id)
      if (di) byWordDi.set(di, id)
    }

    // Map each original dbLink to its word_id
    for (const w of words) {
      if (!w.dbLink) continue
      const stripped = stripDbLinkLevel(w.dbLink)
      if (!stripped) continue
      const id = byWordDi.get(stripped) ?? byWordAr.get(stripped) ?? null
      if (id !== null) {
        dbLinkMap[w.dbLink] = id
      }
    }
  } catch (e) {
    console.error('[resolveDbLinks] failed:', e)
  }

  return dbLinkMap
}

function stripDbLinkLevel(dbLink: string): string {
  // "هَٰذَا (A0)" → "هَٰذَا"
  // Also handle extra whitespace like "هَٰذَا  (A0)"
  const match = dbLink.match(/^(.+?)\s*\([A-Z]\d?\+?\)\s*$/)
  return match ? match[1].trim() : dbLink.trim()
}

/* ─────────────────────────────────────────────
   Table parsing helpers
───────────────────────────────────────────── */

function splitPipeRow(line: string): string[] {
  // Split on | but preserve content inside pipes
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return trimmed.split('|').map((c) => c.trim())
  }
  // Remove leading/trailing pipes, then split
  const inner = trimmed.slice(1, -1)
  return inner.split('|').map((c) => c.trim())
}

function findColIndex(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    for (const kw of keywords) {
      if (h.includes(kw)) return i
    }
  }
  return -1
}

function findLastColIndex(headers: string[], keywords: string[]): number {
  let idx = -1
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    for (const kw of keywords) {
      if (h.includes(kw)) idx = i
    }
  }
  return idx
}
