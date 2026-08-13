'use client'

import {
  ArrowBack,
  CheckCircleOutlined,
  FavoriteBorder,
  Replay,
  VisibilityOutlined,
} from '@mui/icons-material'
import { Alert, Box, Button, Chip, Container, LinearProgress, Paper, Snackbar, Typography } from '@mui/material'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { markPracticeWordsSelected, ratePracticeWord } from '@/app/actions/practice'
import { formatCefr, formatPos } from '@/app/lib/display'
import type { PracticeRating, PracticeWord } from '@/app/lib/practice'

const RATINGS: Array<{ value: PracticeRating; label: string; color: string }> = [
  { value: 'very_easy', label: 'Very Easy', color: '#2d6a4f' },
  { value: 'easy', label: 'Easy', color: '#5c8a6f' },
  { value: 'medium', label: 'Medium', color: '#b8860b' },
  { value: 'hard', label: 'Hard', color: '#a34b45' },
]

function AccountRequired() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 7, md: 11 } }}>
      <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '14px' }}>
        <FavoriteBorder sx={{ color: '#b8860b', fontSize: 46 }} />
        <Typography component="h1" sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 38, color: '#2c1a0e', fontWeight: 700, mt: 1 }}>Sign in to practise</Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#7a6e65', mt: 1, mb: 3 }}>Your saved vocabulary and progress belong to your profile.</Typography>
        <Button variant="contained" onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'register' } }))} sx={{ bgcolor: '#b8860b', textTransform: 'none', '&:hover': { bgcolor: '#966d09' } }}>Create an Account</Button>
      </Paper>
    </Container>
  )
}

export default function PracticeSession({ authenticated, words }: { authenticated: boolean; words: PracticeWord[] }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const marked = useRef(false)

  useEffect(() => {
    if (!authenticated || !words.length || marked.current) return
    marked.current = true
    void markPracticeWordsSelected(words.map((word) => word.id)).catch(() => setError('Your session started, but its selection history could not be saved.'))
  }, [authenticated, words])

  if (!authenticated) return <AccountRequired />

  if (!words.length) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 7, md: 11 } }}>
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px solid rgba(44,26,14,0.09)', borderRadius: '14px' }}>
          <Typography component="h1" sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 38, color: '#2c1a0e', fontWeight: 700 }}>Save a word first</Typography>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#7a6e65', mt: 1, mb: 3 }}>Use the heart in any Arabic word tooltip, then return here to practise it.</Typography>
          <Button component={Link} href="/practice" variant="outlined" sx={{ color: '#0e2e1f', borderColor: '#b8860b', textTransform: 'none' }}>Back to Practice</Button>
        </Paper>
      </Container>
    )
  }

  if (finished) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 7, md: 11 } }}>
        <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '14px' }}>
          <CheckCircleOutlined sx={{ color: '#2d6a4f', fontSize: 56 }} />
          <Typography component="h1" sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 42, color: '#2c1a0e', fontWeight: 700, mt: 1 }}>Practice complete</Typography>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#7a6e65', mt: 1 }}>You reviewed {words.length} {words.length === 1 ? 'word' : 'words'}. Your ratings will shape the next selection.</Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', gap: 1.5, mt: 4 }}>
            <Button component={Link} href="/practice" variant="outlined" startIcon={<ArrowBack />} sx={{ color: '#0e2e1f', borderColor: '#b8860b', textTransform: 'none' }}>Practice Library</Button>
            <Button component={Link} href={`/practice/session?count=${words.length}`} variant="contained" startIcon={<Replay />} sx={{ bgcolor: '#b8860b', textTransform: 'none', '&:hover': { bgcolor: '#966d09' } }}>Another Set</Button>
          </Box>
        </Paper>
      </Container>
    )
  }

  const word = words[index]
  const rate = async (rating: PracticeRating) => {
    setSaving(true)
    try {
      await ratePracticeWord(word.id, rating)
      if (index >= words.length - 1) setFinished(true)
      else {
        setIndex((current) => current + 1)
        setRevealed(false)
      }
    } catch {
      setError('Your rating could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 120px)', bgcolor: '#faf7f2', py: { xs: 4, md: 7 } }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Button component={Link} href="/practice" startIcon={<ArrowBack />} sx={{ color: '#7a6e65', textTransform: 'none' }}>Leave session</Button>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#7a6e65', fontSize: 13 }}>{index + 1} of {words.length}</Typography>
        </Box>
        <LinearProgress variant="determinate" value={(index / words.length) * 100} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(184,134,11,0.12)', '& .MuiLinearProgress-bar': { bgcolor: '#b8860b' } }} />

        <Paper elevation={0} sx={{ mt: 3, minHeight: { xs: 430, md: 500 }, p: { xs: 3, md: 6 }, border: '1px solid rgba(44,26,14,0.1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', bgcolor: '#fff' }}>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#9e8a7a', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{revealed ? 'Answer' : 'What does this mean?'}</Typography>
          <Typography lang="ar" dir="rtl" sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: { xs: 54, md: 72 }, color: '#2c1a0e', fontWeight: 700, lineHeight: 1.25, mt: 2 }}>{word.arabic}</Typography>

          {!revealed ? (
            <Button variant="contained" startIcon={<VisibilityOutlined />} onClick={() => setRevealed(true)} sx={{ alignSelf: 'center', mt: 5, bgcolor: '#0e2e1f', px: 4, py: 1.25, borderRadius: '9999px', textTransform: 'none', '&:hover': { bgcolor: '#174a33' } }}>Reveal Answer</Button>
          ) : (
            <Box sx={{ mt: 3 }}>
              {word.transliteration && <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#9e8a7a', fontSize: 16, fontStyle: 'italic' }}>{word.transliteration}</Typography>}
              <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', color: '#2c1a0e', fontSize: { xs: 28, md: 34 }, mt: 1 }}>{word.english || 'Definition unavailable'}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                {word.pos && <Chip label={formatPos(word.pos)} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.12)', color: '#966d09' }} />}
                {word.cefr && <Chip label={formatCefr(word.cefr)} size="small" variant="outlined" />}
              </Box>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', color: '#7a6e65', fontSize: 13, mt: 4, mb: 1.5 }}>How well did you know it?</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
                {RATINGS.map((rating) => (
                  <Button key={rating.value} disabled={saving} onClick={() => void rate(rating.value)} variant="outlined" sx={{ borderColor: rating.color, color: rating.color, fontFamily: 'Jost, sans-serif', textTransform: 'none', '&:hover': { borderColor: rating.color, bgcolor: `${rating.color}0d` } }}>{rating.label}</Button>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}><Alert severity="warning" onClose={() => setError('')}>{error}</Alert></Snackbar>
    </Box>
  )
}
