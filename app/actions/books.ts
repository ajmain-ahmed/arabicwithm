"use server"

import { getAuthenticatedUserId } from "@/app/actions/auth"
import { canAccessBookChapter } from "@/app/lib/entitlements"
import { unstable_cache } from "next/cache"
import { createHash } from "node:crypto"
import { hasServiceClientConfig, serviceClient } from "@/app/lib/supabase"
import { extractChapterTeaser } from "@/app/lib/bookChapterTeaser"
import { stripDiacritics } from "@/app/lib/arabic"
import { isGrammarLabel, type BookTokenGrammar } from '@/app/lib/bookTokenGrammar'
import type { CartoonWordEntry } from "@/app/lib/cartoons"
import { normalizeThumbnailCrop, type ThumbnailCrop } from "@/app/lib/thumbnailCrop"

/* Keep admin invalidation fast, while also picking up authoritative Supabase
   changes made outside this process instead of caching them indefinitely.
   Development gets a longer TTL so routine catalogue reads stay warm while
   editing unrelated code. */
const publicRevalidate = process.env.NODE_ENV === "development" ? 300 : 60

export interface PublicBook {
  id: string
  slug: string
  title: string
  titleAr?: string
  description?: string
  cover?: string
  coverCrop: ThumbnailCrop
  level: string
  category?: string
  tags: string[]
  chapterCount: number
  author: string
  readingTimeMinutes?: number
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

export interface PublicBookToken extends BookTokenGrammar {
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
  timestamp?: string
  paragraph_start?: boolean
  paragraph_end?: boolean
  paragraph_break_after?: boolean
}

export interface PublicChapterWithContent extends PublicChapter {
  content: PublicBookBlock[]
}

export interface ExploreBookBlock {
  words: CartoonWordEntry[]
  translation: string
  punctuation?: string
  paragraphNumber?: number
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
  const coverVersion = row.updated_at ?? row.created_at
  return {
    id: String(row.id),
    slug,
    title: String(row.title),
    titleAr: row.title_ar ? String(row.title_ar) : undefined,
    description: row.description ? String(row.description) : undefined,
    cover: `/api/covers/books/${row.id}${coverVersion ? `?v=${encodeURIComponent(String(coverVersion))}` : ''}`,
    coverCrop: normalizeThumbnailCrop(row.cover_crop),
    level: String(row.level ?? ""),
    category: row.category ? String(row.category) : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)).filter(Boolean) : [],
    chapterCount,
    author: typeof row.author === "string" && row.author.trim() ? row.author : "Author not listed",
    readingTimeMinutes: typeof row.reading_time_minutes === "number" && row.reading_time_minutes > 0
      ? Math.round(row.reading_time_minutes)
      : undefined,
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
  ["books", "public", "book-catalogue-storage-v6"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
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
  ["books", "public", "detail", "book-catalogue-storage-v6"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
)

type ChapterListExtras = Record<string, { teaser?: string; blockCount: number }>

/* ── Teasers and block counts are only surfaced for chapters a free
   visitor can open, so content is only ever pulled for the free
   window (bounded by freeChapterCount), never for the whole book. ── */
const fetchChapterListExtrasForBookPublic = unstable_cache(
  async (bookId: string): Promise<ChapterListExtras> => {
    const extras: ChapterListExtras = {}
    if (!hasServiceClientConfig()) return extras

    const book = (await fetchBooksForPublic()).find((book) => book.id === bookId)
    if (!book) return extras

    let query = serviceClient
      .from("chapters")
      .select("id, content")
      .eq("book_id", bookId)
    const wholeBookFree = book.premiumExempt || book.chapterCount <= book.freeChapterCount
    if (!wholeBookFree) query = query.lte("chapter_number", book.freeChapterCount)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    for (const chapter of data ?? []) {
      extras[String(chapter.id)] = {
        teaser: extractChapterTeaser(chapter.content),
        blockCount: countReadableBlocks(chapter.content),
      }
    }
    return extras
  },
  ["books", "public", "chapter-extras", "v1"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
)

export const fetchChaptersForBookPublic = unstable_cache(
  async (bookId: string): Promise<PublicChapter[]> => {
    if (!hasServiceClientConfig()) return []

    const { data, error } = await serviceClient
      .from("chapters")
      .select("id, slug, title, chapter_number")
      .eq("book_id", bookId)
      .order("chapter_number")

    if (error) throw new Error(error.message)


    return (data ?? []).map((chapter) => ({
      id: String(chapter.id),
      slug: String(chapter.slug),
      title: String(chapter.title),
      chapterNumber: Number(chapter.chapter_number),

      blockCount: 0,
    }))
  },
  ["books", "public", "chapters", "chapter-teasers-v3"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
)


export async function fetchChapterCardsForBookPublic(bookId: string): Promise<PublicChapter[]> {
  const chapters = await fetchChaptersForBookPublic(bookId)
  try {
    const extras = await fetchChapterListExtrasForBookPublic(bookId)
    return chapters.map(ch => ({...ch, ...extras[ch.id]}))
  } catch (error) {
    console.error('[chapter teasers] unavailable', error)
    return chapters
  }
}

export const fetchChapterNavigationForPublic = unstable_cache(async (): Promise<Record<string, PublicChapter[]>> => {
  if (!hasServiceClientConfig()) return {}
  const {data,error} = await serviceClient.from('chapters').select('id,book_id,slug,title,chapter_number').order('chapter_number')
  if(error) throw new Error(error.message)
  const result: Record<string, PublicChapter[]> = {}
  for(const row of data ?? []) (result[row.book_id] ??= []).push({id:row.id,slug:row.slug,title:row.title,chapterNumber:row.chapter_number,blockCount:0})
  return result
}, ['chapter-navigation-v1'], {revalidate:60,tags:['books-public']})

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
        timestamp: typeof block.timestamp === 'string' ? block.timestamp : undefined,
        paragraph_start: typeof block.paragraph_start === 'boolean' ? block.paragraph_start : undefined,
        paragraph_end: typeof block.paragraph_end === 'boolean' ? block.paragraph_end : undefined,
        paragraph_break_after: typeof block.paragraph_break_after === 'boolean' ? block.paragraph_break_after : undefined,
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
            /* Legacy rows store these as explicit nulls on every token; omitting
               the key keeps the reader payload (already ~150KB per chapter)
               that much lighter with no behavior change. */
            syntactic_role: isGrammarLabel(token.syntactic_role) ? token.syntactic_role : undefined,
            grammatical_case: isGrammarLabel(token.grammatical_case) ? token.grammatical_case : undefined,
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
  ["books", "public", "chapter", "cartoon-tooltip-v1", "book-punctuation-v1", "book-grammar-v1"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
)

export async function fetchChapterForPublic(bookId: string, chapterSlug: string): Promise<PublicChapterWithContent | null> {
  /* One query serves both the entitlement gate and the payload: chapter_number
     travels with the content, so there is no separate metadata round trip. */
  const chapter = await fetchChapterContent(bookId, chapterSlug)
  if (!chapter) return null
  if (!canAccessBookChapter(Boolean(await getAuthenticatedUserId()), chapter.chapterNumber)) return null
  return chapter
}

const EXPLORE_BLOCKS_PER_PAGE = 5

/* ── Metadata-only catalogue used to plan explore batches. Chapter
   content is only fetched per chapter, for batches that contain one
   of its pages. ── */
export interface ExploreBookChapterMeta {
  bookId?: string
  chapterId: string
  bookSlug: string
  bookTitle: string
  chapterSlug: string
  chapterTitle: string
  chapterNumber: number
  cover?: string
  level: string
}

export const fetchExploreBookChapterMetasForPublic = unstable_cache(
  async (): Promise<ExploreBookChapterMeta[]> => {
    if (!hasServiceClientConfig()) return []

    const [{ data: books, error: booksError }, { data: chapters, error: chaptersError }] = await Promise.all([
      serviceClient.from("books").select("*"),
      serviceClient.from("chapters").select("id, book_id, slug, title, chapter_number"),
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
            chapterCount: (chapters ?? []).filter((ch) => ch.book_id === book.id).length,
            slug,
            title: String(book.title),
            cover: `/api/covers/books/${book.id}`,
            level: String(book.level ?? ""),
          },
        ]
      })
    )

    const allPages = ((chapters ?? []) as Record<string, unknown>[]).flatMap((chapter) => {
      const book = booksById.get(String(chapter.book_id))
      if (!book) return []
      return [{
        bookId: String(chapter.book_id),
        chapterId: String(chapter.id),
        bookSlug: book.slug,
        bookTitle: book.title,
        chapterSlug: String(chapter.slug),
        chapterTitle: String(chapter.title),
        chapterNumber: Number(chapter.chapter_number),
        cover: book.cover,
        level: book.level,
      }]
    })
    // Bound the discovery payload; full books remain available in the reader.
    const stride = Math.max(1, Math.ceil(allPages.length / 40))
    return allPages.filter((_, index) => index % stride === 0).slice(0, 40)
  },
  ["books", "public", "explore-chapter-metas", "storage-covers-v2"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
)

function parseExploreBlocks(rawContent: unknown): ExploreBookBlock[] {
  const rawBlocks = Array.isArray(rawContent) ? rawContent : []
  return rawBlocks.flatMap((rawBlock) => {
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
      const lemma = typeof token.lemma === "string" ? token.lemma.trim() : ""
      const headword = typeof token.headword === "string" ? token.headword.trim() : ""
      return [{
        arabic,
        plain: stripDiacritics(arabic),
        transliteration: typeof token.transliteration === "string" ? token.transliteration : "",
        english: typeof token.english === "string" ? token.english : "",
        cefr: typeof token.cefr === "string" ? token.cefr.toLowerCase() : undefined,
        pos: typeof token.pos === "string" ? token.pos : undefined,
        lemma: lemma || undefined,
        headword: headword || undefined,
        root: typeof token.root === "string" ? token.root.trim() || undefined : undefined,
        entry_type: token.entry_type === "phrase" ? "phrase" : "word",
      }]
    })

    const translation = typeof block.translation === "string" ? block.translation : ""
    if (words.length === 0 && !translation) return []
    return [{
      words,
      translation,
      punctuation: typeof block.punctuation === "string" ? block.punctuation : undefined,
      paragraphNumber: typeof block.paragraph === "number" && Number.isFinite(block.paragraph)
        ? block.paragraph
        : undefined,
    }]
  })
}

/* Pages slice the same blocks buildExploreBookPages paginates, so a count is
   ceil(blocks / per-page) — derivable without materializing any pages. */
function countExplorePages(rawContent: unknown): number {
  const blockCount = parseExploreBlocks(rawContent).length
  return blockCount === 0 ? 0 : Math.ceil(blockCount / EXPLORE_BLOCKS_PER_PAGE)
}

function buildExploreBookPages(
  chapter: Record<string, unknown>,
  book: { slug: string; title: string; cover?: string; level: string },
): ExploreBookPage[] {
  const blocks = parseExploreBlocks(chapter.content)

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
}

const fetchExploreBookChapterPagesCached = unstable_cache(
  async (chapterId: string): Promise<ExploreBookPage[]> => {
    if (!hasServiceClientConfig()) return []

    const { data: chapter, error } = await serviceClient
      .from("chapters")
      .select("id, book_id, slug, title, chapter_number, content")
      .eq("id", chapterId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!chapter) return []

    const book = (await fetchBooksForPublic()).find((book) => book.id === String(chapter.book_id))
    if (!book) return []
    return buildExploreBookPages(chapter as Record<string, unknown>, {
      slug: book.slug,
      title: book.title,
      cover: book.cover,
      level: book.level,
    })
  },
  ["books", "public", "explore-chapter-pages", "v1"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
)

export async function fetchExploreBookChapterPages(chapterId: string): Promise<ExploreBookPage[]> {
  if (!await getAuthenticatedUserId()) return []
  return fetchExploreBookChapterPagesCached(chapterId)
}

/* Pages are cached by chapter ID set — feed batches reorder every visit but
   hydrate the same chapters. The entitlement gate stays OUTSIDE the cache:
   only signed-in users may read chapter pages at all. */
const fetchExploreBookChapterPagesByChapterIdsCached = unstable_cache(
  async (idsKey: string, uniqueIds: string[]): Promise<Map<string, ExploreBookPage[]>> => {
    const pagesByChapter = new Map<string, ExploreBookPage[]>()
    if (!hasServiceClientConfig() || uniqueIds.length === 0) return pagesByChapter
    const { data: chapters, error } = await serviceClient
      .from("chapters")
      .select("id, book_id, slug, title, chapter_number, content")
      .in("id", uniqueIds)
    if (error) throw new Error(error.message)
    if (!chapters?.length) return pagesByChapter
    const books = await fetchBooksForPublic()
    const bookById = new Map(books.map((book) => [book.id, book]))
    for (const chapter of chapters) {
      const book = bookById.get(String(chapter.book_id))
      if (!book) continue
      pagesByChapter.set(String(chapter.id), buildExploreBookPages(chapter as Record<string, unknown>, {
        slug: book.slug,
        title: book.title,
        cover: book.cover,
        level: book.level,
      }))
    }
    return pagesByChapter
  },
  ["books", "public", "explore-chapter-pages-by-ids", "v1"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
)

export async function fetchExploreBookChapterPagesByChapterIds(chapterIds: string[]): Promise<Map<string, ExploreBookPage[]>> {
  const uniqueIds = Array.from(new Set(chapterIds))
  if (uniqueIds.length === 0) return new Map<string, ExploreBookPage[]>()
  if (!await getAuthenticatedUserId()) return new Map<string, ExploreBookPage[]>()
  const idsKey = createHash("sha256").update([...uniqueIds].sort().join(",")).digest("hex").slice(0, 32)
  return fetchExploreBookChapterPagesByChapterIdsCached(idsKey, uniqueIds)
}

/* ── Page counts per chapter. Only the counts are cached; cold caches pay
   one batched content query for every explore chapter at once, not one query
   per chapter. ── */
export const fetchExploreBookChapterPageCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const metas = await fetchExploreBookChapterMetasForPublic()
    if (metas.length === 0 || !hasServiceClientConfig()) return {}
    const { data: chapters, error } = await serviceClient
      .from("chapters")
      .select("id, content")
      .in("id", metas.map((meta) => meta.chapterId))
    if (error) throw new Error(error.message)
    const counts: Record<string, number> = Object.fromEntries(metas.map((meta) => [meta.chapterId, 0]))
    for (const chapter of chapters ?? []) {
      counts[String(chapter.id)] = countExplorePages((chapter as Record<string, unknown>).content)
    }
    return counts
  },
  ["books", "public", "explore-chapter-page-counts", "v1"],
  { revalidate: publicRevalidate, tags: ["books-public"] }
)
