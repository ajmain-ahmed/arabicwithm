import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Chip, Container, Paper, Typography } from '@mui/material'
import { ArrowBack, ChevronRight } from '@mui/icons-material'
import { fetchBookBySlugPublic, fetchBooksForPublic, fetchChaptersForBookPublic } from '@/app/actions/books'
import BookReadingCta from './BookReadingCta'
import BookListRemovalButton from './BookListRemovalButton'
import ChapterAccessLock, { PremiumChapterLink } from './ChapterAccessLock'

export const revalidate = false

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

  const chapters = await fetchChaptersForBookPublic(book.id)

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="lg">
        <Link href="/books" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', mb: 3, '&:hover': { color: '#b8860b' } }}>
            <ArrowBack sx={{ fontSize: 18 }} /> Back to books
          </Box>
        </Link>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: '14px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)', mb: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: book.cover ? '240px minmax(0, 1fr)' : '1fr' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>
            {book.cover && (
              <Box sx={{ width: '100%', maxWidth: { sm: 240 }, mx: { xs: 'auto', sm: 0 } }}>
                <Box component="img" src={book.cover} alt={`${book.title} cover`} sx={{ display: 'block', width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 12px 30px rgba(44,26,14,0.16)' }} />
                <BookListRemovalButton bookSlug={book.slug} />
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
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
                    fontFamily: '"EB Garamond", Georgia, serif',
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
              <Box sx={{ display: 'flex', gap: 1, mt: 2.5, flexWrap: 'wrap' }}>
                {book.level && <Chip label={book.level} size="small" sx={{ bgcolor: '#6b8f5e', color: '#fff', fontWeight: 700 }} />}
                {book.tags.slice(0, 2).map((tag) => <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508' }} />)}
              </Box>
              <Box sx={{ mt: 3 }}>
                <BookReadingCta bookSlug={book.slug} chapters={chapters} />
              </Box>
            </Box>
          </Box>
        </Paper>

        <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 25, sm: 30 }, fontWeight: 600, color: 'var(--awm-bark)', mb: 2 }}>
          Chapters
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}
        >
          {chapters.map((chapter) => (
            <Box key={chapter.id}>
              <PremiumChapterLink
                href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(chapter.slug)}`}
                premiumExempt={book.premiumExempt}
                freeChapterCount={book.freeChapterCount}
                chapterCount={book.chapterCount}
                chapterNumber={chapter.chapterNumber}
              >
                <Paper elevation={0} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, textAlign: 'left', borderRadius: '10px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)', transition: 'border-color 0.15s ease, transform 0.15s ease', '&:hover': { borderColor: 'rgba(184,134,11,0.45)', transform: { sm: 'translateX(3px)' } } }}>
                  <Box sx={{ width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 }, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(184,134,11,0.1)', color: '#b8860b', fontWeight: 700, flexShrink: 0 }}>
                    {chapter.chapterNumber}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: 14, sm: 16 }, lineHeight: 1.3, fontWeight: 600, color: 'var(--awm-bark)' }}>{chapter.title}</Typography>
                    {chapter.teaser && <Typography sx={{ mt: 0.35, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chapter.teaser}</Typography>}
                  </Box>
                  <ChapterAccessLock premiumExempt={book.premiumExempt} freeChapterCount={book.freeChapterCount} chapterCount={book.chapterCount} chapterNumber={chapter.chapterNumber} />
                  <ChevronRight sx={{ color: 'var(--awm-muted-light)' }} />
                </Paper>
              </PremiumChapterLink>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}
