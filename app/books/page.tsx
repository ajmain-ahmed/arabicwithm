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
          pt: { xs: 10, md: 17 },
          pb: { xs: 2.5, md: 8 },
          px: 2,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #0e2e1f 0%, #173f2d 55%, #2c1a0e 100%)',
        }}
      >
        <MenuBook sx={{ display: { xs: 'none', md: 'inline-block' }, color: '#d4a843', fontSize: { xs: 38, md: 48 }, mb: 1 }} />
        <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 27, md: 58 }, fontWeight: 600, color: '#fff', lineHeight: 1.15 }}>
          Arabic Books
        </Typography>
        <Typography sx={{ display: { xs: 'none', md: 'block' }, fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 23, md: 30 }, color: '#d4a843', direction: 'rtl' }}>
          كتب عربية
        </Typography>
        <Typography sx={{ display: { xs: 'none', md: 'block' }, mt: 1.5, mx: 'auto', maxWidth: 560, color: 'rgba(255,255,255,0.78)', fontFamily: 'Jost, sans-serif' }}>
          Build your reading confidence with graded Arabic stories.
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 6 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: { xs: 1.5, sm: 3 } }}>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 24, md: 36 }, fontWeight: 600, color: '#2c1a0e' }}>
            Library
          </Typography>
          <Typography sx={{ color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontSize: 14 }}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Typography>
        </Box>

        {books.length === 0 ? (
          <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px solid rgba(44,26,14,0.08)', bgcolor: '#fff' }}>
            <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: '#2c1a0e' }}>No books yet</Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: { xs: 'flex', sm: 'grid' },
              gridTemplateColumns: { sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: { xs: 1, sm: 3 },
              overflowX: { xs: 'auto', sm: 'visible' },
              pb: { xs: 1.5, sm: 0 },
              scrollSnapType: { xs: 'x mandatory', sm: 'none' },
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${encodeURIComponent(book.slug)}`}
                style={{ color: 'inherit', textDecoration: 'none', flex: '0 0 calc((100% - 24px) / 4)', minWidth: 0, scrollSnapAlign: 'start' }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    height: '100%',
                    borderRadius: { xs: '4px', sm: '12px' },
                    border: { xs: 0, sm: '1px solid rgba(44,26,14,0.08)' },
                    bgcolor: { xs: 'transparent', sm: '#fff' },
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': { transform: { xs: 'none', sm: 'translateY(-4px)' }, boxShadow: { xs: 'none', sm: '0 12px 28px rgba(44,26,14,0.12)' } },
                  }}
                >
                  {book.cover ? (
                    <Box
                      component="img"
                      src={book.cover}
                      alt={`${book.title} cover`}
                      sx={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', objectPosition: 'center', borderRadius: { xs: '4px', sm: 0 } }}
                    />
                  ) : (
                    <Box sx={{ minHeight: { xs: 92, sm: 300 }, aspectRatio: { xs: '3 / 4', sm: 'auto' }, p: { xs: 0.75, sm: 3 }, display: 'grid', placeItems: 'center', textAlign: 'center', borderRadius: { xs: '5px', sm: 0 }, background: 'linear-gradient(145deg, #173f2d, #0e2e1f 62%, #2c1a0e)' }}>
                      <Box>
                        <AutoStories sx={{ color: '#d4a843', fontSize: { xs: 24, sm: 44 }, mb: { xs: 0, sm: 2 } }} />
                        <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontFamily: 'var(--font-heading)', fontSize: 28, lineHeight: 1.15, fontWeight: 600, color: '#fff' }}>
                          {book.title}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ p: { xs: '5px 1px 0', sm: 2.5 } }}>
                    <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 11.5, sm: 24 }, lineHeight: { xs: 1.25, sm: 1.2 }, fontWeight: 600, color: '#2c1a0e', mb: { xs: 0, sm: 1.5 }, minHeight: { xs: '2.5em', sm: 0 }, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: { xs: 2, sm: 'unset' }, WebkitBoxOrient: 'vertical' }}>
                      {book.title}
                    </Typography>
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {book.level && <Chip label={book.level} size="small" sx={{ bgcolor: '#6b8f5e', color: '#fff', fontWeight: 700 }} />}
                      {book.category && <Chip label={book.category} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508' }} />}
                    </Box>
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid rgba(44,26,14,0.07)' }}>
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
