import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Container, Paper, Typography } from '@mui/material'
import { ArrowBack, ChevronRight, HeadphonesRounded } from '@mui/icons-material'
import { fetchBookBySlugPublic, fetchBooksForPublic, fetchChapterCardsForBookPublic } from '@/app/actions/books'
import BookReadingCta from './BookReadingCta'
import ChapterAccessLock, { ChapterLink } from './ChapterAccessLock'
import BookDetailMetadata from './BookDetailMetadata'
import { fetchPublishedAudioForBook } from '@/app/actions/audiobooks'

export const revalidate = 60

export async function generateStaticParams() {
  const books = await fetchBooksForPublic()
  return books.map((book) => ({ book: book.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params
  const book = await fetchBookBySlugPublic(slug)
  return book ? { title: `${book.title} | Arabic Books` } : { title: 'Book Not Found' }
}

export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params
  const book = await fetchBookBySlugPublic(slug)
  if (!book) notFound()

  const [chapters, audioChapters] = await Promise.all([fetchChapterCardsForBookPublic(book.id), fetchPublishedAudioForBook(book.id)])
  const audioChapterIds = new Set(audioChapters.map((audio) => audio.chapterId))

  const infoFields = (
    <>
      <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 36, md: 48 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.1 }}>
        {book.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>By {book.author}</Typography>
      {book.description && (
        <Typography
          dir="ltr"
          sx={{
            mt: 1.25,
            maxWidth: 600,
            fontFamily: 'var(--font-sans), sans-serif',
            fontWeight: 400,
            fontSize: { xs: 17, md: 19 },
            lineHeight: 1.5,
            color: '#b8860b',
            direction: 'ltr',
            unicodeBidi: 'plaintext',
            textAlign: 'left',
          }}
        >
          {book.description}
        </Typography>
      )}
      <BookDetailMetadata level={book.level} readingTimeMinutes={book.readingTimeMinutes} tags={book.tags} audioChapterCount={audioChapterIds.size}/>
      <Box sx={{ mt: 3 }}>
        <BookReadingCta bookId={book.id} bookSlug={book.slug} chapters={chapters} />
      </Box>
    </>
  )

  const coverImage = (
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(44,26,14,0.08)', boxShadow: '0 12px 30px rgba(44,26,14,0.16)' }}>
      {/* Plain img: the original cover bytes, no optimizer re-encode. */}
      <Box component="img" src={book.cover!} alt={`${book.title} cover`} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
    </Box>
  )

  const chaptersList = (
    <>
      <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 25, sm: 30 }, fontWeight: 600, color: 'var(--awm-bark)', mb: 2 }}>
        Chapters
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {chapters.map((chapter) => (
          <Box key={chapter.id}>
            <ChapterLink
              href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(chapter.slug)}`}
              chapterNumber={chapter.chapterNumber}
            >
              <Paper elevation={0} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, textAlign: 'left', borderRadius: '10px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)', transition: 'border-color 0.15s ease, transform 0.15s ease', '&:hover': { borderColor: 'rgba(184,134,11,0.45)', transform: { sm: 'translateX(3px)' } } }}>
                <Box sx={{ width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 }, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(184,134,11,0.1)', color: '#b8860b', fontWeight: 700, flexShrink: 0 }}>
                  {chapter.chapterNumber}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 14, sm: 16 }, lineHeight: 1.3, fontWeight: 600, color: 'var(--awm-bark)' }}>{chapter.title}</Typography>
                  {chapter.teaser && <Typography sx={{ mt: 0.35, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chapter.teaser}</Typography>}
                </Box>
                <ChapterAccessLock chapterNumber={chapter.chapterNumber} />
                {audioChapterIds.has(chapter.id) && <HeadphonesRounded aria-label="Audiobook available" sx={{ color: 'var(--awm-gold)', fontSize: 20 }} />}
                <ChevronRight sx={{ color: 'var(--awm-muted-light)' }} />
              </Paper>
            </ChapterLink>
          </Box>
        ))}
      </Box>
    </>
  )

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pt: { xs: 3, md: 6 }, pb: { xs: 'var(--awm-mobile-bottom-clearance)', md: 6 } }}>
      <Container maxWidth="xl">
        <Link href="/books" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', mb: 3, '&:hover': { color: '#b8860b' } }}>
            <ArrowBack sx={{ fontSize: 18 }} /> Back to books
          </Box>
        </Link>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: book.cover ? { xs: 'minmax(0, 1fr)', sm: 'minmax(180px, min(30%, 300px)) minmax(0, 1fr)', md: 'minmax(320px, 38%) minmax(0, 1fr)' } : 'minmax(0, 1fr)',
          gridTemplateAreas: book.cover ? { xs: '"cover" "info" "chapters"', sm: '"cover info" ". chapters"', md: '"cover info" "cover chapters"' } : '"info" "chapters"',
          columnGap: 4, rowGap: 3, alignItems: 'start',
        }}>
          {book.cover && <Box sx={{ gridArea: 'cover', width: '100%', maxWidth: { xs: 220, sm: 300, md: 520 }, justifySelf: { xs: 'center', sm: 'start' } }}>{coverImage}</Box>}
          <Paper elevation={0} sx={{ gridArea: 'info', minWidth: 0, p: { xs: 3, md: 5 }, borderRadius: '14px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)', minHeight: book.cover ? { md: 450 } : undefined }}>
            {infoFields}
          </Paper>
          <Box sx={{ gridArea: 'chapters', minWidth: 0 }}>{chaptersList}</Box>
        </Box>
      </Container>
    </Box>
  )
}
