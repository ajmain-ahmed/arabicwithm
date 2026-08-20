"use server"

import { unstable_cache } from "next/cache"
import { hasServiceClientConfig, serviceClient } from "@/app/lib/supabase"
import { extractChapterTeaser } from "@/app/lib/bookChapterTeaser"
import { stripDiacritics } from "@/app/lib/arabic"
import type { CartoonWordEntry } from "@/app/lib/cartoons"

export interface PublicBook {
  id: string
  slug: string
  title: string
  titleAr?: string
  description?: string
  cover?: string
  level: string
  category?: string
  chapterCount: number
}

export interface PublicChapter {
  id: string
  slug: string
  title: string
  chapterNumber: number
  teaser?: string
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
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    titleAr: row.title_ar ? String(row.title_ar) : undefined,
    description: row.description ? String(row.description) : undefined,
    cover: row.cover ? String(row.cover) : undefined,
    level: String(row.level ?? ""),
    category: row.category ? String(row.category) : undefined,
    chapterCount,
  }
}

export const fetchBooksForPublic = unstable_cache(
  async (): Promise<PublicBook[]> => {
    if (!hasServiceClientConfig()) return []

    const [{ data: books, error: booksError }, { data: chapters, error: chaptersError }] = await Promise.all([
      serviceClient.from("books").select("id, slug, title, title_ar, description, cover, level, category").order("title"),
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
  ["books", "public", "book-covers-v1"],
  { revalidate: 300, tags: ["books-public"] }
)

export const fetchBookBySlugPublic = unstable_cache(
  async (slug: string): Promise<PublicBook | null> => {
    if (!hasServiceClientConfig()) return null

    const { data: book, error } = await serviceClient
      .from("books")
      .select("id, slug, title, title_ar, description, cover, level, category")
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
  ["books", "public", "detail", "book-covers-v1"],
  { revalidate: 300, tags: ["books-public"] }
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

    return (data ?? []).map((chapter) => ({
      id: String(chapter.id),
      slug: String(chapter.slug),
      title: String(chapter.title),
      chapterNumber: Number(chapter.chapter_number),
      teaser: extractChapterTeaser(chapter.content),
    }))
  },
  ["books", "public", "chapters", "chapter-teasers-v1"],
  { revalidate: 300, tags: ["books-public"] }
)

export const fetchChapterForPublic = unstable_cache(
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
      content,
    }
  },
  ["books", "public", "chapter", "cartoon-tooltip-v1", "book-punctuation-v1"],
  { revalidate: 300, tags: ["books-public"] }
)

const EXPLORE_BLOCKS_PER_PAGE = 5

export const fetchBookPagesForExplorePublic = unstable_cache(
  async (): Promise<ExploreBookPage[]> => {
    if (!hasServiceClientConfig()) return []

    const [{ data: books, error: booksError }, { data: chapters, error: chaptersError }] = await Promise.all([
      serviceClient.from("books").select("id, slug, title, cover, level"),
      serviceClient.from("chapters").select("id, book_id, slug, title, chapter_number, content"),
    ])

    if (booksError) throw new Error(booksError.message)
    if (chaptersError) throw new Error(chaptersError.message)

    const booksById = new Map(
      ((books ?? []) as Record<string, unknown>[]).map((book) => [
        String(book.id),
        {
          slug: String(book.slug),
          title: String(book.title),
          cover: book.cover ? String(book.cover) : undefined,
          level: String(book.level ?? ""),
        },
      ])
    )

    return ((chapters ?? []) as Record<string, unknown>[]).flatMap((chapter) => {
      const book = booksById.get(String(chapter.book_id))
      if (!book) return []

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
  ["books", "public", "explore-pages-v1"],
  { revalidate: 300, tags: ["books-public"] }
)
