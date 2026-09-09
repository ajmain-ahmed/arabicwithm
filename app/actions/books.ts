"use server"

import { fetchPremiumStatus } from "@/app/actions/premium"
import { canAccessBookChapter } from "@/app/lib/entitlements"
import { unstable_cache } from "next/cache"
import { hasServiceClientConfig, serviceClient } from "@/app/lib/supabase"
import { extractChapterTeaser } from "@/app/lib/bookChapterTeaser"
import { stripDiacritics } from "@/app/lib/arabic"
import type { CartoonWordEntry } from "@/app/lib/cartoons"
import { getBookCoverUrl } from "@/app/lib/storage"

export interface PublicBook {
  id: string
  slug: string
  title: string
  titleAr?: string
  description?: string
  cover?: string
  level: string
  category?: string
  tags: string[]
  chapterCount: number
  author: string
  premiumExempt: boolean
  freeChapterCount: number
}

export interface PublicChapter {
  id: string
  slug: string
  title: string
  chapterNumber: number
  teaser?: string
  blockCount: number
}

export interface PublicBookToken {
  arabic: string
  prefix?: string
  suffix?: string
  headword?: string
  english?: string
  transliteration?: string
  pos?: string
  cefr?: string
  entryType?: 'word' | 'phrase'
}

export interface PublicBookBlock {
  tokens: PublicBookToken[]
  translation: string
  punctuation?: string
  paragraph?: number
}

export interface PublicChapterWithContent extends PublicChapter {
  content: PublicBookBlock[]
}

export interface ExploreBookBlock {
  words: CartoonWordEntry[]
  translation: string
  punctuation?: string
}

export interface ExploreBookPage {
  id: string
  bookSlug: string
  bookTitle: string
  chapterSlug: string
  chapterTitle: string
  chapterNumber: number
  pageNumber: number
  cover?: string
  level: string
  blocks: ExploreBookBlock[]
}

function mapBook(row: Record<string, unknown>, chapterCount: number): PublicBook {
  const slug = String(row.slug)
  return {
    id: String(row.id),
    slug,
    title: String(row.title),
    titleAr: row.title_ar ? String(row.title_ar) : undefined,
    description: row.description ? String(row.description) : undefined,
    cover: getBookCoverUrl(slug),
    level: String(row.level ?? ""),
    category: row.category ? String(row.category) : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)).filter(Boolean) : [],
    chapterCount,
    author: typeof row.author === "string" && row.author.trim() ? row.author : "Author not listed",
    premiumExempt: row.premium_exempt === true,
    freeChapterCount: typeof row.free_chapter_count === "number" ? row.free_chapter_count : 5,
  }
}

function countReadableBlocks(value: unknown): number {
  if (!Array.isArray(value)) return 0
  return value.filter((rawBlock) => {
    if (!rawBlock || typeof rawBlock !== 'object' || Array.isArray(rawBlock)) return false
    const block = rawBlock as Record<string, unknown>
    const hasTranslation = typeof block.translation === 'string' && block.translation.trim().length > 0
    const hasToken = Array.isArray(block.tokens) && block.tokens.some((rawToken) => (
      rawToken && typeof rawToken === 'object' && !Array.isArray(rawToken) &&
      typeof (rawToken as Record<string, unknown>).arabic === 'string' &&
      String((rawToken as Record<string, unknown>).arabic).trim().length > 0
    ))
    return hasTranslation || hasToken
  }).length
}

export const fetchBooksForPublic = unstable_cache(
  async (): Promise<PublicBook[]> => {
    if (!hasServiceClientConfig()) return []

    const [{ data: books, error: booksError }, { data: chapters, error: chaptersError }] = await Promise.all([
      serviceClient.from("books").select("*").order("title"),
      serviceClient.from("chapters").select("book_id"),
    ])

    if (booksError) throw new Error(booksError.message)
    if (chaptersError) throw new Error(chaptersError.message)

    const chapterCounts = new Map<string, number>()
    for (const chapter of chapters ?? []) {
      const bookId = String(chapter.book_id)
      chapterCounts.set(bookId, (chapterCounts.get(bookId) ?? 0) + 1)
    }

    return ((books ?? []) as Record<string, unknown>[]).map((book) =>
      mapBook(book, chapterCounts.get(String(book.id)) ?? 0)
    )
  },
  ["books", "public", "book-catalogue-v3"],
  { revalidate: false, tags: ["books-public"] }
)

export const fetchBookBySlugPublic = unstable_cache(
  async (slug: string): Promise<PublicBook | null> => {
    if (!hasServiceClientConfig()) return null

    const { data: book, error } = await serviceClient
      .from("books")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error || !book) return null

    const { count, error: countError } = await serviceClient
      .from("chapters")
      .select("id", { count: "exact", head: true })
      .eq("book_id", book.id)

    if (countError) throw new Error(countError.message)
    return mapBook(book as Record<string, unknown>, count ?? 0)
  },
  ["books", "public", "detail", "book-catalogue-v3"],
  { revalidate: false, tags: ["books-public"] }
)

export const fetchChaptersForBookPublic = unstable_cache(
  async (bookId: string): Promise<PublicChapter[]> => {
    if (!hasServiceClientConfig()) return []

    const { data, error } = await serviceClient
      .from("chapters")
      .select("id, slug, title, chapter_number, content")
      .eq("book_id", bookId)
      .order("chapter_number")

    if (error) throw new Error(error.message)

    const book = (await fetchBooksForPublic()).find(book => book.id === bookId)
    return (data ?? []).map((chapter) => ({
      id: String(chapter.id),
      slug: String(chapter.slug),
      title: String(chapter.title),
      chapterNumber: Number(chapter.chapter_number),
      teaser: book && canAccessBookChapter(false, book, Number(chapter.chapter_number)) ? extractChapterTeaser(chapter.content) : undefined,
      blockCount: countReadableBlocks(chapter.content),
    }))
  },
  ["books", "public", "chapters", "chapter-teasers-v2"],
  { revalidate: false, tags: ["books-public"] }
)

const fetchChapterContent = unstable_cache(
  async (bookId: string, chapterSlug: string): Promise<PublicChapterWithContent | null> => {
    if (!hasServiceClientConfig()) return null

    const { data, error } = await serviceClient
      .from("chapters")
      .select("id, slug, title, chapter_number, content")
      .eq("book_id", bookId)
      .eq("slug", chapterSlug)
      .single()

    if (error || !data) return null

    const rawContent = Array.isArray(data.content) ? data.content : []
    const content: PublicBookBlock[] = rawContent.map((rawBlock) => {
      const block = rawBlock && typeof rawBlock === "object" && !Array.isArray(rawBlock)
        ? rawBlock as Record<string, unknown>
        : {}
      const rawTokens = Array.isArray(block.tokens) ? block.tokens : []

      return {
        translation: typeof block.translation === "string" ? block.translation : "",
        punctuation: typeof block.punctuation === "string" ? block.punctuation : undefined,
        paragraph: typeof block.paragraph === "number" && Number.isFinite(block.paragraph)
          ? Math.max(1, Math.trunc(block.paragraph))
          : undefined,
        tokens: rawTokens.map((rawToken) => {
          const token = rawToken && typeof rawToken === "object" && !Array.isArray(rawToken)
            ? rawToken as Record<string, unknown>
            : {}
          return {
            arabic: typeof token.arabic === "string" ? token.arabic : "",
            prefix: typeof token.prefix === "string" ? token.prefix : undefined,
            suffix: typeof token.suffix === "string" ? token.suffix : undefined,
            headword: typeof token.headword === "string" ? token.headword.trim() : undefined,
            english: typeof token.english === "string" ? token.english : undefined,
            transliteration: typeof token.transliteration === "string" ? token.transliteration : undefined,
            pos: typeof token.pos === "string" ? token.pos : undefined,
            cefr: typeof token.cefr === "string" ? token.cefr : undefined,
            entryType: (token.entry_type === "phrase" ? "phrase" : "word") as PublicBookToken["entryType"],
          }
        }).filter((token) => token.arabic),
      }
    }).filter((block) => block.tokens.length > 0 || block.translation)

    return {
      id: String(data.id),
      slug: String(data.slug),
      title: String(data.title),
      chapterNumber: Number(data.chapter_number),
      blockCount: content.length,
      content,
    }
  },
  ["books", "public", "chapter", "cartoon-tooltip-v1", "book-punctuation-v1"],
  { revalidate: false, tags: ["books-public"] }
)

export async function fetchChapterForPublic(bookId: string, chapterSlug: string): Promise<PublicChapterWithContent | null> {
  const book = (await fetchBooksForPublic()).find(book => book.id === bookId)
  const chapters = await fetchChaptersForBookPublic(bookId)
  const chapter = chapters.find(chapter => chapter.slug === chapterSlug)
  if (!book || !chapter) return null
  if (!canAccessBookChapter(false, book, chapter.chapterNumber) && !(await fetchPremiumStatus()).premium) return null
  return fetchChapterContent(bookId, chapterSlug)
}

const EXPLORE_BLOCKS_PER_PAGE = 5

export const fetchBookPagesForExplorePublic = unstable_cache(
  async (): Promise<ExploreBookPage[]> => {
    if (!hasServiceClientConfig()) return []

    const [{ data: books, error: booksError }, { data: chapters, error: chaptersError }] = await Promise.all([
      serviceClient.from("books").select("*"),
      serviceClient.from("chapters").select("id, book_id, slug, title, chapter_number, content"),
    ])

    if (booksError) throw new Error(booksError.message)
    if (chaptersError) throw new Error(chaptersError.message)

    const booksById = new Map(
      ((books ?? []) as Record<string, unknown>[]).map((book) => {
        const slug = String(book.slug)
        return [
          String(book.id),
          {
            premiumExempt: book.premium_exempt === true,
            freeChapterCount: Number(book.free_chapter_count ?? 5),
            chapterCount: (chapters ?? []).filter(ch => ch.book_id === book.id).length,
            slug,
            title: String(book.title),
            cover: getBookCoverUrl(slug),
            level: String(book.level ?? ""),
          },
        ]
      })
    )

    return ((chapters ?? []) as Record<string, unknown>[]).flatMap((chapter) => {
      const book = booksById.get(String(chapter.book_id))
      if (!book || !canAccessBookChapter(false, book, Number(chapter.chapter_number))) return []

      const rawBlocks = Array.isArray(chapter.content) ? chapter.content : []
      const blocks: ExploreBookBlock[] = rawBlocks.flatMap((rawBlock) => {
        const block = rawBlock && typeof rawBlock === "object" && !Array.isArray(rawBlock)
          ? rawBlock as Record<string, unknown>
          : null
        if (!block) return []

        const words: CartoonWordEntry[] = (Array.isArray(block.tokens) ? block.tokens : []).flatMap((rawToken) => {
          const token = rawToken && typeof rawToken === "object" && !Array.isArray(rawToken)
            ? rawToken as Record<string, unknown>
            : null
          if (!token) return []
          const core = typeof token.arabic === "string" ? token.arabic : ""
          if (!core) return []
          const arabic = `${typeof token.prefix === "string" ? token.prefix : ""}${core}${typeof token.suffix === "string" ? token.suffix : ""}`
          const lemma = typeof token.headword === "string" ? token.headword.trim() : ""
          return [{
            arabic,
            plain: stripDiacritics(arabic),
            transliteration: typeof token.transliteration === "string" ? token.transliteration : "",
            english: typeof token.english === "string" ? token.english : "",
            cefr: typeof token.cefr === "string" ? token.cefr.toLowerCase() : undefined,
            pos: typeof token.pos === "string" ? token.pos : undefined,
            lemma: lemma || core,
            entry_type: token.entry_type === "phrase" ? "phrase" : "word",
          }]
        })

        const translation = typeof block.translation === "string" ? block.translation : ""
        if (words.length === 0 && !translation) return []
        return [{
          words,
          translation,
          punctuation: typeof block.punctuation === "string" ? block.punctuation : undefined,
        }]
      })

      const pages: ExploreBookPage[] = []
      for (let start = 0; start < blocks.length; start += EXPLORE_BLOCKS_PER_PAGE) {
        const pageBlocks = blocks.slice(start, start + EXPLORE_BLOCKS_PER_PAGE)
        if (pageBlocks.length === 0) continue
        pages.push({
          id: `${String(chapter.id)}-${start}`,
          bookSlug: book.slug,
          bookTitle: book.title,
          chapterSlug: String(chapter.slug),
          chapterTitle: String(chapter.title),
          chapterNumber: Number(chapter.chapter_number),
          pageNumber: Math.floor(start / EXPLORE_BLOCKS_PER_PAGE) + 1,
          cover: book.cover,
          level: book.level,
          blocks: pageBlocks,
        })
      }
      return pages
    })
  },
  ["books", "public", "explore-pages-v2"],
  { revalidate: false, tags: ["books-public"] }
)
