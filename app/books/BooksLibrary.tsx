'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Typography } from '@mui/material'
import { AutoStories, ChevronRight, Close, Tune } from '@mui/icons-material'
import CefrChip from '@/app/components/CefrChip'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

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

const FILTER_BUTTON_SX = {
  height: 36,
  borderRadius: '6px',
  fontFamily: 'var(--font-sans), sans-serif',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'none' as const,
  color: 'var(--awm-muted)',
  backgroundColor: 'var(--awm-cream-light)',
  border: '1px solid rgba(44,26,14,0.1)',
  '&:hover': { backgroundColor: 'rgba(184,134,11,0.04)' },
  '&.Mui-selected': { color: '#fff', bgcolor: 'var(--awm-gold)', border: '1px solid var(--awm-gold)' },
  '&.Mui-selected:hover': { bgcolor: 'var(--awm-gold)' },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--awm-gold)', mb: 1.25 }}>
      {children}
    </Typography>
  )
}

export default function BooksLibrary({ books }: { books: LibraryBook[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [level, setLevel] = useState('')
  const [genres, setGenres] = useState<string[]>([])

  const allGenres = useMemo(
    () => Array.from(new Set(books.flatMap((book) => book.tags))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [books],
  )

  const toggleGenre = (tag: string) =>
    setGenres((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]))

  const visible = books.filter((book) => {
    if (level && book.level !== level) return false
    if (genres.length > 0 && !book.tags.some((tag) => genres.includes(tag))) return false
    return true
  })

  const activeFilterCount = (level ? 1 : 0) + genres.length

  return (
    <Box>
      {/* Configure row */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: { xs: 2, sm: 3 } }}>
        <Button
          onClick={() => setDialogOpen(true)}
          startIcon={<Tune sx={{ fontSize: 18 }} />}
          sx={{
            minHeight: 40,
            px: 2,
            borderRadius: '8px',
            color: 'var(--awm-bark)',
            border: '1px solid color-mix(in srgb, var(--awm-bark) 16%, transparent)',
            backgroundColor: 'var(--awm-white)',
            textTransform: 'none',
            fontFamily: 'var(--font-sans), sans-serif',
            fontWeight: 600,
            fontSize: 13.5,
            '&:hover': { backgroundColor: 'color-mix(in srgb, var(--awm-gold) 6%, var(--awm-white))', borderColor: 'color-mix(in srgb, var(--awm-gold) 40%, transparent)' },
          }}
        >
          Configure{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Button>
      </Box>

      {/* Filter dialog — same pattern as the /cartoons filters */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '16px', backgroundImage: 'none' } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--awm-bark)', pb: 1 }}>
          Filters
          <IconButton onClick={() => setDialogOpen(false)} aria-label="Close filters" sx={{ color: 'var(--awm-muted)' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'color-mix(in srgb, var(--awm-gold) 18%, transparent)' }}>
          <Box sx={{ mb: 3 }}>
            <SectionLabel>Difficulty</SectionLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
              <Button className={level === '' ? 'Mui-selected' : ''} onClick={() => setLevel('')} sx={FILTER_BUTTON_SX}>All</Button>
              {LEVELS.map((option) => (
                <Button key={option} className={level === option ? 'Mui-selected' : ''} onClick={() => setLevel(level === option ? '' : option)} sx={FILTER_BUTTON_SX}>
                  {option}
                </Button>
              ))}
            </Box>
          </Box>
          {allGenres.length > 0 && (
            <Box>
              <SectionLabel>Genre</SectionLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {allGenres.map((tag) => {
                  const active = genres.includes(tag)
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      clickable
                      onClick={() => toggleGenre(tag)}
                      sx={{
                        borderRadius: '6px',
                        fontFamily: 'var(--font-sans), sans-serif',
                        fontWeight: 600,
                        fontSize: 12,
                        bgcolor: active ? 'var(--awm-gold)' : 'var(--awm-cream-light)',
                        color: active ? '#fff' : 'var(--awm-muted)',
                        border: `1px solid ${active ? 'var(--awm-gold)' : 'rgba(44,26,14,0.1)'}`,
                        '&:hover': { bgcolor: active ? 'var(--awm-gold)' : 'rgba(184,134,11,0.06)' },
                      }}
                    />
                  )
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2.5, py: 1.75 }}>
          <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: 'var(--awm-muted)' }}>
            {visible.length} of {books.length} books
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => { setLevel(''); setGenres([]) }}
              disabled={activeFilterCount === 0}
              sx={{ color: 'var(--awm-muted)', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 600 }}
            >
              Clear all
            </Button>
            <Button
              onClick={() => setDialogOpen(false)}
              variant="contained"
              sx={{ bgcolor: 'var(--awm-forest)', color: '#fff', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 700, borderRadius: '8px', px: 2.5, '&:hover': { bgcolor: '#174832' } }}
            >
              Done
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {visible.length === 0 ? (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px solid rgba(44,26,14,0.08)', bgcolor: 'var(--awm-white)' }}>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 24, color: 'var(--awm-bark)' }}>No books match these filters</Typography>
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
