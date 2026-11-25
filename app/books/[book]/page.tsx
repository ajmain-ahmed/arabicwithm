import LocalisedContent from '@/app/components/LocalisedContent'

import {UiText} from '@/app/components/WebsiteLocaleProvider'
import Link from 'next/link'
import BookCoverImage from '@/app/books/BookCoverImage'
import { notFound } from 'next/navigation'
import { Box, Container, Paper, Typography } from '@mui/material'
import { ArrowBack, ChevronRight, HeadphonesRounded } from '@mui/icons-material'
import { fetchBookBySlugPublic, fetchChapterCardsForBookPublic } from '@/app/actions/books'
import BookReadingCta from './BookReadingCta'
import ChapterAccessLock, { ChapterLink } from './ChapterAccessLock'
import BookDetailMetadata from './BookDetailMetadata'
import { fetchPublishedAudioForBook } from '@/app/actions/audiobooks'
import BookInProgress from './BookInProgress'
import { isBookReleased } from '@/app/lib/bookRelease'
import { getAuthenticatedAccess } from '@/app/actions/auth'
import { fetchChaptersForBookReader } from '@/app/actions/books'
import StructuredData from '@/app/components/StructuredData'
import { absoluteUrl, breadcrumbJsonLd } from '@/app/lib/seo'

// Viewer-specific chapter access must never enter a shared static page cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params
  const book = await fetchBookBySlugPublic(slug)
  if (!book) return { title: 'Book Not Found' }
  const path = `/books/${encodeURIComponent(book.slug)}`
  const description = book.description?.slice(0, 240) ?? `Read ${book.title}, a graded Arabic book at ${book.level || 'your'} level.`
  return {
    title: `${book.title} | Arabic Books`,
    description,
    alternates: { canonical: path },
    robots: book.isCompleted === false ? { index: false, follow: true } : undefined,
    openGraph: { type: 'book', title: book.title, description, url: path, images: book.cover ? [{ url: book.cover, alt: `${book.title} cover` }] : undefined },
    twitter: { card: 'summary_large_image', title: book.title, description, images: book.cover ? [book.cover] : undefined },
  }
}

export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params
  const book = await fetchBookBySlugPublic(slug)
  if (!book) notFound()
  const admin = Boolean((await getAuthenticatedAccess())?.admin)
  const completed = admin || await isBookReleased(book.id)

  const [chapters, audioChapters] = completed ? await Promise.all([admin ? fetchChaptersForBookReader(book.id) : fetchChapterCardsForBookPublic(book.id), fetchPublishedAudioForBook(book.id)]) : [[], []]
  const audioChapterIds = new Set(audioChapters.map((audio) => audio.chapterId))

  const infoFields = (
    <>
      <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 36, md: 48 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.1 }}>
        <LocalisedContent original={book.title} arabic={book.titleAr}/>
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}><UiText>{"By"}</UiText>{' '}{book.author}</Typography>
      {!completed && book.category && <Typography sx={{ mt: .5, fontSize: 13, color: 'var(--awm-muted)' }}>{book.category}</Typography>}
      {book.description && (
        <Typography
          dir="auto"
          sx={{
            mt: 1.25,
            maxWidth: 600,
            fontFamily: 'var(--font-sans), sans-serif',
            fontWeight: 400,
            fontSize: { xs: 17, md: 19 },
            lineHeight: 1.5,
            color: '#b8860b',

            unicodeBidi: 'plaintext',
            textAlign: 'start',
          }}
        >
          <LocalisedContent original={book.description} arabic={book.descriptionAr}/>
        </Typography>
      )}
      {admin && book.isCompleted === false && <Typography role="status" sx={{ mt: 2, color: 'var(--awm-gold)', fontWeight: 600 }}><UiText>{"In progress — Admin preview"}</UiText></Typography>}
      <BookDetailMetadata level={book.level} readingTimeMinutes={book.readingTimeMinutes} tags={book.tags} audioChapterCount={audioChapterIds.size}/>
      <Box sx={{ mt: 3 }}>
        {completed ? <BookReadingCta bookId={book.id} bookSlug={book.slug} chapters={chapters} /> : <BookInProgress bookId={book.id} />}
      </Box>
    </>
  )

  const coverImage = (
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '2 / 3', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(44,26,14,0.08)', boxShadow: '0 12px 30px rgba(44,26,14,0.16)' }}>
      <BookCoverImage src={book.cover!} title={book.title} titleAr={book.titleAr} />
    </Box>
  )

  const chaptersList = (
    <>
      <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 25, sm: 30 }, fontWeight: 600, color: 'var(--awm-bark)', mb: 2 }}>
        <UiText>{"Chapters"}</UiText></Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {chapters.map((chapter) => (
          <Box key={chapter.id}>
            <ChapterLink
              serverAuthorized={admin}
              href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(chapter.slug)}`}
              chapterNumber={chapter.chapterNumber}
            >
              <Paper elevation={0} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, textAlign: 'start', borderRadius: '10px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)', transition: 'border-color 0.15s ease, transform 0.15s ease', '&:hover': { borderColor: 'rgba(184,134,11,0.45)', transform: { sm: 'translateX(3px)' } } }}>
                <Box sx={{ width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 }, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(184,134,11,0.1)', color: '#b8860b', fontWeight: 700, flexShrink: 0 }}>
                  {chapter.chapterNumber}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 14, sm: 16 }, lineHeight: 1.3, fontWeight: 600, color: 'var(--awm-bark)' }}><LocalisedContent original={chapter.title} arabic={chapter.titleAr}/></Typography>
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
    <Box component="div" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pt: { xs: 3, md: 6 }, pb: { xs: 'var(--awm-mobile-bottom-clearance)', md: 6 } }}>
      <StructuredData data={[
        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Arabic Books', path: '/books' }, { name: book.title, path: `/books/${encodeURIComponent(book.slug)}` }]),
        {
          '@context': 'https://schema.org', '@type': 'Book', name: book.title,
          ...(book.titleAr ? { alternateName: book.titleAr } : {}),
          ...(book.author !== 'Author not listed' ? { author: { '@type': 'Person', name: book.author } } : {}),
          ...(book.description ? { description: book.description } : {}),
          ...(book.cover ? { image: book.cover } : {}),
          inLanguage: 'ar', educationalLevel: book.level, url: absoluteUrl(`/books/${encodeURIComponent(book.slug)}`),
        },
      ]} />
      <Container maxWidth="xl">
        <Link href="/books" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', mb: 3, '&:hover': { color: '#b8860b' } }}>
            <ArrowBack sx={{ fontSize: 18 }} /> {' '}<UiText>{"Back to books"}</UiText></Box>
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
          {completed && <Box sx={{ gridArea: 'chapters', minWidth: 0 }}>{chaptersList}</Box>}
        </Box>
      </Container>
    </Box>
  )
}
