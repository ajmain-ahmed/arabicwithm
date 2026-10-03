'use client'

import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { initialPractice, practiceReducer } from '@/app/lib/memorySession'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, useTransition } from 'react'
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
import { loadMemoryProgress, loadSavedMemorySession, persistMemorySession, type SavedMemorySession, submitMemoryReview, type MemoryLibrary, type MemoryShowSource } from '@/app/actions/memory'
import { useAuth } from '@/app/AuthContext'
import type { MemoryDirection, MemoryRating } from '@/app/lib/memory'
import { readGuestMemoryUsage, writeGuestMemoryUsage } from '@/app/lib/guestMemory'

const DIRECTION_KEY = 'awm-memory-direction-v1'
const DIRECTION_EVENT = 'awm-memory-direction-change'
const CARD_COUNT_OPTIONS = [5, 10, 15, 20] as const

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
  const { user } = useAuth()
  return <MemorySession key={`${user?.id ?? 'guest'}:${props.library.selectedShowId ?? ''}:${props.library.selectedEpisodeId ?? ''}`} {...props} />
}

function MemorySession({ library, loadError }: { library: MemoryLibrary; loadError?: string }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const direction = useSyncExternalStore<MemoryDirection>(subscribeToDirection, getDirectionSnapshot, () => 'arabic')
  const [totalXp, setTotalXp] = useState(0)
  const initialCardCount = library.scope === 'global' ? 10 : library.recommendedCardCount
  const [selectedCardCount, setSelectedCardCount] = useState(initialCardCount)
  const [practice, dispatch] = useReducer(practiceReducer, library.cards.slice(0, Math.min(initialCardCount, library.cards.length)), initialPractice)
  const { cards, index, revealed, completed, sessionXp, completionIds } = practice
  const started = practice.phase !== 'selection'
  const complete = practice.phase === 'complete'
  const activePractice = practice.phase === 'practice'
  const reducedMotion = useReducedMotion()
  const [navigating, startNavigation] = useTransition()
  const [saved, setSaved] = useState<SavedMemorySession | null>(null)
  const [used, setUsed] = useState(0)
  const [premium, setPremium] = useState(false)
  const [progressReady, setReady] = useState(false)
  const ready = (!user && !loading) || progressReady
  const [progressError, setProgressError] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [progressLoading, setProgressLoading] = useState(Boolean(user))
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const submitted = useRef(new Set<string>())
  const reviewVersion = useRef(0)
  const progressRequest = useRef(0)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const limited = !premium && used >= MEMORY.dailyFreeCards
  useEffect(() => {
    if (loading || user) return
    const refresh = () => { try { setUsed(readGuestMemoryUsage(window.localStorage).used) } catch { /* Storage may be unavailable. */ } }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [loading, user])
  useEffect(() => {
    if (loading || !user) return
    let active = true
    const load = () => {
      const version = reviewVersion.current, request = ++progressRequest.current
      void loadMemoryProgress().then(result => {
        if (!result.ok) throw new Error(result.error)
        const progress = result.data
        if (!active || version !== reviewVersion.current || request !== progressRequest.current || busyRef.current) return
        setUsed(progress.used); setPremium(progress.premium); setTotalXp(progress.totalXp); setReady(true); setProgressError('')
      }).catch(error => {
        if (active && version === reviewVersion.current && request === progressRequest.current && !busyRef.current) { setReady(false); setProgressError(error instanceof Error ? error.message : 'Unable to load Memory progress.') }
      }).finally(() => { if (active) setProgressLoading(false) })
    }
    load()
    if (!started) void loadSavedMemorySession().then(result => { if (!result.ok) throw new Error(result.error); const session = result.data; if (active) { setSaved(session); setSessionError('') } }).catch(error => { if (active) setSessionError(error instanceof Error ? error.message : 'Unable to load your saved session.') })
    /* Poll progress only during an active session: each refresh runs several
       DB queries, and finished ratings already update the count directly. */
    if (!started) return () => { active = false }
    const refresh = () => { if (document.visibilityState === 'visible') load() }
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [loading, user, loadAttempt, started])
  const retryProgress = () => { setProgressLoading(true); setProgressError(''); setSessionError(''); setLoadAttempt(value => value + 1) }
  const card = cards[index]

  const chooseDirection = (next: MemoryDirection) => {
    try { window.localStorage.setItem(DIRECTION_KEY, next) } catch { /* local persistence is optional */ }
    window.dispatchEvent(new Event(DIRECTION_EVENT))
  }

  const finishCard = useCallback(async (rating: MemoryRating) => {
    const completionId = completionIds[index]
    if (!card || !revealed || !completionId || submitted.current.has(completionId) || busyRef.current || navigating || limited || loading || (Boolean(user) && !ready)) return
    busyRef.current = true; setSaving(true); setSaveError(''); reviewVersion.current += 1
    try {
      let awarded = 0
      if (!user) {
        const nextUsed = Math.min(MEMORY.dailyFreeCards, used + 1)
        try { writeGuestMemoryUsage(window.localStorage, nextUsed) } catch { /* Keep in-memory quota when storage is unavailable. */ }
        setUsed(nextUsed)
        if (nextUsed >= MEMORY.dailyFreeCards) setUpgrade(true)
      } else {
        const response = await submitMemoryReview(card.id, rating, completionId, { cards, index: index + 1, completed: completed + 1, sessionXp, direction, completionIds })
        if (!mounted.current) return
        if (!response.ok) { setSaveError(response.error); return }
        const result = response.data
        setUsed(result.used)
        if (!result.accepted) { setUpgrade(true); return }
        awarded = result.awarded
        setTotalXp(value => value + awarded)
        if (!premium && result.used >= MEMORY.dailyFreeCards) setUpgrade(true)
      }
      submitted.current.add(completionId)
      dispatch({type:'advance',completionId,awarded})
    } catch { if (mounted.current) setSaveError('Unable to save this card. Your place is unchanged; please retry.') }
    finally { reviewVersion.current += 1; busyRef.current = false; if (mounted.current) setSaving(false) }
  }, [card, cards, completed, completionIds, direction, index, limited, premium, revealed, sessionXp, user, ready, used, loading, navigating])

  const saveAndExit = async () => {
    if (busyRef.current || navigating) return
    if (!user) { router.push('/'); return }
    busyRef.current = true; setSaving(true); setSaveError('')
    try {
      const result = await persistMemorySession({ cards, index, completed, sessionXp, direction, completionIds })
      if (!mounted.current) return
      if (!result.ok) { setSaveError(result.error); return }
      router.push('/')
    } catch { if (mounted.current) setSaveError('Unable to save your session. Please try again.') }
    finally { busyRef.current = false; if (mounted.current) setSaving(false) }
  }

  useEffect(() => {
    if (!started || saving || limited) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, [role=dialog]')) return
      if ((event.key === ' ' || event.key.toLowerCase() === 'r') && !revealed) {
        event.preventDefault()
        dispatch({type:'reveal'})
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
  const chooseCardCount = (count: typeof CARD_COUNT_OPTIONS[number]) => {
    if (activePractice || busyRef.current) return
    setSelectedCardCount(count)
    dispatch({type:'select',cards:library.cards.slice(0, Math.min(count, library.cards.length))})
  }
  const restart = async () => {
    if (loading || busyRef.current || navigating || (Boolean(user) && !ready)) return
    if (limited) { setUpgrade(true); return }
    const deck = library.cards.slice(0, Math.min(selectedCardCount, library.cards.length))
    if (!deck.length) return
    busyRef.current = true; setSaving(true); setSaveError('')
    try {
      const state = { cards: deck, index: 0, completed: 0, sessionXp: 0, direction, completionIds: deck.map(() => crypto.randomUUID()) }
      if (user) {
        const result = await persistMemorySession(state)
        if (!mounted.current) return
        if (!result.ok) { setSaveError(result.error); return }
      }
      submitted.current.clear(); dispatch({type:'begin',session:state}); setSaved(null)
    } catch { if (mounted.current) setSaveError('Unable to start your session. Please try again.') }
    finally { busyRef.current = false; if (mounted.current) setSaving(false) }
  }
  const resume = () => {
    if (!saved || busyRef.current || !ready || limited || navigating) return
    dispatch({type:'begin',session:saved}); chooseDirection(saved.direction); setSaved(null); setSaveError('')
  }
  const requestNewCards = () => {
    if (busyRef.current || navigating || loading) return
    const params = new URLSearchParams({ new: '1', deck: crypto.randomUUID() })
    if (library.selectedEpisodeId) params.set('episode', library.selectedEpisodeId)
    else if (library.selectedShowId) params.set('show', library.selectedShowId)
    startNavigation(() => router.push(`/memory?${params.toString()}`, {scroll:false}))
  }
  const skip = () => {
    if (busyRef.current || navigating || limited || loading || (Boolean(user) && !ready)) return
    dispatch({type:'skip',completionId:completionIds[index]}); setSaveError('')
  }

  const empty = cards.length === 0
  const prompt = card ? (direction === 'english' ? card.arabic : card.english) : ''
  const answer = card ? (direction === 'english' ? card.english : card.arabic) : ''
  const promptIsArabic = direction === 'english'

  return (
    <Box component="main" sx={{ minHeight: { xs: 'calc(100vh - 56px)', md: 'calc(100vh - 64px)' }, '@supports (height: 100dvh)': { minHeight: { xs: 'calc(100dvh - 56px)', md: 'calc(100dvh - 64px)' } }, bgcolor: 'var(--awm-cream-light)', pb: { xs: 4, md: 8 } }}>
      <Container maxWidth="md" sx={{ pt: { xs: 2.5, md: 5 }, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: '12px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 13%, transparent)', color: 'var(--awm-gold)' }}><PsychologyOutlined /></Box>
          <Box>
            <Typography component="h1" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 32, md: 44 }, fontWeight: 600, color: 'var(--awm-bark)', lineHeight: 1.05 }}>Memory</Typography>
            <Typography sx={{ mt: 0.25, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: { xs: 13, md: 15 } }}>Recall useful phrases from real show transcripts.</Typography>
          </Box>
        </Box>

        <AnimatePresence initial={false}>
        {!activePractice && <motion.div key="selection" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} transition={reducedMotion ? {duration:0} : {opacity:{duration:0.12},height:{duration:0.22,delay:0.12}}} style={{overflow:'hidden'}}>
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
          <Box sx={{ mt: 2, pt: 1.75, borderTop: '1px solid color-mix(in srgb, var(--awm-bark) 9%, transparent)' }}>
            <Typography sx={{ color: 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 700 }}>
              {library.scope === 'global' ? 'How many cards would you like to practise?' : `${library.scope === 'show' ? 'Based on these transcripts' : 'Based on this transcript'}: Recommended ${library.recommendedCardCount} cards`}
            </Typography>
            <Box role="group" aria-label="Choose Memory card count" sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: { xs: 0.65, sm: 1 } }}>
              {CARD_COUNT_OPTIONS.map((count) => {
                const recommended = library.scope !== 'global' && count === library.recommendedCardCount
                const selected = count === selectedCardCount
                return <Button key={count} onClick={() => chooseCardCount(count)} disabled={activePractice || saving || navigating} variant={selected ? 'contained' : 'outlined'} aria-label={`${count} cards${recommended ? ', recommended' : ''}`} aria-pressed={selected} sx={{ minWidth: 0, minHeight: 48, px: 0.5, borderRadius: '9px', borderColor: recommended ? 'var(--awm-gold)' : 'color-mix(in srgb, var(--awm-bark) 18%, transparent)', bgcolor: selected ? 'var(--awm-gold)' : 'transparent', color: selected ? '#fff' : 'var(--awm-bark)', fontWeight: 800, lineHeight: 1.1, display: 'flex', flexDirection: 'column', '&:hover': { bgcolor: selected ? '#946c08' : 'color-mix(in srgb, var(--awm-gold) 8%, transparent)' } }}>{count}{recommended && <Box component="span" sx={{ mt: 0.35, fontSize: 8.5, fontWeight: 700, textTransform: 'none' }}>Recommended</Box>}</Button>
              })}
            </Box>
            {library.availableCardCount < selectedCardCount && <Typography sx={{ mt: 1, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 11.5, lineHeight: 1.45 }}>This source has {library.availableCardCount} high-quality {library.availableCardCount === 1 ? 'card' : 'cards'}, so the deck will use those without padding or duplicates.</Typography>}
          </Box>
        </Paper>
        </motion.div>}
        </AnimatePresence>

        <PremiumPrompt open={upgrade} onClose={() => setUpgrade(false)} reason={`You've completed today's free Memory practice. You've practised ${MEMORY.dailyFreeCards} cards today. Come back tomorrow or upgrade to AWM+ for unlimited Memory practice.`} />
        {progressLoading && <Box role="status" sx={{ mt: 2 }}><Typography>Loading Memory progress...</Typography><LinearProgress /></Box>}
        {progressError && <Alert severity="error" sx={{ mt: 2 }} action={<Button onClick={retryProgress} disabled={progressLoading}>Retry</Button>}>{progressError}</Alert>}
        {!progressError && sessionError && <Alert severity="warning" sx={{ mt: 2 }} action={<Button onClick={retryProgress}>Retry</Button>}>{sessionError} Your completed-card statistics are still available.</Alert>}
        {!loading && !user && <Alert severity="info" sx={{ mt: 2 }}>You can practise without signing in. Sign in only if you want to save your progress.</Alert>}
        {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
        {ready && <Typography sx={{ mt: 2 }} color="text.secondary">{premium ? 'Unlimited daily Memory practice' : `${used} / ${MEMORY.dailyFreeCards} cards today`}</Typography>}
        {limited && <Alert severity="info" sx={{ mt: 2 }} action={<Button onClick={() => setUpgrade(true)}>Upgrade to AWM+</Button>}>You&apos;ve completed today&apos;s free Memory practice. Your progress is saved. Come back tomorrow.</Alert>}
        {saved && !started && <Button onClick={resume} disabled={!ready || limited}>Resume saved session - {saved.completed} completed</Button>}
        {started && <Button disabled={saving} onClick={() => void saveAndExit()} sx={{ mt: 2 }}>{user ? 'Save & Exit' : 'Exit practice'}</Button>}
        {loadError && <Alert severity="error" sx={{ mt: 2.5 }}>{loadError}</Alert>}
        {library.missingScope && <Alert severity="warning" sx={{ mt: 2.5 }}>That source is no longer available. Choose a show or switch to Random practice.</Alert>}

        <motion.div layout transition={{duration:reducedMotion ? 0 : 0.28}} style={{position:'relative'}}>
        {loadError ? <Box sx={{ mt: 2 }}><Button onClick={() => router.refresh()}>Retry loading Memory cards</Button></Box> : empty ? (
          <Paper elevation={0} sx={{ mt: 3, p: { xs: 4, md: 6 }, textAlign: 'center', borderRadius: '16px', border: '1px solid color-mix(in srgb, var(--awm-gold) 24%, transparent)', bgcolor: 'var(--awm-white)' }}>
            <PsychologyOutlined sx={{ fontSize: 52, color: 'var(--awm-gold)' }} />
            <Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 600, color: 'var(--awm-bark)' }}>{library.newOnly ? 'No new cards available' : 'No usable transcript cards here yet'}</Typography>
            <Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>{library.newOnly ? 'You have already reviewed every available card in this selection.' : 'Memory needs a transcript segment with both Arabic and English.'}</Typography>
            <Button component={Link} href="/memory" variant="contained" sx={{ mt: 2.5, bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '9999px', textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}>{library.newOnly ? 'Practise reviewed cards' : 'Try Random practice'}</Button>
          </Paper>
        ) : !started ? (
          <Paper elevation={0} sx={{ mt: 3, minHeight: { xs: 330, md: 390 }, p: { xs: 3, md: 5 }, display: 'grid', placeItems: 'center', textAlign: 'center', borderRadius: '18px', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)', bgcolor: 'var(--awm-white)', boxShadow: '0 18px 50px color-mix(in srgb, var(--awm-bark) 9%, transparent)' }}>
            <Box><Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase' }}>{library.scopeTitle}</Typography><Typography sx={{ mt: 1.25, fontFamily: 'var(--font-heading)', fontSize: { xs: 31, md: 39 }, fontWeight: 600, color: 'var(--awm-bark)' }}>Ready to remember?</Typography><Typography sx={{ mt: 1, maxWidth: 520, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', lineHeight: 1.65 }}>Read the prompt, say the translation aloud or in your head, then reveal the answer.</Typography><Button disabled={loading || (Boolean(user) && (!ready || saving || limited))} onClick={() => void restart()} variant="contained" startIcon={<PlayCircleOutlineRounded />} sx={{ mt: 3, minHeight: 48, px: 4, bgcolor: 'var(--awm-gold)', color: '#fff', borderRadius: '9999px', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#946c08' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', outlineOffset: 3 } }}>Start</Button></Box>
          </Paper>
        ) : complete ? (
          <Paper elevation={0} sx={{ mt: 3, p: { xs: 4, md: 6 }, textAlign: 'center', borderRadius: '18px', bgcolor: 'var(--awm-white)', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)' }}>
            <CheckCircleOutlined sx={{ color: 'var(--awm-gold)', fontSize: 58 }} /><Typography sx={{ mt: 1, fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 600, color: 'var(--awm-bark)' }}>Deck complete</Typography><Typography sx={{ mt: 0.75, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif' }}>{completed} cards completed{user ? ` · ${sessionXp} XP earned` : ''}</Typography><Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1.25, flexWrap: 'wrap' }}><Button disabled={loading || (Boolean(user) && (!ready || saving || limited))} onClick={() => void restart()} startIcon={<Refresh />} variant="contained" sx={{ bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '9999px', textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}>Practise again</Button><Button onClick={requestNewCards} disabled={loading || saving || navigating} variant="outlined" sx={{ borderColor: 'var(--awm-gold)', color: 'var(--awm-bark)', borderRadius: '9999px', textTransform: 'none' }}>New</Button></Box>
          </Paper>
        ) : card && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}><Typography sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12 }}>Card {index + 1} of {cards.length}</Typography><Box sx={{ display: 'flex', gap: 0.75 }}>{user && <Chip size="small" label={`${sessionXp} session XP · ${totalXp} total`} sx={{ bgcolor: 'color-mix(in srgb, var(--awm-gold) 12%, transparent)', color: 'var(--awm-bark)', fontWeight: 700 }} />}</Box></Box>
            <LinearProgress variant="determinate" value={(index / cards.length) * 100} sx={{ mb: 1.5, height: 6, borderRadius: 99, bgcolor: 'color-mix(in srgb, var(--awm-bark) 8%, transparent)', '& .MuiLinearProgress-bar': { bgcolor: 'var(--awm-gold)', borderRadius: 99 } }} />
            <Paper elevation={0} aria-live="polite" sx={{ p: { xs: 2.25, sm: 3.5 }, borderRadius: '18px', border: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)', bgcolor: 'var(--awm-white)', boxShadow: '0 12px 36px color-mix(in srgb, var(--awm-bark) 9%, transparent)' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>{promptIsArabic ? 'Translate into English' : 'Translate into Arabic'}</Typography>
                <Typography lang={promptIsArabic ? 'ar' : 'en'} dir={promptIsArabic ? 'rtl' : 'ltr'} sx={{ mt: { xs: 1.75, sm: 2.25 }, fontFamily: promptIsArabic ? 'var(--font-book-naskh), serif' : 'var(--font-heading)', fontSize: { xs: promptIsArabic ? 30 : 26, md: promptIsArabic ? 40 : 34 }, fontWeight: 600, lineHeight: 1.45, color: 'var(--awm-bark)' }}>{prompt}</Typography>
                <Box
                  aria-hidden={!revealed}
                  sx={{
                    display: 'grid',
                    gridTemplateRows: revealed ? '1fr' : '0fr',
                    opacity: revealed ? 1 : 0,
                    transition: 'grid-template-rows 300ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease 70ms',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                  }}
                >
                  <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
                    <Box sx={{ mt: { xs: 2.25, sm: 3 }, pt: { xs: 2.25, sm: 3 }, borderTop: '1px solid color-mix(in srgb, var(--awm-gold) 28%, transparent)' }}>
                      <Typography sx={{ color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Answer</Typography>
                      <Typography lang={promptIsArabic ? 'en' : 'ar'} dir={promptIsArabic ? 'ltr' : 'rtl'} sx={{ mt: 1.1, fontFamily: promptIsArabic ? 'var(--font-heading)' : 'var(--font-book-naskh), serif', fontSize: { xs: promptIsArabic ? 24 : 29, md: promptIsArabic ? 30 : 38 }, fontWeight: 600, lineHeight: 1.5, color: 'var(--awm-forest)' }}>{answer}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mt: { xs: 2.5, sm: 3 } }}>
                <Typography sx={{ mb: 1.25, textAlign: 'center', color: 'var(--awm-muted-light)', fontFamily: 'Jost, sans-serif', fontSize: 11 }}>{card.showTitle} · {card.episodeTitle}</Typography>
                {!revealed ? <Button onClick={() => dispatch({type:'reveal'})} fullWidth variant="contained" startIcon={<VisibilityOutlined />} sx={{ minHeight: 49, bgcolor: 'var(--awm-gold)', color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#946c08' }, '&:focus-visible': { outline: '3px solid color-mix(in srgb, var(--awm-gold) 45%, transparent)', outlineOffset: 3 } }}>Reveal</Button> : <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1.25 }}><Button disabled={(Boolean(user) && !ready) || saving || navigating || limited} onClick={() => void finishCard('again')} variant="outlined" sx={{ minHeight: 48, color: 'var(--awm-bark)', borderColor: 'color-mix(in srgb, var(--awm-bark) 25%, transparent)', borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>Didn&apos;t know</Button><Button disabled={(Boolean(user) && !ready) || saving || navigating || limited} onClick={() => void finishCard('known')} variant="contained" endIcon={<ArrowForward />} sx={{ minHeight: 48, bgcolor: 'var(--awm-forest)', color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#174832' } }}>Knew it</Button></Box>}
                <Button component={Link} href={`/cartoons/${encodeURIComponent(card.showSlug)}/${encodeURIComponent(card.episodeSlug)}`} startIcon={<PlayCircleOutlineRounded />} size="small" sx={{ display: 'flex', mx: 'auto', mt: 1.25, color: 'var(--awm-muted)', textTransform: 'none' }}>View source episode</Button>
              </Box>
            </Paper>
            <Button disabled={(Boolean(user) && !ready) || saving || navigating || limited} onClick={skip} startIcon={<ArrowBack sx={{ transform: 'rotate(180deg)' }} />} sx={{ mt: 1, color: 'var(--awm-muted)', textTransform: 'none' }}>Skip</Button>
            <Button onClick={requestNewCards} disabled={loading || saving || navigating}>New</Button>
          </Box>
        )}
        </motion.div>
      </Container>
    </Box>
  )
}
