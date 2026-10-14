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
  category?: string | null
  tags: string[]
  cover?: string | null
  coverCrop?: Parameters<typeof thumbnailCropCss>[0]
  chapterCount: number
  premiumExempt: boolean
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

export default function BooksLibrary({ books, audioBookIds }: { books: LibraryBook[]; audioBookIds: string[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [level, setLevel] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [audioOnly, setAudioOnly] = useState(false)
  const [premiumOnly, setPremiumOnly] = useState(false)
  const audioIds = useMemo(() => new Set(audioBookIds), [audioBookIds])

  /* Genre = the book's category; deduped case-insensitively ("Young Adult"
     vs "Young Adults" style duplicates collapse to one chip). */
  const allCategories = useMemo(() => {
    const byKey = new Map<string, string>()
    for (const book of books) {
      const category = book.category?.trim()
      if (category && !byKey.has(category.toLowerCase())) byKey.set(category.toLowerCase(), category)
    }
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [books])

  const toggleCategory = (category: string) =>
    setCategories((current) => (current.some((c) => c.toLowerCase() === category.toLowerCase()) ? current.filter((c) => c.toLowerCase() !== category.toLowerCase()) : [...current, category]))

  const visible = books.filter((book) => {
    if (level && book.level !== level) return false
    if (categories.length > 0 && !book.category) return false
    if (categories.length > 0 && !categories.some((c) => c.toLowerCase() === book.category!.toLowerCase())) return false
    if (audioOnly && !audioIds.has(book.id)) return false
    if (premiumOnly && book.premiumExempt) return false
    return true
  })

  const activeFilterCount = (level ? 1 : 0) + categories.length + (audioOnly ? 1 : 0) + (premiumOnly ? 1 : 0)

  /* Grey out options that would produce zero results (given the other
     active filters), so the empty state is unreachable through the UI. */
  const comboHasResults = (candidateLevel: string, candidateCategories: string[], wantAudio = audioOnly, wantPremium = premiumOnly) =>
    books.some((book) =>
      (!candidateLevel || book.level === candidateLevel) &&
      (candidateCategories.length === 0 || Boolean(book.category && candidateCategories.some((c) => c.toLowerCase() === book.category!.toLowerCase()))) &&
      (!wantAudio || audioIds.has(book.id)) &&
      (!wantPremium || !book.premiumExempt))
  const disabledLevels = LEVELS.filter((option) => !comboHasResults(option, categories) && level !== option)
  const disabledCategories = allCategories.filter((category) =>
    !comboHasResults(level, [...categories.filter((c) => c.toLowerCase() !== category.toLowerCase()), category]))
  const audioDisabled = !comboHasResults(level, categories, true, premiumOnly) && !audioOnly
  const premiumDisabled = !comboHasResults(level, categories, audioOnly, true) && !premiumOnly

  const disabledSx = {
    color: 'color-mix(in srgb, var(--awm-muted) 55%, transparent)',
    backgroundColor: 'transparent',
    border: '1px solid rgba(44,26,14,0.06)',
    cursor: 'not-allowed',
  }

  return (
    <Box>
      {/* Header row: title + filters, aligned */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: { xs: 2, sm: 3 } }}>
        <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 24, md: 36 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
          Library
        </Typography>
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
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
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
              <Button
                className={level === '' ? 'Mui-selected' : ''}
                disabled={!comboHasResults('', categories) && level !== ''}
                onClick={() => setLevel('')}
                sx={FILTER_BUTTON_SX}
              >
                All
              </Button>
              {LEVELS.map((option) => (
                <Button
                  key={option}
                  className={level === option ? 'Mui-selected' : ''}
                  disabled={disabledLevels.includes(option)}
                  onClick={() => setLevel(level === option ? '' : option)}
                  sx={{ ...FILTER_BUTTON_SX, '&:disabled': disabledSx }}
                >
                  {option}
                </Button>
              ))}
            </Box>
          </Box>
          {allCategories.length > 0 && (
            <Box>
              <SectionLabel>Genre</SectionLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {allCategories.map((tag) => {
                  const active = categories.some((c) => c.toLowerCase() === tag.toLowerCase())
                  return (
                    <Chip
                      key={tag}
                      label={tag}
                      clickable
                      disabled={disabledCategories.includes(tag)}
                      onClick={() => toggleCategory(tag)}
                      sx={{
                        borderRadius: '6px',
                        fontFamily: 'var(--font-sans), sans-serif',
                        fontWeight: 600,
                        fontSize: 12,
                        bgcolor: active ? 'var(--awm-gold)' : 'var(--awm-cream-light)',
                        color: active ? '#fff' : 'var(--awm-muted)',
                        border: `1px solid ${active ? 'var(--awm-gold)' : 'rgba(44,26,14,0.1)'}`,
                        '&:hover': { bgcolor: active ? 'var(--awm-gold)' : 'rgba(184,134,11,0.06)' },
                        '&.Mui-disabled': disabledSx,
                      }}
                    />
                  )
                })}
              </Box>
            </Box>
          )}
          <Box>
            <SectionLabel>More</SectionLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              <Chip
                label="Has audiobook"
                clickable
                disabled={audioDisabled}
                onClick={() => setAudioOnly((v) => !v)}
                sx={{
                  borderRadius: '6px',
                  fontFamily: 'var(--font-sans), sans-serif',
                  fontWeight: 600,
                  fontSize: 12,
                  bgcolor: audioOnly ? 'var(--awm-gold)' : 'var(--awm-cream-light)',
                  color: audioOnly ? '#fff' : 'var(--awm-muted)',
                  border: `1px solid ${audioOnly ? 'var(--awm-gold)' : 'rgba(44,26,14,0.1)'}`,
                  '&:hover': { bgcolor: audioOnly ? 'var(--awm-gold)' : 'rgba(184,134,11,0.06)' },
                  '&.Mui-disabled': disabledSx,
                }}
              />
              <Chip
                label="AWM+ exclusive"
                clickable
                disabled={premiumDisabled}
                onClick={() => setPremiumOnly((v) => !v)}
                sx={{
                  borderRadius: '6px',
                  fontFamily: 'var(--font-sans), sans-serif',
                  fontWeight: 600,
                  fontSize: 12,
                  bgcolor: premiumOnly ? 'var(--awm-gold)' : 'var(--awm-cream-light)',
                  color: premiumOnly ? '#fff' : 'var(--awm-muted)',
                  border: `1px solid ${premiumOnly ? 'var(--awm-gold)' : 'rgba(44,26,14,0.1)'}`,
                  '&:hover': { bgcolor: premiumOnly ? 'var(--awm-gold)' : 'rgba(184,134,11,0.06)' },
                  '&.Mui-disabled': disabledSx,
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2.5, py: 1.75 }}>
          <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: 'var(--awm-muted)' }}>
            {visible.length} of {books.length} books
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => { setLevel(''); setCategories([]); setAudioOnly(false); setPremiumOnly(false) }}
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
    </Box>
  )
}
