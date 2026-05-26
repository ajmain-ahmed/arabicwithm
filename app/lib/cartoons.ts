// app/lib/cartoons.ts

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { stripDiacritics } from './arabic'

const CONTENT_DIR = path.join(process.cwd(), 'content/cartoons')

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

/* ── New inline word entry (parsed from markdown tables) ── */
export interface CartoonWordEntry {
  arabic: string        // diacritized form from markdown
  plain: string         // stripped diacritics
  transliteration: string
  english: string
  cefr: string
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
  cefr: string
}

export interface GrammarPoint {
  number: number
  pattern: string
  explanation: string
  example: string
}

export interface EpisodeFull extends EpisodeMeta {
  show: string
  scriptBlocks: ScriptBlock[]
  vocabList: VocabListItem[]
  grammarPoints: GrammarPoint[]
  /* ── lookup helpers built from script block word tables ── */
  wordMap: Record<string, CartoonWordEntry>   // plain Arabic → entry
  diacritizedMap: Record<string, CartoonWordEntry> // diacritized Arabic → entry
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

/* ── Helpers ── */

function parseTimestampLine(line: string): { timestamp: number | null; title: string } {
  const m = line.match(/^###\s+(?:(\d+):)?(\d{1,2}):(\d{2})\s*[-–—]\s*(.+)$/)
  if (!m) return { timestamp: null, title: line.replace(/^###\s*/, '') }
  const h = parseInt(m[1] || '0', 10)
  const min = parseInt(m[2], 10)
  const sec = parseInt(m[3], 10)
  const title = m[4].trim()
  return { timestamp: h * 3600 + min * 60 + sec, title }
}

function parseTableRow(line: string): string[] {
  if (!line.startsWith('|')) return []
  return line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim())
    .filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ''))
}

function isTableDivider(line: string): boolean {
  return /^\|?\s*[-:]+\s*(\|\s*[-:]+\s*)*\|?\s*$/.test(line)
}

function parseMarkdownTable(lines: string[], startIdx: number): { rows: string[][]; nextIdx: number } {
  const rows: string[][] = []
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line.startsWith('|')) break
    if (isTableDivider(line)) { i++; continue }
    const cols = parseTableRow(line)
    if (cols.length > 0) rows.push(cols)
    i++
  }
  return { rows, nextIdx: i }
}

/* ── Single episode with full parsed content ─────────────────────────────────── */
export function getEpisode(show: string, episode: string): EpisodeFull | null {
  const filePath = path.join(CONTENT_DIR, show, `${episode}.md`)
  if (!isPathContained(filePath, CONTENT_DIR) || !fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)

  const lines = content.split('\n')

  const scriptBlocks: ScriptBlock[] = []
  const vocabList: VocabListItem[] = []
  const grammarPoints: GrammarPoint[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    // ── Script section ──
    if (line === '## Script') {
      i++
      while (i < lines.length) {
        const blockLine = lines[i].trim()
        if (blockLine.startsWith('## ')) break

        // Block header: ### 0:00 — Title
        if (blockLine.startsWith('### ')) {
          const { timestamp, title } = parseTimestampLine(blockLine)
          i++

          let arabicDiacritic = ''
          let arabicPlain = ''
          let english = ''
          const words: CartoonWordEntry[] = []
          const notes: string[] = []

          while (i < lines.length) {
            const l = lines[i]
            const trimmed = l.trim()

            if (trimmed.startsWith('## ')) break
            if (trimmed.startsWith('### ')) break
            if (trimmed === '---') { i++; continue }

            if (trimmed.startsWith('**Arabic:**')) {
              arabicDiacritic = trimmed.replace(/^\*\*Arabic:\*\*\s*/, '').trim()
              i++
              continue
            }

            if (trimmed.startsWith('**Plain:**')) {
              arabicPlain = trimmed.replace(/^\*\*Plain:\*\*\s*/, '').trim()
              i++
              continue
            }

            if (trimmed.startsWith('**Note:**')) {
              notes.push(trimmed.replace(/^\*\*Note:\*\*\s*/, '').trim())
              i++
              continue
            }

            if (trimmed.startsWith('|')) {
              // skip header/divider rows, then parse table
              if (isTableDivider(trimmed)) { i++; continue }
              const headerCols = parseTableRow(trimmed)
              // Detect if this is a word table (has "Arabic" header) or vocab/grammar table
              const isWordTable = headerCols.some((c) => c.toLowerCase().includes('arabic')) &&
                headerCols.some((c) => c.toLowerCase().includes('cefr'))

              if (isWordTable && headerCols.length >= 4) {
                i++
                const { rows, nextIdx } = parseMarkdownTable(lines, i)
                i = nextIdx
                for (const cols of rows) {
                  if (cols.length >= 4) {
                    const arabic = cols[0]
                    words.push({
                      arabic,
                      plain: stripDiacritics(arabic),
                      transliteration: cols[1],
                      english: cols[2],
                      cefr: cols[3],
                    })
                  }
                }
                continue
              }
              i++
              continue
            }

            i++
          }

          scriptBlocks.push({
            timestamp,
            title,
            arabicDiacritic,
            arabicPlain,
            english,
            words,
            notes,
          })
          continue
        }

        i++
      }
      continue
    }

    // ── Vocabulary List section ──
    if (line === '## Vocabulary List') {
      i++
      while (i < lines.length) {
        const l = lines[i].trim()
        if (l.startsWith('## ')) break
        if (isTableDivider(l)) { i++; continue }
        if (l.startsWith('|')) {
          const cols = parseTableRow(l)
          if (cols.length >= 5 && !isNaN(parseInt(cols[0], 10))) {
            vocabList.push({
              number: parseInt(cols[0], 10),
              arabic: cols[1],
              transliteration: cols[2],
              english: cols[3],
              cefr: cols[4],
            })
          }
        }
        i++
      }
      continue
    }

    // ── Grammar Points section ──
    if (line === '## Grammar Points') {
      i++
      while (i < lines.length) {
        const l = lines[i].trim()
        if (l.startsWith('## ')) break
        if (isTableDivider(l)) { i++; continue }
        if (l.startsWith('|')) {
          const cols = parseTableRow(l)
          if (cols.length >= 4 && !isNaN(parseInt(cols[0], 10))) {
            grammarPoints.push({
              number: parseInt(cols[0], 10),
              pattern: cols[1],
              explanation: cols[2],
              example: cols[3],
            })
          }
        }
        i++
      }
      continue
    }

    i++
  }

  // Build lookup maps from all script block word tables
  const wordMap: Record<string, CartoonWordEntry> = {}
  const diacritizedMap: Record<string, CartoonWordEntry> = {}

  for (const block of scriptBlocks) {
    for (const w of block.words) {
      // Map each individual token within the word entry so hovering
      // over any word in a phrase shows the full phrase entry.
      const tokens = w.plain.split(/[^\u0600-\u06FF]+/).filter(Boolean)
      for (const token of tokens) {
        if (!wordMap[token]) wordMap[token] = w
      }
      // Also map the full plain phrase
      if (!wordMap[w.plain]) wordMap[w.plain] = w
      // And the diacritized form
      if (!diacritizedMap[w.arabic]) diacritizedMap[w.arabic] = w
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
    scriptBlocks,
    vocabList,
    grammarPoints,
    wordMap,
    diacritizedMap,
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
