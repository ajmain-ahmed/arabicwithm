'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LibraryBookCard, { LIBRARY_GRID_SX } from '@/app/books/LibraryBookCard'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { Close, Tune } from '@mui/icons-material'
import { thumbnailCropCss } from '@/app/lib/thumbnailCrop'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export interface LibraryBook {
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
    <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--awm-gold)', mb: 1.75 }}>
      {children}
    </Typography>
  )
}

export default function BooksLibrary({ books, audioBookIds }: { books: LibraryBook[]; audioBookIds: string[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode') === 'listen' ? 'listen' : 'read'
  const setMode = (value: string) => { const query = new URLSearchParams(searchParams.toString()); if (value === 'listen') query.set('mode', value); else query.delete('mode'); router.replace(`/books${query.size ? `?${query}` : ''}`, { scroll: false }) }
  const [dialogOpen, setDialogOpen] = useState(false)
  const [level, setLevel] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [audioOnly, setAudioOnly] = useState(false)
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
    if ((audioOnly || mode === 'listen') && !audioIds.has(book.id)) return false
    return true
  })

  const activeFilterCount = (level ? 1 : 0) + categories.length + (audioOnly ? 1 : 0)

  // Use canonical categories and tags already supplied by the library.
  // Books without either remain discoverable in their own fallback section.
  const discoverySections = new Map<string, { title: string; books: LibraryBook[] }>()
  for (const book of visible) {
    const labels = [...new Set([book.category, ...book.tags].map(value => value?.trim()).filter((value): value is string => Boolean(value)))]
    for (const label of labels.length ? labels : ['More books']) {
      const key = label.toLocaleLowerCase()
      const section = discoverySections.get(key) ?? { title: label, books: [] }
      if (!section.books.some(existing => existing.id === book.id)) section.books.push(book)
      discoverySections.set(key, section)
    }
  }

  /* Grey out options that would produce zero results (given the other
     active filters), so the empty state is unreachable through the UI. */
  const comboHasResults = (candidateLevel: string, candidateCategories: string[], flags: { audio?: boolean } = { audio: audioOnly || mode === 'listen' }) =>
    books.some((book) =>
      (!candidateLevel || book.level === candidateLevel) &&
      (candidateCategories.length === 0 || Boolean(book.category && candidateCategories.some((c) => c.toLowerCase() === book.category!.toLowerCase()))) &&
      (!flags.audio || audioIds.has(book.id)))
  const disabledLevels = LEVELS.filter((option) => !comboHasResults(option, categories) && level !== option)
  const disabledCategories = allCategories.filter((category) =>
    !comboHasResults(level, [...categories.filter((c) => c.toLowerCase() !== category.toLowerCase()), category]))
  const audioDisabled = !comboHasResults(level, categories, { audio: true }) && !audioOnly

  const disabledSx = {
    color: 'color-mix(in srgb, var(--awm-muted) 55%, transparent)',
    backgroundColor: 'transparent',
    border: '1px solid rgba(44,26,14,0.06)',
    cursor: 'not-allowed',
  }

  return (
    <Box>
      {/* Header row: title + filters, aligned */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: { xs: 2, sm: 3 } }}>
        <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 24, md: 36 }, fontWeight: 600, color: 'var(--awm-bark)' }}>
          Library
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
        <ToggleButtonGroup exclusive value={mode} onChange={(_, value) => { if (value) setMode(value) }} aria-label="Library mode" sx={{ bgcolor: 'var(--awm-white)', borderRadius: '999px', p: .5, '& .MuiToggleButton-root': { border: 0, borderRadius: '999px !important', px: { xs: 2.25, sm: 3 }, minHeight: 44, textTransform: 'none', color: 'var(--awm-muted)' }, '& .Mui-selected': { bgcolor: 'var(--awm-forest) !important', color: 'var(--awm-white) !important' } }}>
          <ToggleButton value="read">Read</ToggleButton><ToggleButton value="listen">Listen</ToggleButton>
        </ToggleButtonGroup>
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
        <DialogContent dividers sx={{ borderColor: 'color-mix(in srgb, var(--awm-gold) 18%, transparent)', py: 3 }}>
          <Box sx={{ mb: 4 }}>
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
            <Box sx={{ mb: 4 }}>
              <SectionLabel>Genre</SectionLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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

            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2.5, py: 1.75 }}>
          <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: 'var(--awm-muted)' }}>
            {visible.length} of {books.length} books
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => { setLevel(''); setCategories([]); setAudioOnly(false) }}
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

      {mode === 'read' && <Box data-mobile-read-sections sx={{ display: { xs: 'block', sm: 'none' } }}>
        {[...discoverySections.entries()].map(([key, section]) => <Box component="section" aria-label={section.title} key={key} sx={{ mb: 3 }}>
          <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 23, color: 'var(--awm-bark)', mb: 1 }}>{section.title}</Typography>
          <Box data-mobile-book-grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25, '@media (max-width: 299px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } }}>
            {section.books.map(book => <LibraryBookCard key={book.id} book={book} compact />)}
          </Box>
        </Box>)}
        {!visible.length && <Typography>No books match these filters.</Typography>}
      </Box>}
      <Box component="section" aria-label={mode === 'listen' ? 'Audiobook library' : 'Book library'} sx={{ ...LIBRARY_GRID_SX, ...(mode === 'read' ? { display: { xs: 'none', sm: 'grid' } } : {}) }}>
        {visible.map(book => <LibraryBookCard key={book.id} book={book} listen={mode === 'listen'} />)}
        {!visible.length && <Typography>{mode === 'listen' ? 'No audiobooks match these filters.' : 'No books match these filters.'}</Typography>}
      </Box>
    </Box>
  )
}
