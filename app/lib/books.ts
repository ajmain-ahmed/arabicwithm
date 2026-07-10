// app/lib/books.ts

import fs from 'fs'
import path from 'path'
import { isPathContained } from './fs'

const CONTENT_DIR = path.join(process.cwd(), 'content/books')

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface BookMeta {
  slug: string
  title: string
  titleAr?: string
  subtitleAr?: string
  author?: string
  description?: string
  cover: string
  level: string
  order?: number
  category?: string
  genre?: string
  readingLength?: string
  estimatedReadingTime?: number
  languageStyle?: string[]
  audioAvailable?: boolean
  partsCount?: number
  chaptersCount?: number
  vocabCount?: number
  setting?: string
  themes?: string[]
  tags?: string[]
  features?: Record<string, boolean>
}

export interface ChapterMeta {
  slug: string
  book: string
  chapterNumber: number
  title?: string
  titleAr?: string
}

export interface BookWordEntry {
  arabic: string        // diacritized
  plain: string         // stripped diacritics
  transliteration: string
  english: string
  pos: string
  cefr: string
  grammarNote?: string
  dbLink?: number | null
}

export interface BookSentence {
  sentenceId: number
  arabic: string        // diacritized
  transliteration: string
  english: string
  words: BookWordEntry[]
}

export interface BookPage {
  slug: string
  chapterNumber: number
  chapterTitleAr?: string
  chapterTitleTr?: string
  chapterTitleEn?: string
  sentences: BookSentence[]
}

export interface BookFull {
  meta: BookMeta
  pages: BookPage[]
  wordMap: Record<string, BookWordEntry>
  diacritizedMap: Record<string, BookWordEntry>
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function resolveCover(_bookDir: string, _slug: string, metaCover?: string): string {
  if (metaCover) {
    const publicPath = path.join(process.cwd(), 'public', metaCover)
    if (fs.existsSync(publicPath)) {
      return metaCover
    }
  }
  return ''
}

/* ── All books ──────────────────────────────────────────────────────────────── */
export function getAllBooks(): BookMeta[] {
  let bookDirs: string[]
  try {
    bookDirs = fs.readdirSync(CONTENT_DIR).filter((name) => {
      const fullPath = path.join(CONTENT_DIR, name)
      if (!isPathContained(fullPath, CONTENT_DIR)) return false
      return fs.statSync(fullPath).isDirectory()
    })
  } catch {
    return []
  }

  return bookDirs
    .map((slug) => {
      const bookDir = path.join(CONTENT_DIR, slug)
      const metaPath = path.join(bookDir, '_meta.json')
      if (!fs.existsSync(metaPath) || !isPathContained(metaPath, CONTENT_DIR)) return null

      let meta: Record<string, unknown>
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      } catch {
        return null
      }

      const chapters = getChaptersForBook(slug)
      const cover = resolveCover(bookDir, slug, meta.cover as string | undefined)

      return {
        slug: (meta.slug as string) ?? slug,
        title: (meta.title as string) ?? slug,
        titleAr: meta.titleAr as string | undefined,
        subtitleAr: meta.subtitleAr as string | undefined,
        author: meta.author as string | undefined,
        description: meta.description as string | undefined,
        cover,
        level: (meta.level as string) ?? 'A1-A2',
        order: (meta.order as number) ?? 99,
        category: meta.category as string | undefined,
        genre: meta.genre as string | undefined,
        readingLength: meta.readingLength as string | undefined,
        estimatedReadingTime: meta.estimatedReadingTime as number | undefined,
        languageStyle: meta.languageStyle as string[] | undefined,
        audioAvailable: meta.audioAvailable as boolean | undefined,
        partsCount: (meta.partsCount as number) ?? (meta.parts as number | undefined),
        chaptersCount: chapters.length > 0 ? chapters.length : ((meta.chaptersCount as number | undefined) ?? (meta.chapters as number | undefined)),
        vocabCount: meta.vocabCount as number | undefined,
        setting: meta.setting as string | undefined,
        themes: meta.themes as string[] | undefined,
        tags: meta.tags as string[] | undefined,
        features: meta.features as Record<string, boolean> | undefined,
      } as BookMeta
    })
    .filter(Boolean)
    .sort((a, b) => (a!.order ?? 99) - (b!.order ?? 99)) as BookMeta[]
}

/* ── Chapters for a book ────────────────────────────────────────────────────── */
export function getChaptersForBook(bookSlug: string): ChapterMeta[] {
  const found = findBookDirBySlug(bookSlug)
  if (!found) return []

  const { bookDir } = found
  const files = fs.readdirSync(bookDir).filter(
    (f) => f.endsWith('.json') && !f.startsWith('_')
  )

  return files
    .map((file) => {
      const slug = file.replace(/\.json$/, '')
      const raw = fs.readFileSync(path.join(bookDir, file), 'utf8')
      const data = JSON.parse(raw)

      return {
        slug,
        book: bookSlug,
        chapterNumber: data.chapter?.number ?? 0,
        title: data.chapter?.title?.english ?? slug,
        titleAr: data.chapter?.title?.arabic_di ?? undefined,
      } as ChapterMeta
    })
    .sort((a, b) => a.chapterNumber - b.chapterNumber)
}

/* ── Full book with pages and word maps ─────────────────────────────────────── */
function findBookDirBySlug(slug: string): { bookDir: string; meta: Record<string, unknown> } | null {
  let bookDirs: string[]
  try {
    bookDirs = fs.readdirSync(CONTENT_DIR).filter((name) => {
      const fullPath = path.join(CONTENT_DIR, name)
      if (!isPathContained(fullPath, CONTENT_DIR)) return false
      return fs.statSync(fullPath).isDirectory()
    })
  } catch {
    return null
  }

  for (const dirName of bookDirs) {
    const bookDir = path.join(CONTENT_DIR, dirName)
    const metaPath = path.join(bookDir, '_meta.json')
    if (!fs.existsSync(metaPath)) continue

    let meta: Record<string, unknown>
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    } catch {
      continue
    }

    const metaSlug = (meta.slug as string) || dirName
    if (metaSlug === slug || dirName === slug) {
      return { bookDir, meta }
    }
  }

  return null
}

export function getBook(slug: string): BookFull | null {
  const found = findBookDirBySlug(slug)
  if (!found) return null

  const { bookDir, meta } = found

  const metaObj: BookMeta = {
    slug: (meta.slug as string) ?? path.basename(bookDir),
    title: (meta.title as string) ?? path.basename(bookDir),
    titleAr: meta.titleAr as string | undefined,
    subtitleAr: meta.subtitleAr as string | undefined,
    author: meta.author as string | undefined,
    description: meta.description as string | undefined,
    cover: resolveCover(bookDir, (meta.slug as string) ?? path.basename(bookDir), meta.cover as string | undefined),
    level: (meta.level as string) ?? 'A1-A2',
    order: (meta.order as number) ?? 99,
    category: meta.category as string | undefined,
    genre: meta.genre as string | undefined,
    readingLength: meta.readingLength as string | undefined,
    estimatedReadingTime: meta.estimatedReadingTime as number | undefined,
    languageStyle: meta.languageStyle as string[] | undefined,
    audioAvailable: meta.audioAvailable as boolean | undefined,
    partsCount: (meta.partsCount as number) ?? (meta.parts as number | undefined),
    chaptersCount: (meta.chaptersCount as number | undefined) ?? (meta.chapters as number | undefined),
    vocabCount: meta.vocabCount as number | undefined,
    setting: meta.setting as string | undefined,
    themes: meta.themes as string[] | undefined,
    tags: meta.tags as string[] | undefined,
    features: meta.features as Record<string, boolean> | undefined,
  }

  // Read all page JSONs
  const files = fs.readdirSync(bookDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort()

  const pages: BookPage[] = []
  const wordMap: Record<string, BookWordEntry> = {}
  const diacritizedMap: Record<string, BookWordEntry> = {}

  for (const file of files) {
    const pageSlug = file.replace(/\.json$/, '')
    const raw = fs.readFileSync(path.join(bookDir, file), 'utf8')
    const data = JSON.parse(raw)

    const sentences: BookSentence[] = (data.sentences ?? []).map((s: Record<string, unknown>) => ({
      sentenceId: s.sentence_id as string | undefined,
      arabic: (s.arabic_di as string) ?? '',
      transliteration: (s.transliteration as string) ?? '',
      english: (s.english as string) ?? '',
      words: ((s.words ?? []) as Record<string, unknown>[]).map((w) => ({
        arabic: (w.arabic_di as string) ?? '',
        plain: (w.arabic_plain as string) ?? '',
        transliteration: (w.transliteration as string) ?? '',
        english: (w.english as string) ?? '',
        pos: (w.pos as string) ?? '',
        cefr: (w.cefr as string) ?? '',
        grammarNote: w.grammar_note as string | undefined,
        dbLink: (w.db_link as string) ?? null,
      })),
    }))

    // Build word maps from this page's sentences
    for (const sentence of sentences) {
      for (const w of sentence.words) {
        if (!w.arabic || !w.plain) continue

        // Map diacritized form
        if (!diacritizedMap[w.arabic]) {
          diacritizedMap[w.arabic] = w
        }

        // Map plain form
        if (!wordMap[w.plain]) {
          wordMap[w.plain] = w
        }

        // Tokenize plain form and map individual tokens
        const tokens = w.plain.split(/[^\u0600-\u06FF]+/).filter(Boolean)
        for (const token of tokens) {
          if (!wordMap[token]) {
            wordMap[token] = w
          }
        }
      }
    }

    pages.push({
      slug: pageSlug,
      chapterNumber: data.chapter?.number ?? 0,
      chapterTitleAr: data.chapter?.title?.arabic_di ?? undefined,
      chapterTitleTr: data.chapter?.title?.transliteration ?? undefined,
      chapterTitleEn: data.chapter?.title?.english ?? undefined,
      sentences,
    })
  }

  return {
    meta: metaObj,
    pages,
    wordMap,
    diacritizedMap,
  }
}

/* ── Single book by slug ────────────────────────────────────────────────────── */
export function getBookBySlug(slug: string): BookMeta | undefined {
  return getAllBooks().find((b) => b.slug === slug)
}

/* ── Static params helpers ──────────────────────────────────────────────────── */
export function getAllBookSlugs() {
  return getAllBooks().map((b) => ({ slug: b.slug }))
}

export function getAllChapterParams() {
  const books = getAllBooks()
  return books.flatMap((book) =>
    getChaptersForBook(book.slug).map((ch) => ({
      book: book.slug,
      chapter: ch.slug,
    }))
  )
}
