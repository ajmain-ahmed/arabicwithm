import Link from 'next/link'
import { Box, Chip, Container, Paper, Typography } from '@mui/material'
import { AutoStories, ChevronRight, MenuBook } from '@mui/icons-material'
import { fetchBooksForPublic } from '@/app/actions/books'

export const revalidate = 300

export const metadata = {
  title: 'Arabic Books | ArabicWithM',
  description: 'Read graded Arabic books and stories by level and category.',
}

export default async function BooksPage() {
  const books = await fetchBooksForPublic()

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: '#fffaf0', pb: { xs: 5, md: 9 } }}>
      <Box
        sx={{
          mt: { xs: '-56px', md: '-64px' },
          pt: { xs: 14, md: 17 },
          pb: { xs: 6, md: 8 },
          px: 2,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #0e2e1f 0%, #173f2d 55%, #2c1a0e 100%)',
        }}
      >
        <MenuBook sx={{ color: '#d4a843', fontSize: { xs: 38, md: 48 }, mb: 1 }} />
        <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 38, md: 58 }, fontWeight: 700, color: '#fff' }}>
          Arabic Books
        </Typography>
        <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 23, md: 30 }, color: '#d4a843', direction: 'rtl' }}>
          كتب عربية
        </Typography>
        <Typography sx={{ mt: 1.5, mx: 'auto', maxWidth: 560, color: 'rgba(255,255,255,0.78)', fontFamily: 'Jost, sans-serif' }}>
          Build your reading confidence with graded Arabic stories.
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3 }}>
          <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 28, md: 36 }, fontWeight: 700, color: '#2c1a0e' }}>
            Library
          </Typography>
          <Typography sx={{ color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontSize: 14 }}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Typography>
        </Box>

        {books.length === 0 ? (
          <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px solid rgba(44,26,14,0.08)', bgcolor: '#fff' }}>
            <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 24, color: '#2c1a0e' }}>No books yet</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${encodeURIComponent(book.slug)}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    height: '100%',
                    borderRadius: '12px',
                    border: '1px solid rgba(44,26,14,0.08)',
                    bgcolor: '#fff',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(44,26,14,0.12)' },
                  }}
                >
                  {book.cover ? (
                    <Box
                      component="img"
                      src={book.cover}
                      alt={`${book.title} cover`}
                      sx={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', objectPosition: 'center' }}
                    />
                  ) : (
                    <Box sx={{ minHeight: 300, p: 3, display: 'grid', placeItems: 'center', textAlign: 'center', background: 'linear-gradient(145deg, #173f2d, #0e2e1f 62%, #2c1a0e)' }}>
                      <Box>
                        <AutoStories sx={{ color: '#d4a843', fontSize: 44, mb: 2 }} />
                        <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 28, lineHeight: 1.15, fontWeight: 700, color: '#fff' }}>
                          {book.title}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ p: 2.5 }}>
                    <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 24, lineHeight: 1.2, fontWeight: 700, color: '#2c1a0e', mb: 1.5 }}>
                      {book.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {book.level && <Chip label={book.level} size="small" sx={{ bgcolor: '#6b8f5e', color: '#fff', fontWeight: 700 }} />}
                      {book.category && <Chip label={book.category} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508' }} />}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid rgba(44,26,14,0.07)' }}>
                      <Typography sx={{ color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontSize: 14 }}>
                        {book.chapterCount} {book.chapterCount === 1 ? 'chapter' : 'chapters'}
                      </Typography>
                      <ChevronRight sx={{ color: '#b8860b' }} />
                    </Box>
                  </Box>
                </Paper>
              </Link>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  )
}
