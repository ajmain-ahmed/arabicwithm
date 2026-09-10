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
import PremiumPrompt from "@/app/components/PremiumPrompt"
import { MEMORY } from "@/app/lib/entitlements"
import { fetchMemoryProgress, fetchSavedMemorySession, saveMemorySession, type SavedMemorySession, recordMemoryReview, type MemoryLibrary, type MemoryShowSource } from '@/app/actions/memory'
import { useAuth } from '@/app/AuthContext'
import type { MemoryDirection, MemoryRating } from '@/app/lib/memory'

const DIRECTION_KEY = 'awm-memory-direction-v1'
const DIRECTION_EVENT = 'awm-memory-direction-change'

function getDirectionSnapshot(): MemoryDirection {
  try {
    return window.localStorage.getItem(DIRECTION_KEY) === 'english' ? 'english' : 'arabic'
  } catch {
    return 'arabic'
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

export default function MemoryPage(props: { library: MemoryLibrary; loadError?: string }) {
  const { user, loading } = useAuth()
  if (loading) return <Box role="status" sx={{ p: 4 }}><Typography>Loading your account...</Typography><LinearProgress sx={{ mt: 2 }} /></Box>
  return <MemorySession key={`${user?.id ?? 'guest'}:${props.library.selectedShowId ?? ''}:${props.library.selectedEpisodeId ?? ''}`} {...props} />
}

function MemorySession({ library, loadError }: { library: MemoryLibrary; loadError?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const direction = useSyncExternalStore<MemoryDirection>(subscribeToDirection, getDirectionSnapshot, () => 'arabic')
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [sessionXp, setSessionXp] = useState(0)
  const [totalXp, setTotalXp] = useState(0)
  const [cards, setCards] = useState(library.cards)
  const [saved, setSaved] = useState<SavedMemorySession | null>(null)
  const [completionIds, setCompletionIds] = useState<string[]>([])
  const [used, setUsed] = useState(0)
  const [premium, setPremium] = useState(false)
  const [ready, setReady] = useState(false)
  const [progressError, setProgressError] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [progressLoading, setProgressLoading] = useState(Boolean(user))
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const busyRef = useRef(false)
  const limited = !premium && used >= MEMORY.dailyFreeCards
  useEffect(() => {
    if (!user) return
    let active = true
    const load = () => {
      void fetchMemoryProgress().then(progress => {
        if (!active) return
        setUsed(progress.used); setPremium(progress.premium); setTotalXp(progress.totalXp); setReady(true); setProgressError('')
      }).catch(error => {
        if (active) { setReady(false); setProgressError(error instanceof Error ? error.message : 'Unable to load Memory progress.') }
      }).finally(() => { if (active) setProgressLoading(false) })
    }
    load()
    void fetchSavedMemorySession().then(session => { if (active) { setSaved(session); setSessionError('') } }).catch(error => { if (active) setSessionError(error instanceof Error ? error.message : 'Unable to load your saved session.') })
    const refresh = () => { if (document.visibilityState === 'visible') load() }
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [user, loadAttempt])
  const retryProgress = () => { setProgressLoading(true); setProgressError(''); setSessionError(''); setLoadAttempt(value => value + 1) }
  const card = cards[index]

  const chooseDirection = (next: MemoryDirection) => {
    try { window.localStorage.setItem(DIRECTION_KEY, next) } catch { /* local persistence is optional */ }
    window.dispatchEvent(new Event(DIRECTION_EVENT))
  }

  const finishCard = useCallback(async (rating: MemoryRating) => {
    if (!card || !revealed || busyRef.current || limited || !user || !ready) return
    busyRef.current = true; setSaving(true); setSaveError('')
    try {
      const result = await recordMemoryReview(card.id, rating, completionIds[index], { cards, index: index + 1, completed: completed + 1, sessionXp, direction, completionIds })
      setUsed(result.used)
      if (!result.accepted) { setUpgrade(true); return }
      setSessionXp(value => value + result.awarded); setTotalXp(value => value + result.awarded)
      setCompleted(value => value + 1); setIndex(value => value + 1); setRevealed(false)
      if (!premium && result.used >= MEMORY.dailyFreeCards) setUpgrade(true)
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Unable to save. Please retry this card.') }
    finally { busyRef.current = false; setSaving(false) }
  }, [card, cards, completed, completionIds, direction, index, limited, premium, revealed, sessionXp, user, ready])

  const saveAndExit = async () => {
    if (busyRef.current) return
    busyRef.current = true; setSaving(true); setSaveError('')
    try {
      await saveMemorySession({ cards, index, completed, sessionXp, direction, completionIds })
      router.push('/')
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Unable to save. Please try again.') }
    finally { busyRef.current = false; setSaving(false) }
  }

  useEffect(() => {
    if (!started || saving || limited) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, [role=dialog]')) return
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
  }, [finishCard, revealed, started, saving, limited])

  const selectedShow = useMemo(() => library.shows.find((show) => show.id === library.selectedShowId) ?? null, [library.selectedShowId, library.shows])
  const chooseShow = (_: unknown, show: MemoryShowSource | null) => {
    router.push(show ? `/memory?show=${encodeURIComponent(show.id)}` : '/memory')
  }
  const restart = async () => {
    if (!user) { window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } })); return }
    if (!ready || saving) return
    if (limited) { setUpgrade(true); return }
    setSaving(true)
    const ids = library.cards.map(() => crypto.randomUUID())
    try {
      await saveMemorySession({ cards: library.cards, index: 0, completed: 0, sessionXp: 0, direction, completionIds: ids })
      setCards(library.cards); setCompletionIds(ids); setStarted(true); setIndex(0); setRevealed(false); setCompleted(0); setSessionXp(0); setSaved(null)
    } catch { setSaveError('Unable to start a saved session. Please try again.') }
    finally { setSaving(false) }
  }
  const resume = () => {
    if (!saved) return
    setCards(saved.cards); setIndex(saved.index); setCompleted(saved.completed); setSessionXp(saved.sessionXp); setCompletionIds(saved.completionIds); chooseDirection(saved.direction); setStarted(true); setSaved(null)
  }

  const empty = cards.length === 0
  const complete = started && index >= cards.length
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
              <ToggleButton value="arabic">Practice Arabic</ToggleButton>
              <ToggleButton value="english">Practice English</ToggleButton>
            </ToggleButtonGroup>
            <Typography sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12 }}>{library.scopeTitle} · {cards.length} cards</Typography>
          </Box>
        </Paper>

        <PremiumPrompt open={upgrade} onClose={() => setUpgrade(false)} reason="You've completed today's free Memory practice. You've practised 20 cards today. Come back tomorrow or upgrade to Premium for unlimited Memory practice." />
        {progressLoading && <Box role="status" sx={{ mt: 2 }}><Typography>Loading Memory progress...</Typography><LinearProgress /></Box>}
        {progressError && <Alert severity="error" sx={{ mt: 2 }} action={<Button onClick={retryProgress} disabled={progressLoading}>Retry</Button>}>{progressError}</Alert>}
        {!progressError && sessionError && <Alert severity="warning" sx={{ mt: 2 }} action={<Button onClick={retryProgress}>Retry</Button>}>{sessionError} Your completed-card statistics are still available.</Alert>}
        {!user && <Alert severity="info" sx={{ mt: 2 }}>Sign in to practise Memory and save your progress.</Alert>}
        {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
        {ready && user && <Typography sx={{ mt: 2 }} color="text.secondary">{premium ? 'Unlimited daily Memory practice' : `${used} / ${MEMORY.dailyFreeCards} cards today`}</Typography>}
        {limited && <Alert severity="info" sx={{ mt: 2 }} action={<Button onClick={() => setUpgrade(true)}>Upgrade to Premium</Button>}>You&apos;ve completed today&apos;s free Memory practice. Your progress is saved. Come back tomorrow.</Alert>}
        {saved && !started && <Button onClick={resume} disabled={!ready || limited}>Resume saved session ? {saved.completed} completed</Button>}
        {started && <Button disabled={saving} onClick={() => void saveAndExit()} sx={{ mt: 2 }}>Save &amp; Exit</Button>}
        {loadError && <Alert severity="error" sx={{ mt: 2.5 }}>{loadError}</Alert>}
        {library.missingScope && <Alert severity="warning" sx={{ mt: 2.5 }}>That source is no longer available. Choose a show or switch to Random practice.</Alert>}

        {loadError ? <Box sx={{ mt: 2 }}><Button onClick={() => router.refresh()}>Retry loading Memory cards</Button></Box> : empty ? (
          <Paper elevation={0} sx={{ mt: 3, p: { xs: 4, md: 6 }, textAlign: 'center', borderRadius: '16px', border: '1px solid color-mix(in srgb, var(--awm-gold) 24%, transparent)', bgcolor: 'var(--awm-white)' }}>
            <PsychologyOutlined sx={{ fontSize: 52, color: 'var(--awm-gold)' }} />
            <Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 600, color: 'var(--awm-bark)' }}>No usable transcript cards here yet</Typography>
            <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>Memory needs a transcript segment with both Arabic and English.</Typography>
            <Button component={Link} href="/memory" variant="contained" sx={{ mt: 2.5, bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '9999px', textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}>Try Random practice</Button>
          </Paper>
        ) : !started ? (
          <Paper elevation={0} sx={{ mt: 3, minHeight: { xs: 330, md: 390 }, p: { xs: 3, md: 5 }, display: 'grid', placeItems: 'center', textAlign: 'center', borderRadius: '18px', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)', bgcolor: 'var(--awm-white)', boxShadow: '0 18px 50px color-mix(in srgb, var(--awm-bark) 9%, transparent)' }}>
            <Box><Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase' }}>{library.scopeTitle}</Typography><Typography sx={{ mt: 1.25, fontFamily: 'var(--font-heading)', fontSize: { xs: 31, md: 39 }, fontWeight: 600, color: 'var(--awm-bark)' }}>Ready to remember?</Typography><Typography sx={{ mt: 1, maxWidth: 520, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.65 }}>Read the prompt, say the translation aloud or in your head, then reveal the answer.</Typography><Button disabled={Boolean(user) && (!ready || saving || limited)} onClick={() => void restart()} variant="contained" startIcon={<PlayCircleOutlineRounded />} sx={{ mt: 3, minHeight: 48, px: 4, bgcolor: 'var(--awm-gold)', color: '#fff', borderRadius: '9999px', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#946c08' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', outlineOffset: 3 } }}>Start</Button></Box>
          </Paper>
        ) : complete ? (
          <Paper elevation={0} sx={{ mt: 3, p: { xs: 4, md: 6 }, textAlign: 'center', borderRadius: '18px', bgcolor: 'var(--awm-white)', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)' }}>
            <CheckCircleOutlined sx={{ color: 'var(--awm-gold)', fontSize: 58 }} /><Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 600, color: 'var(--awm-bark)' }}>Deck complete</Typography><Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>{completed} cards completed{user ? ` · ${sessionXp} XP earned` : ''}</Typography><Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1.25, flexWrap: 'wrap' }}><Button disabled={Boolean(user) && (!ready || saving || limited)} onClick={() => void restart()} startIcon={<Refresh />} variant="contained" sx={{ bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '9999px', textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}>Practise again</Button><Button component={Link} href="/memory" variant="outlined" sx={{ borderColor: 'var(--awm-gold)', color: 'var(--awm-bark)', borderRadius: '9999px', textTransform: 'none' }}>New random deck</Button></Box>
          </Paper>
        ) : card && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}><Typography sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12 }}>Card {index + 1} of {cards.length}</Typography><Box sx={{ display: 'flex', gap: 0.75 }}>{user && <Chip size="small" label={`${sessionXp} session XP · ${totalXp} total`} sx={{ bgcolor: 'color-mix(in srgb, var(--awm-gold) 12%, transparent)', color: 'var(--awm-bark)', fontWeight: 700 }} />}</Box></Box>
            <LinearProgress variant="determinate" value={(index / cards.length) * 100} sx={{ mb: 1.5, height: 6, borderRadius: 99, bgcolor: 'color-mix(in srgb, var(--awm-bark) 8%, transparent)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--awm-gold)', borderRadius: 99 } }} />
            <Paper elevation={0} aria-live="polite" sx={{ minHeight: { xs: 360, md: 430 }, p: { xs: 3, sm: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '18px', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)', bgcolor: 'var(--awm-white)', boxShadow: '0 18px 50px color-mix(in srgb, var(--awm-bark) 10%, transparent)' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>{promptIsArabic ? 'Translate into English' : 'Translate into Arabic'}</Typography>
                <Typography lang={promptIsArabic ? 'ar' : 'en'} dir={promptIsArabic ? 'rtl' : 'ltr'} sx={{ mt: 3, fontFamily: promptIsArabic ? 'var(--font-book-naskh), serif' : 'var(--font-heading)', fontSize: { xs: promptIsArabic ? 31 : 27, md: promptIsArabic ? 42 : 35 }, fontWeight: 600, lineHeight: 1.55, color: 'var(--awm-bark)' }}>{prompt}</Typography>
                {revealed && <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)' }}><Typography sx={{ color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Answer</Typography><Typography lang={promptIsArabic ? 'en' : 'ar'} dir={promptIsArabic ? 'ltr' : 'rtl'} sx={{ mt: 1.25, fontFamily: promptIsArabic ? 'var(--font-heading)' : 'var(--font-book-naskh), serif', fontSize: { xs: promptIsArabic ? 24 : 29, md: promptIsArabic ? 30 : 38 }, fontWeight: 600, lineHeight: 1.55, color: 'var(--awm-forest)' }}>{answer}</Typography></Box>}
              </Box>
              <Box sx={{ mt: 4 }}>
                <Typography sx={{ mb: 1.5, textAlign: 'center', color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 11 }}>{card.showTitle} · {card.episodeTitle}</Typography>
                {!revealed ? <Button onClick={() => setRevealed(true)} fullWidth variant="contained" startIcon={<VisibilityOutlined />} sx={{ minHeight: 49, bgcolor: 'var(--awm-gold)', color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#946c08' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', outlineOffset: 3 } }}>Reveal</Button> : <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1.25 }}><Button disabled={!ready || saving || limited} onClick={() => void finishCard('again')} variant="outlined" sx={{ minHeight: 48, color: 'var(--awm-bark)', borderColor: 'color-mix(in srgb, var(--awm-bark) 25%, transparent)', borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>Didn&apos;t know</Button><Button disabled={!ready || saving || limited} onClick={() => void finishCard('known')} variant="contained" endIcon={<ArrowForward />} sx={{ minHeight: 48, bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#174832' } }}>Knew it</Button></Box>}
                <Button component={Link} href={`/cartoons/${encodeURIComponent(card.showSlug)}/${encodeURIComponent(card.episodeSlug)}`} startIcon={<PlayCircleOutlineRounded />} size="small" sx={{ display: 'flex', mx: 'auto', mt: 1.25, color: 'var(--awm-muted)', textTransform: 'none' }}>View source episode</Button>
              </Box>
            </Paper>
            <Button disabled={!ready || saving || limited} onClick={() => { if (index >= cards.length - 1) setIndex(cards.length); else setIndex((value) => value + 1); setRevealed(false) }} startIcon={<ArrowBack sx={{ transform: 'rotate(180deg)' }} />} sx={{ mt: 1, color: 'var(--awm-muted)', textTransform: 'none' }}>Skip</Button>
          </Box>
        )}
      </Container>
    </Box>
  )
}
