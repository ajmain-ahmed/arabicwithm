import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Button, Container, Typography } from '@mui/material'
import { ArrowBack, ArrowForward, FormatListBulleted } from '@mui/icons-material'
import {
  fetchBookBySlugPublic,
  fetchBooksForPublic,
  fetchChapterForPublic,
  fetchChaptersForBookPublic,
} from '@/app/actions/books'
import ReadingProgress from './ReadingProgress'
import ChapterReader from './ChapterReader'

export const revalidate = 300

export async function generateStaticParams() {
  const books = await fetchBooksForPublic()
  const params = await Promise.all(
    books.map(async (book) => {
      const chapters = await fetchChaptersForBookPublic(book.id)
      return chapters.map((chapter) => ({ book: book.slug, chapter: chapter.slug }))
    })
  )
  return params.flat()
}

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: bookSlug, chapter: chapterSlug } = await params
  const book = await fetchBookBySlugPublic(bookSlug)
  if (!book) return { title: 'Chapter Not Found' }
  const chapter = await fetchChapterForPublic(book.id, chapterSlug)
  return chapter ? { title: `${chapter.title} — ${book.title}` } : { title: 'Chapter Not Found' }
}

export default async function ChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: bookSlug, chapter: chapterSlug } = await params
  const book = await fetchBookBySlugPublic(bookSlug)
  if (!book) notFound()

  const [chapter, chapters] = await Promise.all([
    fetchChapterForPublic(book.id, chapterSlug),
    fetchChaptersForBookPublic(book.id),
  ])
  if (!chapter) notFound()

  const chapterIndex = chapters.findIndex((item) => item.slug === chapter.slug)
  const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null
  const nextChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: '#faf7f2', py: { xs: 2.5, md: 5 } }}>
      <ReadingProgress bookSlug={book.slug} chapterSlug={chapter.slug} />
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
          <Link href={`/books/${encodeURIComponent(book.slug)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: '#7a6e65', fontFamily: 'Jost, sans-serif', '&:hover': { color: '#b8860b' } }}>
              <ArrowBack sx={{ fontSize: 18 }} /> {book.title}
            </Box>
          </Link>
          <Typography sx={{ color: '#9e8a7a', fontFamily: 'Jost, sans-serif', fontSize: 13 }}>
            {chapter.chapterNumber} of {chapters.length}
          </Typography>
        </Box>

        <ChapterReader bookTitle={book.title} chapterTitle={chapter.title} chapterSlug={chapter.slug} content={chapter.content} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' }, gap: 1.5, alignItems: 'center', mt: 3 }}>
          <Box>
            {previousChapter && (
              <Link href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(previousChapter.slug)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <Button startIcon={<ArrowBack />} sx={{ color: '#2c1a0e', textTransform: 'none', fontFamily: 'Jost, sans-serif' }}>
                  {previousChapter.title}
                </Button>
              </Link>
            )}
          </Box>
          <Link href={`/books/${encodeURIComponent(book.slug)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <Button startIcon={<FormatListBulleted />} sx={{ color: '#7a6e65', textTransform: 'none', fontFamily: 'Jost, sans-serif' }}>
              All chapters
            </Button>
          </Link>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            {nextChapter && (
              <Link href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(nextChapter.slug)}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <Button endIcon={<ArrowForward />} variant="contained" sx={{ bgcolor: '#b8860b', color: '#fff', textTransform: 'none', fontFamily: 'Jost, sans-serif', '&:hover': { bgcolor: '#946c08' } }}>
                  {nextChapter.title}
                </Button>
              </Link>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
