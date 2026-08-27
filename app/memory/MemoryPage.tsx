'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowBack,
  ArrowForward,
  CheckCircleOutlined,
  PlayCircleOutlineRounded,
  PsychologyOutlined,
  Refresh,
  VisibilityOutlined,
} from '@mui/icons-material'
import { Alert, Autocomplete, Box, Button, Chip, Container, LinearProgress, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { recordMemoryReview, type MemoryLibrary, type MemoryShowSource } from '@/app/actions/memory'
import { useAuth } from '@/app/AuthContext'
import type { MemoryDirection, MemoryRating } from '@/app/lib/memory'

const DIRECTION_KEY = 'awm-memory-direction-v1'
const DIRECTION_EVENT = 'awm-memory-direction-change'

function getDirectionSnapshot(): MemoryDirection {
  try {
    return window.localStorage.getItem(DIRECTION_KEY) === 'arabic' ? 'arabic' : 'english'
  } catch {
    return 'english'
  }
}

function subscribeToDirection(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => { if (event.key === DIRECTION_KEY) onChange() }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(DIRECTION_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(DIRECTION_EVENT, onChange)
  }
}

export default function MemoryPage({ library, loadError }: { library: MemoryLibrary; loadError?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const direction = useSyncExternalStore(subscribeToDirection, getDirectionSnapshot, () => 'english')
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [sessionXp, setSessionXp] = useState(0)
  const [totalXp, setTotalXp] = useState(() => Math.max(0, Math.floor(Number(user?.user_metadata.memory_xp) || 0)))
  const reviewedRef = useRef(new Set<string>())
  const card = library.cards[index]

  const chooseDirection = (next: MemoryDirection) => {
    try { window.localStorage.setItem(DIRECTION_KEY, next) } catch { /* local persistence is optional */ }
    window.dispatchEvent(new Event(DIRECTION_EVENT))
  }

  const finishCard = useCallback(async (rating: MemoryRating) => {
    if (!card || !revealed) return
    setCompleted((value) => value + 1)
    if (!reviewedRef.current.has(card.id)) {
      reviewedRef.current.add(card.id)
      try {
        const result = await recordMemoryReview(card.id, rating)
        setSessionXp((value) => value + result.awarded)
        if (result.totalXp > 0) setTotalXp(result.totalXp)
      } catch {
        // Practice continues even if account progress cannot be saved.
      }
    }
    if (index >= library.cards.length - 1) {
      setIndex(library.cards.length)
      setRevealed(false)
      return
    }
    setIndex((value) => value + 1)
    setRevealed(false)
  }, [card, index, library.cards.length, revealed])

  useEffect(() => {
    if (!started) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === ' ' || event.key.toLowerCase() === 'r') && !revealed) {
        event.preventDefault()
        setRevealed(true)
      } else if (revealed && event.key === '1') {
        void finishCard('again')
      } else if (revealed && (event.key === '2' || event.key === 'ArrowRight')) {
        void finishCard('known')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finishCard, revealed, started])

  const selectedShow = useMemo(() => library.shows.find((show) => show.id === library.selectedShowId) ?? null, [library.selectedShowId, library.shows])
  const chooseShow = (_: unknown, show: MemoryShowSource | null) => {
    router.push(show ? `/memory?show=${encodeURIComponent(show.id)}` : '/memory')
  }
  const restart = () => {
    setStarted(true)
    setIndex(0)
    setRevealed(false)
    setCompleted(0)
    setSessionXp(0)
    reviewedRef.current.clear()
  }

  const empty = library.cards.length === 0
  const complete = started && index >= library.cards.length
  const prompt = card ? (direction === 'english' ? card.arabic : card.english) : ''
  const answer = card ? (direction === 'english' ? card.english : card.arabic) : ''
  const promptIsArabic = direction === 'english'

  return (
    <Box component="main" sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: 'var(--awm-cream-light)', pb: { xs: 4, md: 8 } }}>
      <Container maxWidth="md" sx={{ pt: { xs: 2.5, md: 5 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: '12px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 13%, transparent)', color: 'var(--awm-gold)' }}><PsychologyOutlined /></Box>
          <Box>
            <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 44 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.05 }}>Memory</Typography>
            <Typography sx={{ mt: 0.25, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 13, md: 15 } }}>Recall useful phrases from real show transcripts.</Typography>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ mt: 3, p: { xs: 2, sm: 2.5 }, border: '1px solid color-mix(in srgb, var(--awm-bark) 11%, transparent)', borderRadius: '14px', bgcolor: 'var(--awm-white)' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) auto' }, alignItems: 'center', gap: 1.5 }}>
            <Autocomplete
              options={library.shows}
              value={selectedShow}
              onChange={chooseShow}
              getOptionLabel={(option) => option.title}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} size="small" label="Search or choose a show" />}
            />
            <Button onClick={() => router.push('/memory')} startIcon={<Refresh />} variant={library.scope === 'global' ? 'contained' : 'outlined'} sx={{ minHeight: 40, bgcolor: library.scope === 'global' ? 'var(--awm-forest)' : undefined, color: library.scope === 'global' ? '#fff' : 'var(--awm-forest)', borderRadius: '9px', textTransform: 'none', '&:hover': { bgcolor: library.scope === 'global' ? '#174832' : 'color-mix(in srgb, var(--awm-forest) 7%, transparent)' } }}>Random practice</Button>
          </Box>
          <Box sx={{ mt: 1.75, display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 1.5 }}>
            <ToggleButtonGroup exclusive size="small" value={direction} onChange={(_, value: MemoryDirection | null) => value && chooseDirection(value)} aria-label="Practice direction" sx={{ '& .MuiToggleButton-root': { minHeight: 40, flex: { xs: 1, sm: 'initial' }, px: 2, borderColor: 'color-mix(in srgb, var(--awm-bark) 16%, transparent)', color: 'var(--awm-muted)', textTransform: 'none', '&.Mui-selected': { bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)', color: 'var(--awm-bark)', fontWeight: 700 } } }}>
              <ToggleButton value="english">Practice English</ToggleButton>
              <ToggleButton value="arabic">Practice Arabic</ToggleButton>
            </ToggleButtonGroup>
            <Typography sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12 }}>{library.scopeTitle} · {library.cards.length} cards</Typography>
          </Box>
        </Paper>

        {loadError && <Alert severity="error" sx={{ mt: 2.5 }}>{loadError}</Alert>}
        {library.missingScope && <Alert severity="warning" sx={{ mt: 2.5 }}>That source is no longer available. Choose a show or switch to Random practice.</Alert>}

        {empty ? (
          <Paper elevation={0} sx={{ mt: 3, p: { xs: 4, md: 6 }, textAlign: 'center', borderRadius: '16px', border: '1px solid color-mix(in srgb, var(--awm-gold) 24%, transparent)', bgcolor: 'var(--awm-white)' }}>
            <PsychologyOutlined sx={{ fontSize: 52, color: 'var(--awm-gold)' }} />
            <Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 600, color: 'var(--awm-bark)' }}>No usable transcript cards here yet</Typography>
            <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>Memory needs a transcript segment with both Arabic and English.</Typography>
            <Button component={Link} href="/memory" variant="contained" sx={{ mt: 2.5, bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '9999px', textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}>Try Random practice</Button>
          </Paper>
        ) : !started ? (
          <Paper elevation={0} sx={{ mt: 3, minHeight: { xs: 330, md: 390 }, p: { xs: 3, md: 5 }, display: 'grid', placeItems: 'center', textAlign: 'center', borderRadius: '18px', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)', bgcolor: 'var(--awm-white)', boxShadow: '0 18px 50px color-mix(in srgb, var(--awm-bark) 9%, transparent)' }}>
            <Box><Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase' }}>{library.scopeTitle}</Typography><Typography sx={{ mt: 1.25, fontFamily: 'var(--font-heading)', fontSize: { xs: 31, md: 39 }, fontWeight: 600, color: 'var(--awm-bark)' }}>Ready to remember?</Typography><Typography sx={{ mt: 1, maxWidth: 520, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.65 }}>Read the prompt, say the translation aloud or in your head, then reveal the answer.</Typography><Button onClick={restart} variant="contained" startIcon={<PlayCircleOutlineRounded />} sx={{ mt: 3, minHeight: 48, px: 4, bgcolor: 'var(--awm-gold)', color: '#fff', borderRadius: '9999px', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#946c08' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', outlineOffset: 3 } }}>Start</Button></Box>
          </Paper>
        ) : complete ? (
          <Paper elevation={0} sx={{ mt: 3, p: { xs: 4, md: 6 }, textAlign: 'center', borderRadius: '18px', bgcolor: 'var(--awm-white)', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)' }}>
            <CheckCircleOutlined sx={{ color: 'var(--awm-gold)', fontSize: 58 }} /><Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 600, color: 'var(--awm-bark)' }}>Deck complete</Typography><Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>{completed} cards completed{user ? ` · ${sessionXp} XP earned` : ''}</Typography><Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1.25, flexWrap: 'wrap' }}><Button onClick={restart} startIcon={<Refresh />} variant="contained" sx={{ bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '9999px', textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}>Practise again</Button><Button component={Link} href="/memory" variant="outlined" sx={{ borderColor: 'var(--awm-gold)', color: 'var(--awm-bark)', borderRadius: '9999px', textTransform: 'none' }}>New random deck</Button></Box>
          </Paper>
        ) : card && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}><Typography sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12 }}>Card {index + 1} of {library.cards.length}</Typography><Box sx={{ display: 'flex', gap: 0.75 }}>{user && <Chip size="small" label={`${sessionXp} session XP · ${totalXp} total`} sx={{ bgcolor: 'color-mix(in srgb, var(--awm-gold) 12%, transparent)', color: 'var(--awm-bark)', fontWeight: 700 }} />}</Box></Box>
            <LinearProgress variant="determinate" value={(index / library.cards.length) * 100} sx={{ mb: 1.5, height: 6, borderRadius: 99, bgcolor: 'color-mix(in srgb, var(--awm-bark) 8%, transparent)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--awm-gold)', borderRadius: 99 } }} />
            <Paper elevation={0} aria-live="polite" sx={{ minHeight: { xs: 360, md: 430 }, p: { xs: 3, sm: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '18px', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)', bgcolor: 'var(--awm-white)', boxShadow: '0 18px 50px color-mix(in srgb, var(--awm-bark) 10%, transparent)' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>{promptIsArabic ? 'Translate into English' : 'Translate into Arabic'}</Typography>
                <Typography lang={promptIsArabic ? 'ar' : 'en'} dir={promptIsArabic ? 'rtl' : 'ltr'} sx={{ mt: 3, fontFamily: promptIsArabic ? 'var(--font-book-naskh), serif' : 'var(--font-heading)', fontSize: { xs: promptIsArabic ? 31 : 27, md: promptIsArabic ? 42 : 35 }, fontWeight: 600, lineHeight: 1.55, color: 'var(--awm-bark)' }}>{prompt}</Typography>
                {revealed && <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)' }}><Typography sx={{ color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Answer</Typography><Typography lang={promptIsArabic ? 'en' : 'ar'} dir={promptIsArabic ? 'ltr' : 'rtl'} sx={{ mt: 1.25, fontFamily: promptIsArabic ? 'var(--font-heading)' : 'var(--font-book-naskh), serif', fontSize: { xs: promptIsArabic ? 24 : 29, md: promptIsArabic ? 30 : 38 }, fontWeight: 600, lineHeight: 1.55, color: 'var(--awm-forest)' }}>{answer}</Typography></Box>}
              </Box>
              <Box sx={{ mt: 4 }}>
                <Typography sx={{ mb: 1.5, textAlign: 'center', color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 11 }}>{card.showTitle} · {card.episodeTitle}</Typography>
                {!revealed ? <Button onClick={() => setRevealed(true)} fullWidth variant="contained" startIcon={<VisibilityOutlined />} sx={{ minHeight: 49, bgcolor: 'var(--awm-gold)', color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#946c08' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', outlineOffset: 3 } }}>Reveal</Button> : <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1.25 }}><Button onClick={() => void finishCard('again')} variant="outlined" sx={{ minHeight: 48, color: 'var(--awm-bark)', borderColor: 'color-mix(in srgb, var(--awm-bark) 25%, transparent)', borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>Didn&apos;t know</Button><Button onClick={() => void finishCard('known')} variant="contained" endIcon={<ArrowForward />} sx={{ minHeight: 48, bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#174832' } }}>Knew it</Button></Box>}
                <Button component={Link} href={`/cartoons/${encodeURIComponent(card.showSlug)}/${encodeURIComponent(card.episodeSlug)}`} startIcon={<PlayCircleOutlineRounded />} size="small" sx={{ display: 'flex', mx: 'auto', mt: 1.25, color: 'var(--awm-muted)', textTransform: 'none' }}>View source episode</Button>
              </Box>
            </Paper>
            <Button onClick={() => { if (index >= library.cards.length - 1) setIndex(library.cards.length); else setIndex((value) => value + 1); setRevealed(false) }} startIcon={<ArrowBack sx={{ transform: 'rotate(180deg)' }} />} sx={{ mt: 1, color: 'var(--awm-muted)', textTransform: 'none' }}>Skip</Button>
          </Box>
        )}
      </Container>
    </Box>
  )
}
