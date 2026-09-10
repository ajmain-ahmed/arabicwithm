import Link from 'next/link'
import { Box, Chip, Container, Paper, Typography } from '@mui/material'
import { AutoStories, ChevronRight } from '@mui/icons-material'
import { fetchBooksForPublic } from '@/app/actions/books'

export const revalidate = false

export const metadata = {
  title: 'Arabic Books | ArabicWithM',
  description: 'Read graded Arabic books and stories by level and category.',
}

export default async function BooksPage() {
  const books = await fetchBooksForPublic()

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'var(--awm-cream-light)', pb: { xs: 5, md: 9 } }}>
      <Container maxWidth={false} sx={{ pt: { xs: 2.5, md: 5 }, px: { xs: 1.5, sm: 3, xl: 6 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: { xs: 1.5, sm: 3 } }}>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 24, md: 36 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
            Library
          </Typography>
          <Typography sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 14 }}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Typography>
        </Box>

        {books.length === 0 ? (
          <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)' }}>
            <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: 'var(--awm-bark)' }}>No books yet</Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
              gap: { xs: 1, sm: 2, lg: 2.5 },
            }}
          >
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${encodeURIComponent(book.slug)}`}
                style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}
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
                    bgcolor: 'var(--awm-white)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': { transform: { xs: 'none', sm: 'translateY(-4px)' }, boxShadow: { xs: 'none', sm: '0 12px 28px rgba(44,26,14,0.12)' } },
                  }}
                >
                  {book.cover ? (
                    <Box
                      component="img"
                      src={book.cover}
                      alt={`${book.title} cover`}
                      sx={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', display: 'block', objectPosition: 'center' }}
                    />
                  ) : (
                    <Box sx={{ minHeight: { xs: 92, sm: 300 }, aspectRatio: { xs: '3 / 4', sm: 'auto' }, p: { xs: 0.75, sm: 3 }, display: 'grid', placeItems: 'center', textAlign: 'center', borderRadius: { xs: '5px', sm: 0 }, background: 'linear-gradient(145deg, #173f2d, #0e2e1f 62%, #2c1a0e)' }}>
                      <Box>
                        <AutoStories sx={{ color: '#d4a843', fontSize: { xs: 24, sm: 44 }, mb: { xs: 0, sm: 2 } }} />
                        <Typography color="text.secondary" sx={{ fontSize: { xs: 10, sm: 13 }, mb: 1 }}>By {book.author}</Typography>
                    <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontFamily: 'var(--font-heading)', fontSize: 28, lineHeight: 1.15, fontWeight: 600, color: '#fff' }}>
                          {book.title}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ p: { xs: 0.75, sm: 2 }, display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
                    <Typography sx={{ minHeight: { xs: '2.5em', sm: '2.4em' }, fontFamily: 'var(--font-heading)', fontSize: { xs: 12.5, sm: 20 }, lineHeight: 1.2, fontWeight: 600, color: 'var(--awm-bark)', mb: { xs: 0.5, sm: 1.25 }, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {book.title}
                    </Typography>
                    <Typography sx={{ display: { xs: 'none', sm: '-webkit-box' }, minHeight: '4.5em', color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 13.5, lineHeight: 1.5, overflow: 'hidden', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', mb: 1.75 }}>
                      {book.description}
                    </Typography>
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.75, flexWrap: 'wrap', mb: 2, minHeight: 24 }}>
                      {book.level && <Chip label={book.level} size="small" sx={{ bgcolor: '#6b8f5e', color: '#fff', fontWeight: 700 }} />}
                      {book.tags.slice(0, 2).map((tag) => <Chip key={tag} label={tag} size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' }, bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508' }} />)}
                    </Box>
                    <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: { xs: 0.6, sm: 1.5 }, borderTop: '1px solid rgba(44,26,14,0.07)' }}>
                      <Typography sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 9, sm: 13 } }}>
                        {book.chapterCount} {book.chapterCount === 1 ? 'chapter' : 'chapters'}
                      </Typography>
                      <ChevronRight sx={{ color: '#b8860b', fontSize: { xs: 15, sm: 24 } }} />
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
