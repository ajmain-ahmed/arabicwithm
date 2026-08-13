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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 3 }}>
            <Box>
              <MenuBook sx={{ color: '#b8860b', fontSize: 38, mb: 1 }} />
              <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 36, md: 48 }, fontWeight: 700, color: '#2c1a0e', lineHeight: 1.1 }}>
                {book.title}
              </Typography>
              {book.description && <Typography sx={{ mt: 1, fontFamily: '"EB Garamond", Georgia, serif', fontSize: 25, color: '#b8860b', direction: 'rtl', textAlign: 'left' }}>{book.description}</Typography>}
              <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
                {book.level && <Chip label={book.level} size="small" sx={{ bgcolor: '#6b8f5e', color: '#fff', fontWeight: 700 }} />}
                {book.category && <Chip label={book.category} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508' }} />}
              </Box>
            </Box>
            <BookReadingCta bookSlug={book.slug} chapterSlugs={chapters.map((chapter) => chapter.slug)} />
          </Box>
        </Paper>

        <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 30, fontWeight: 700, color: '#2c1a0e', mb: 2 }}>
          Chapters
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/books/${encodeURIComponent(book.slug)}/${encodeURIComponent(chapter.slug)}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: '10px', border: '1px solid rgba(44,26,14,0.08)', bgcolor: '#fff', transition: 'border-color 0.15s ease, transform 0.15s ease', '&:hover': { borderColor: 'rgba(184,134,11,0.45)', transform: 'translateX(3px)' } }}>
                <Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(184,134,11,0.1)', color: '#b8860b', fontWeight: 700, flexShrink: 0 }}>
                  {chapter.chapterNumber}
                </Box>
                <Typography sx={{ flex: 1, fontFamily: 'Jost, sans-serif', fontWeight: 600, color: '#2c1a0e' }}>{chapter.title}</Typography>
                <ChevronRight sx={{ color: '#9e8a7a' }} />
              </Paper>
            </Link>
          ))}
        </Box>
      </Container>
    </Box>
  )
}
