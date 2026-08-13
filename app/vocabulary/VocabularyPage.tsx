'use client'

import { useEffect, useState, useTransition } from 'react'
import { Box, Chip, CircularProgress, Container, InputAdornment, Paper, TextField, Typography } from '@mui/material'
import { MenuBook, Search } from '@mui/icons-material'
import { searchVocabulary, type VocabularyEntry } from '@/app/actions/vocabulary'

export default function VocabularyPage({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<VocabularyEntry[]>([])
  const [searched, setSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          setResults(await searchVocabulary(trimmed))
          setSearched(true)
        } catch {
          setResults([])
          setSearched(true)
        }
      })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [query])

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: '#faf7f2', pb: { xs: 6, md: 10 } }}>
      <Box sx={{ mt: { xs: '-56px', md: '-64px' }, pt: { xs: 14, md: 17 }, pb: { xs: 7, md: 9 }, px: 2, bgcolor: '#0e2e1f', color: '#fff' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography sx={{ color: '#d4a843', fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Hans Wehr dictionary</Typography>
          <Typography component="h1" sx={{ mt: 1, fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 39, md: 58 }, fontWeight: 700 }}>Arabic Vocabulary</Typography>
          <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.72)', fontFamily: 'Jost, sans-serif' }}>Search Arabic—with or without vowel marks—or search by an English meaning.</Typography>
          <TextField
            fullWidth
            autoComplete="off"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value
              setQuery(nextQuery)
              if (nextQuery.trim().length < 2) {
                setResults([])
                setSearched(false)
              }
            }}
            placeholder="Search Arabic or English…"
            slotProps={{
              htmlInput: { 'aria-label': 'Search Arabic or English vocabulary', dir: 'auto' },
              input: {
                startAdornment: <InputAdornment position="start"><Search sx={{ color: '#b8860b' }} /></InputAdornment>,
                endAdornment: isPending ? <InputAdornment position="end"><CircularProgress size={20} /></InputAdornment> : undefined,
              },
            }}
            sx={{ mt: 4, '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '12px', fontFamily: 'Jost, sans-serif', fontSize: { xs: 16, md: 18 }, minHeight: 58 } }}
          />
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 } }}>
        {!searched && !isPending ? (
          <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, border: '1px solid rgba(44,26,14,0.08)', borderRadius: '14px', textAlign: 'center' }}>
            <MenuBook sx={{ color: '#b8860b', fontSize: 42 }} />
            <Typography sx={{ mt: 1, fontFamily: '"EB Garamond", Georgia, serif', fontSize: 27, fontWeight: 700, color: '#2c1a0e' }}>Search the vocabulary library</Typography>
            <Typography sx={{ mt: 0.75, color: '#7a6e65', fontFamily: 'Jost, sans-serif' }}>Try “book”, “travel”, كِتَاب, or سفر.</Typography>
          </Paper>
        ) : searched && results.length === 0 && !isPending ? (
          <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, border: '1px dashed rgba(184,134,11,0.35)', borderRadius: '14px', textAlign: 'center' }}>
            <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 27, fontWeight: 700, color: '#2c1a0e' }}>We couldn&apos;t find that word.</Typography>
            <Typography sx={{ mt: 1, color: '#7a6e65', fontFamily: 'Jost, sans-serif' }}>Try another Arabic or English spelling, or use a shorter form of the word.</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            {results.map((entry) => (
              <Paper key={entry.id} elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid rgba(44,26,14,0.09)', borderRadius: '12px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                  <Typography lang="ar" dir="rtl" sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 34, lineHeight: 1.25, fontWeight: 700, color: '#2c1a0e' }}>{entry.arabic}</Typography>
                  <Chip size="small" label={entry.isRoot ? 'Root' : 'Word'} sx={{ bgcolor: entry.isRoot ? '#0e2e1f' : 'rgba(184,134,11,0.12)', color: entry.isRoot ? '#fff' : '#8b6508' }} />
                </Box>
                {entry.root && <Typography lang="ar" dir="rtl" sx={{ mt: 0.75, color: '#b8860b', fontFamily: '"EB Garamond", Georgia, serif', fontSize: 18, textAlign: 'left' }}>Root: {entry.root}</Typography>}
                {entry.transliteration && <Typography sx={{ mt: 0.5, color: '#9e8a7a', fontFamily: 'Jost, sans-serif', fontStyle: 'italic' }}>{entry.transliteration}</Typography>}
                <Typography sx={{ mt: 1.5, color: '#5f554d', fontFamily: 'Jost, sans-serif', lineHeight: 1.7 }}>{entry.english || 'Definition unavailable'}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  )
}
