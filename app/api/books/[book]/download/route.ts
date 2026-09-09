import { fetchPremiumStatus } from "@/app/actions/premium"
import type { NextRequest } from 'next/server'
import {
  fetchBookBySlugPublic,
  fetchChapterForPublic,
  fetchChaptersForBookPublic,
  type PublicBookBlock,
} from '@/app/actions/books'
import { groupChapterBlocks } from '@/app/lib/bookParagraphs'

export const runtime = 'nodejs'

function arabicBlock(block: PublicBookBlock): string {
  const sentence = block.tokens.map((token) => `${token.prefix ?? ''}${token.arabic}${token.suffix ?? ''}`).join(' ')
  return `${sentence}${block.punctuation ?? ''}`.trim()
}

function chapterParagraphs(chapterSlug: string, content: PublicBookBlock[], language: 'ar' | 'en'): string[] {
  return groupChapterBlocks(chapterSlug, content).map((paragraph) => paragraph
    .map((block) => language === 'ar' ? arabicBlock(block) : block.translation.trim())
    .filter(Boolean)
    .join(' ')
  ).filter(Boolean)
}

function filenamePart(value: string): string {
  return value.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'arabicwithm-book'
}

export async function GET(request: NextRequest, context: { params: Promise<{ book: string }> }) {
  if (!(await fetchPremiumStatus()).premium) return Response.json({ error: "PDF downloads are available with Premium." }, { status: 403, headers: { "Cache-Control": "private, no-store" } })
  const { book: bookSlug } = await context.params
  const language = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'ar'
  const requestedChapter = request.nextUrl.searchParams.get('chapter')
  const book = await fetchBookBySlugPublic(bookSlug)
  if (!book) return Response.json({ error: 'Book not found' }, { status: 404 })

  const chapterList = await fetchChaptersForBookPublic(book.id)
  const selectedChapters = requestedChapter
    ? chapterList.filter((chapter) => chapter.slug === requestedChapter)
    : chapterList
  if (selectedChapters.length === 0) return Response.json({ error: 'Chapter not found' }, { status: 404 })

  const chapters = await Promise.all(selectedChapters.map(async (chapter) => {
    const fullChapter = await fetchChapterForPublic(book.id, chapter.slug)
    return {
      title: chapter.title,
      paragraphs: fullChapter ? chapterParagraphs(chapter.slug, fullChapter.content, language) : [],
    }
  }))

  const available = chapters.some(chapter => chapter.paragraphs.length > 0)
  if (!available) return Response.json({ error: 'This language is not available.' }, { status: 404 })
  const suffix = requestedChapter ? selectedChapters[0].title : 'complete-book'
  return Response.json({
    filename: `${filenamePart(book.title)}-${filenamePart(suffix)}-${language}.pdf`,
    title: book.title,
    language,
    chapters,
  }, { headers: { "Cache-Control": "private, no-store" } })
}
