import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Button, Container, Typography } from '@mui/material'
import { ArrowBack, ArrowForward, FormatListBulleted } from '@mui/icons-material'
import {
  fetchBookBySlugPublic,
  fetchChapterForPublic,
  fetchChaptersForBookPublic,
} from '@/app/actions/books'
import ReadingProgress from './ReadingProgress'
import ChapterReader from './ChapterReader'
import { normalizeBookReaderLanguage } from '@/app/lib/bookReaderSettings'
import SignInRequired from '@/app/components/SignInRequired'
import { fetchPublishedChapterAudio } from '@/app/actions/audiobooks'
import { getAuthenticatedUserId } from '@/app/actions/auth'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: bookSlug, chapter: chapterSlug } = await params
  const book = await fetchBookBySlugPublic(bookSlug)
  if (!book) return { title: 'Chapter Not Found' }
  const chapter = (await fetchChaptersForBookPublic(book.id)).find((item) => item.slug === chapterSlug)
  return chapter ? { title: `${chapter.title} — ${book.title}` } : { title: 'Chapter Not Found' }
}

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ book: string; chapter: string }>
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const { book: bookSlug, chapter: chapterSlug } = await params
  const rawLanguage = (await searchParams).lang
  const languageValue = Array.isArray(rawLanguage) ? rawLanguage[0] : rawLanguage
  const initialLanguage = languageValue ? normalizeBookReaderLanguage(languageValue) : undefined
  const book = await fetchBookBySlugPublic(bookSlug)
  if (!book) notFound()

  let chapter: Awaited<ReturnType<typeof fetchChapterForPublic>>
  let chapters: Awaited<ReturnType<typeof fetchChaptersForBookPublic>>
  try {
    ;[chapter, chapters] = await Promise.all([
      fetchChapterForPublic(book.id, chapterSlug),
      fetchChaptersForBookPublic(book.id),
    ])
  } catch (error) {
    console.error('[book-reader] Unable to load chapter data', {
      bookSlug,
      chapterSlug,
      error,
    })
    throw error
  }
  if (!chapter) {
    const listed = chapters.find(item => item.slug === chapterSlug)
    if (!listed) notFound()
    if (!await getAuthenticatedUserId()) return <SignInRequired title={`Sign in to read ${listed.title}`} />

    console.error('[book-reader] Chapter metadata exists but readable content is unavailable', {
      bookSlug,
      chapterSlug,
      bookId: book.id,
    })
    return (
      <Box component="main" sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', bgcolor: 'var(--awm-cream-light)', py: 6 }}>
        <Container maxWidth="sm">
          <Box sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', borderRadius: '16px', bgcolor: 'var(--awm-white)' }}>
            <Typography component="h1" sx={{ color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontSize: { xs: 29, sm: 36 }, fontWeight: 600 }}>
              Chapter content is unavailable
            </Typography>
            <Typography sx={{ mt: 1.25, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.65 }}>
              We found {listed.title}, but its reading content could not be loaded. Please return to the book and choose the chapter again.
            </Typography>
            <Button href={`/books/${encodeURIComponent(book.slug)}`} startIcon={<ArrowBack />} variant="contained" sx={{ mt: 3, bgcolor: 'var(--awm-gold)', textTransform: 'none', '&:hover': { bgcolor: '#946c08' } }}>
              Back to {book.title}
            </Button>
          </Box>
        </Container>
      </Box>
    )
  }

  const chapterIndex = chapters.findIndex((item) => item.slug === chapter.slug)
  let audio: Awaited<ReturnType<typeof fetchPublishedChapterAudio>>[]
  try {
    audio = await Promise.all([fetchPublishedChapterAudio(chapter.id, 'ar'), fetchPublishedChapterAudio(chapter.id, 'en')])
  } catch (error) {
    console.error('[book-reader] Unable to load chapter audio', {
      bookSlug,
      chapterSlug,
      chapterId: chapter.id,
      error,
    })
    throw error
  }
  const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null
  const nextChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 2.5, md: 5 } }}>
      <ReadingProgress bookSlug={book.slug} chapterSlug={chapter.slug} />
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
          <Link href={`/books/${encodeURIComponent(book.slug)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', '&:hover': { color: '#b8860b' } }}>
              <ArrowBack sx={{ fontSize: 18 }} /> {book.title}
            </Box>
          </Link>
          <Typography sx={{ color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 13 }}>
            {chapter.chapterNumber} of {chapters.length}
          </Typography>
        </Box>

        <ChapterReader bookSlug={book.slug} bookTitle={book.title} chapterTitle={chapter.title} chapterSlug={chapter.slug} content={chapter.content} initialLanguage={initialLanguage} audio={audio.filter((item): item is NonNullable<typeof item> => item !== null)} />

        <Box component="nav" aria-label="Chapter navigation" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, mt: 3 }}>
          {previousChapter && (
            <Button href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(previousChapter.slug)}`} startIcon={<ArrowBack />} variant="outlined" sx={{ maxWidth: '100%', color: 'var(--awm-bark)', borderColor: 'rgba(44,26,14,0.2)', textTransform: 'none', fontFamily: 'Jost, sans-serif' }}>
              {previousChapter.title}
            </Button>
          )}
          <Button href={`/books/${encodeURIComponent(book.slug)}`} startIcon={<FormatListBulleted />} variant="outlined" sx={{ color: 'var(--awm-muted)', borderColor: 'rgba(122,110,101,0.3)', textTransform: 'none', fontFamily: 'Jost, sans-serif' }}>
              All chapters
          </Button>
          {nextChapter && (
            <Button href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(nextChapter.slug)}`} endIcon={<ArrowForward />} variant="contained" sx={{ maxWidth: '100%', bgcolor: '#b8860b', color: '#fff', textTransform: 'none', fontFamily: 'Jost, sans-serif', '&:hover': { bgcolor: '#946c08' } }}>
              {nextChapter.title}
            </Button>
          )}
        </Box>
      </Container>
    </Box>
  )
}
