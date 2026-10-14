'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Box, Chip, Paper, Slider, Typography } from '@mui/material'
import { AutoStories, ChevronRight } from '@mui/icons-material'
import CefrChip from '@/app/components/CefrChip'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'

const LEVELS = ['All', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

interface LibraryBook {
  id: string
  slug: string
  title: string
  author?: string | null
  description?: string | null
  level?: string | null
  tags: string[]
  cover?: string | null
  coverCrop?: Parameters<typeof thumbnailCropCss>[0]
  chapterCount: number
}

export default function BooksLibrary({ books }: { books: LibraryBook[] }) {
  const [levelIndex, setLevelIndex] = useState(0)
  const activeLevel = LEVELS[levelIndex]
  const visible = activeLevel === 'All' ? books : books.filter((book) => book.level === activeLevel)

  return (
    <Box>
      {/* Difficulty slider */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 2, sm: 3 } }}>
        <Box sx={{ flex: { xs: 1, sm: '0 1 360px' }, maxWidth: 420, ml: { xs: 0, sm: 'auto' } }}>
          <Slider
            aria-label="Filter books by difficulty"
            value={levelIndex}
            onChange={(_, value) => setLevelIndex(value as number)}
            min={0}
            max={LEVELS.length - 1}
            step={1}
            marks={LEVELS.map((level, index) => ({ value: index, label: level }))}
            sx={{
              '& .MuiSlider-track': { height: 4, background: 'linear-gradient(90deg, var(--awm-gold-light), var(--awm-gold))', border: 'none' },
              '& .MuiSlider-rail': { height: 4, bgcolor: 'color-mix(in srgb, var(--awm-bark) 14%, transparent)' },
              '& .MuiSlider-thumb': {
                width: 18,
                height: 18,
                bgcolor: 'var(--awm-gold)',
                border: '2px solid var(--awm-white)',
                boxShadow: '0 2px 8px rgba(44,26,14,0.3)',
                '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: '0 0 0 6px color-mix(in srgb, var(--awm-gold) 18%, transparent)' },
              },
              '& .MuiSlider-mark': { width: 2, height: 2, borderRadius: '50%', bgcolor: 'color-mix(in srgb, var(--awm-bark) 30%, transparent)' },
              '& .MuiSlider-markLabel': {
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--awm-muted)',
                top: 26,
              },
              '& .MuiSlider-markLabelActive': { color: 'var(--awm-bark)', fontWeight: 700 },
              mt: 0.5,
              mb: 3,
            }}
          />
        </Box>
        <Typography sx={{ ml: 'auto', color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 14, whiteSpace: 'nowrap' }}>
          {visible.length} {visible.length === 1 ? 'book' : 'books'}
        </Typography>
      </Box>

      {visible.length === 0 ? (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)' }}>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: 'var(--awm-bark)' }}>No books at this level yet</Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
            gap: { xs: 1, sm: 2, lg: 2.5 },
          }}
        >
          {visible.map((book) => (
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
                    sx={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', display: 'block', ...thumbnailCropCss(book.coverCrop) }}
                  />
                ) : (
                  <Box sx={{ minHeight: { xs: 92, sm: 300 }, aspectRatio: { xs: '2 / 3', sm: 'auto' }, p: { xs: 0.75, sm: 3 }, display: 'grid', placeItems: 'center', textAlign: 'center', borderRadius: { xs: '5px', sm: 0 }, background: 'linear-gradient(145deg, #173f2d, #0e2e1f 62%, #2c1a0e)' }}>
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
                  <Typography sx={{ display: { xs: 'none', sm: '-webkit-box' }, minHeight: '4.5em', color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 13.5, lineHeight: 1.5, overflow: 'hidden', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', mb: 1.75 }}>
                    {book.description}
                  </Typography>
                  <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.75, flexWrap: 'wrap', mb: 2, minHeight: 24 }}>
                    {book.level && <CefrChip level={book.level} size="small" />}
                    {book.tags.slice(0, 2).map((tag) => <Chip key={tag} label={tag} size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' }, bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508' }} />)}
                  </Box>
                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: { xs: 0.6, sm: 1.5 }, borderTop: '1px solid rgba(44,26,14,0.07)' }}>
                    <Typography sx={{ color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 9, sm: 13 } }}>
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
    </Box>
  )
}
