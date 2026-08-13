import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Box, Chip, Container, Paper, Typography } from '@mui/material'
import { ArrowBack, ChevronRight, MenuBook } from '@mui/icons-material'
import { fetchBookBySlugPublic, fetchBooksForPublic, fetchChaptersForBookPublic } from '@/app/actions/books'
import BookReadingCta from './BookReadingCta'

export const revalidate = 300

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
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: '#fffaf0', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Link href="/books" style={{ color: 'inherit', textDecoration: 'none' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: '#7a6e65', fontFamily: 'Jost, sans-serif', mb: 3, '&:hover': { color: '#b8860b' } }}>
            <ArrowBack sx={{ fontSize: 18 }} /> Back to books
          </Box>
        </Link>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: '14px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: '#fff', mb: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: book.cover ? '180px minmax(0, 1fr)' : '1fr' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
            {book.cover && (
              <Box
                component="img"
                src={book.cover}
                alt={`${book.title} cover`}
                sx={{ width: '100%', maxWidth: { xs: 240, sm: 180 }, mx: { xs: 'auto', sm: 0 }, aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 12px 30px rgba(44,26,14,0.16)' }}
              />
            )}
            <Box sx={{ minWidth: 0 }}>
              <MenuBook sx={{ color: '#b8860b', fontSize: 38, mb: 1 }} />
              <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 36, md: 48 }, fontWeight: 600, color: '#2c1a0e', lineHeight: 1.1 }}>
                {book.title}
              </Typography>
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
              <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
                {book.level && <Chip label={book.level} size="small" sx={{ bgcolor: '#6b8f5e', color: '#fff', fontWeight: 700 }} />}
                {book.category && <Chip label={book.category} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508' }} />}
              </Box>
              <Box sx={{ mt: 3 }}>
                <BookReadingCta bookSlug={book.slug} chapterSlugs={chapters.map((chapter) => chapter.slug)} />
              </Box>
            </Box>
          </Box>
        </Paper>

        <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 25, sm: 30 }, fontWeight: 600, color: '#2c1a0e', mb: 2 }}>
          Chapters
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'column' },
            gap: { xs: 1.25, sm: 1.25 },
            overflowX: { xs: 'auto', sm: 'visible' },
            mx: { xs: -2, sm: 0 },
            px: { xs: 2, sm: 0 },
            pb: { xs: 1.5, sm: 0 },
            scrollSnapType: { xs: 'x mandatory', sm: 'none' },
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {chapters.map((chapter) => (
            <Box key={chapter.id} sx={{ flex: { xs: '0 0 142px', sm: 'initial' }, scrollSnapAlign: { xs: 'start', sm: 'none' } }}>
              <Link
                href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(chapter.slug)}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <Paper elevation={0} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: { xs: 1.25, sm: 2 }, p: { xs: 1.5, sm: 2 }, minHeight: { xs: 100, sm: 0 }, height: '100%', textAlign: { xs: 'center', sm: 'left' }, borderRadius: '10px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: '#fff', transition: 'border-color 0.15s ease, transform 0.15s ease', '&:hover': { borderColor: 'rgba(184,134,11,0.45)', transform: { xs: 'none', sm: 'translateX(3px)' } } }}>
                  <Box sx={{ width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 }, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(184,134,11,0.1)', color: '#b8860b', fontWeight: 700, flexShrink: 0 }}>
                    {chapter.chapterNumber}
                  </Box>
                  <Typography sx={{ flex: { sm: 1 }, fontFamily: 'Jost, sans-serif', fontSize: { xs: 12, sm: 16 }, lineHeight: 1.3, fontWeight: 600, color: '#2c1a0e', display: '-webkit-box', WebkitLineClamp: { xs: 2, sm: 'unset' }, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{chapter.title}</Typography>
                  <ChevronRight sx={{ display: { xs: 'none', sm: 'block' }, color: '#9e8a7a' }} />
                </Paper>
              </Link>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}
