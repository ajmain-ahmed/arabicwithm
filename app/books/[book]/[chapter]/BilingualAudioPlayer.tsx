'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {Alert,Box,Button,Collapse,IconButton,Menu,MenuItem,Paper,Typography} from '@mui/material'
import LtrSlider from '@/app/components/LtrSlider'
import { FastForwardRounded, PauseRounded, PlayArrowRounded, RefreshRounded, VolumeUp } from '@mui/icons-material'
import { requestChapterAudioResult, saveAudioProgress, type ChapterAudioPlayback, type ChapterAudioSummary } from '@/app/actions/audiobooks'
import { bilingualItemAtTime, bilingualTimelinePosition, buildBilingualTimeline, type BilingualTimelineItem } from '@/app/lib/bilingualAudio'
import { chapterAudioPageMarkers, type ChapterAudioTimings } from '@/app/lib/chapterAudioTimings'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import { useAuth } from '@/app/AuthContext'
import { usePlayerStore } from '@/store/playerStore'
import { useAudiobookStore } from '@/store/audiobookStore'

interface AudioLayout { button: ReactNode; player: ReactNode }
type StoragePlayback = Extract<ChapterAudioPlayback, { sourceType: 'supabase_storage' }>

export default function BilingualAudioPlayer({ arabic, english, render, onPositionChange, seekRequest, pageStarts, blockCount, preferredLanguage = 'ar' }: {
  arabic: ChapterAudioSummary
  english: ChapterAudioSummary
  render?: (layout: AudioLayout) => ReactNode
  onPositionChange?: (seconds: number, timings: ChapterAudioTimings | null) => void
  seekRequest?: { revision: number; seconds: number } | null
  pageStarts?: number[]
  blockCount?: number
  preferredLanguage?: 'ar' | 'en'
}) {
 const {t:awmT}=useWebsiteLocale()

  const { user, loading: authLoading } = useAuth()
  const authKey = user?.id ?? 'signed-out'
  const signedIn = Boolean(user)
  const rate = usePlayerStore(state => state.audiobookRate)
  const readCachedPlayback = useAudiobookStore(state => state.readCachedPlayback)
  const cachePlayback = useAudiobookStore(state => state.cachePlayback)
  const [expanded, setExpanded] = useState(false)
  const [sources, setSources] = useState<{ authKey: string; ar: StoragePlayback; en: StoragePlayback } | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const [speedAnchor, setSpeedAnchor] = useState<HTMLElement | null>(null)
  const arabicRef = useRef<HTMLAudioElement>(null)
  const englishRef = useRef<HTMLAudioElement>(null)
  const playingRef = useRef(false)
  const playRequestedRef = useRef(false)
  const busyRef = useRef(false)
  const lastSavedRef = useRef(0)
  const timeline = useMemo(() => {
    if (!sources || sources.authKey !== authKey) return null
    return buildBilingualTimeline(sources.ar.timings ?? arabic.timings ?? null, sources.en.timings ?? english.timings ?? null)
  }, [sources, authKey, arabic.timings, english.timings])
  const activeItem = timeline?.items[activeIndex] ?? null
  const activeRef = activeItem?.language === 'en' ? englishRef : arabicRef
  const pageMarkers = chapterAudioPageMarkers(timeline?.timings ?? null, pageStarts ?? [], blockCount ?? 0, (timeline?.timings.durationMs ?? 0) / 1000)

  function currentEpochMs(): number { return Date.now() }

  function savePosition(completed = false) {
    if (!signedIn || !activeItem) return
    const element = activeRef.current
    if (!element) return
    void saveAudioProgress(activeItem.language === 'ar' ? arabic.chapterId : english.chapterId, completed ? 0 : element.currentTime, completed, activeItem.language, authKey).catch(() => {})
  }

  function setMediaTime(item: BilingualTimelineItem, mediaSeconds: number) {
    const element = item.language === 'ar' ? arabicRef.current : englishRef.current
    if (!element) return
    if (Math.abs(element.currentTime - mediaSeconds) > 0.05) element.currentTime = mediaSeconds
    const timings = item.language === 'ar' ? sources?.ar.timings ?? arabic.timings ?? null : sources?.en.timings ?? english.timings ?? null
    setPosition(bilingualTimelinePosition(item, mediaSeconds))
    onPositionChange?.(mediaSeconds, timings)
  }

  function advance() {
    if (!timeline || !activeItem) return
    if (activeIndex >= timeline.items.length - 1) {
      playingRef.current = false
      setPlaying(false)
      setPosition(timeline.timings.durationMs / 1000)
      savePosition(true)
      return
    }
    const next = activeIndex + 1
    setActiveIndex(next)
    setMediaTime(timeline.items[next], timeline.items[next].startMs / 1000)
    if (playingRef.current) playRequestedRef.current = true
  }

  useEffect(() => {
    if (!activeItem || !playRequestedRef.current) return
    const element = activeRef.current
    if (!element) return
    playRequestedRef.current = false
    element.currentTime = activeItem.startMs / 1000
    void element.play().catch(() => setError('Audio couldn’t be played. Tap to retry.'))
  }, [activeItem, activeRef])

  useEffect(() => {
    for (const element of [arabicRef.current, englishRef.current]) if (element) element.playbackRate = rate
  }, [rate, sources])

  useEffect(() => {
    if (!seekRequest || !timeline) return
    const index = timeline.items.findIndex(item => item.language === preferredLanguage && item.startMs / 1000 >= seekRequest.seconds - 0.001)
    if (index < 0) return
    queueMicrotask(() => {
      setActiveIndex(index)
      setMediaTime(timeline.items[index], timeline.items[index].startMs / 1000)
      if (playingRef.current) playRequestedRef.current = true
    })
  }, [seekRequest, timeline, preferredLanguage])

  useEffect(() => () => {
    arabicRef.current?.pause()
    englishRef.current?.pause()
    playingRef.current = false
  }, [authKey])

  async function requestSource(summary: ChapterAudioSummary): Promise<StoragePlayback> {
    const cached = readCachedPlayback(authKey, summary.chapterId, summary.language)
    if (cached) return cached.playback as StoragePlayback
    const result = await requestChapterAudioResult(summary.chapterId, summary.language)
    if (result.status === 'upgrade') throw new Error('upgrade')
    if (result.status === 'error') throw new Error(result.message)
    if (result.playback.sourceType !== 'supabase_storage') throw new Error('Bilingual playback requires uploaded MP3 sources.')
    const expiresAt = result.playback.expiresIn > 0 ? currentEpochMs() + result.playback.expiresIn * 1000 - 30_000 : null
    cachePlayback(authKey, summary.chapterId, summary.language, result.playback, expiresAt)
    return result.playback
  }

  async function loadPlayback() {
    if (busyRef.current) return
    busyRef.current = true
    setLoading(true)
    setError('')
    try {
      const [ar, en] = await Promise.all([requestSource(arabic), requestSource(english)])
      setSources({ authKey, ar, en })
      playRequestedRef.current = true
    } catch (cause) {
      playRequestedRef.current = false
      if (cause instanceof Error && cause.message === 'upgrade') setUpgrade(true)
      else setError('Audio couldn’t be loaded. Tap to retry.')
    } finally {
      busyRef.current = false
      setLoading(false)
    }
  }

  function togglePlayback() {
    if (!signedIn) { setUpgrade(true); return }
    if (playingRef.current) {
      arabicRef.current?.pause()
      englishRef.current?.pause()
      playingRef.current = false
      setPlaying(false)
      savePosition()
      return
    }
    if (sources) {
      playRequestedRef.current = true
      const element = activeRef.current
      if (element) {
        playRequestedRef.current = false
        void element.play().catch(() => setError('Audio couldn’t be played. Tap to retry.'))
      }
      return
    }
    void loadPlayback()
  }

  function seekTimeline(seconds: number) {
    if (!timeline) return
    const wasPlaying = playingRef.current
    activeRef.current?.pause()
    const item = bilingualItemAtTime(timeline.items, seconds)
    const index = timeline.items.indexOf(item)
    setActiveIndex(index)
    setMediaTime(item, item.startMs / 1000)
    playingRef.current = wasPlaying
    if (wasPlaying) playRequestedRef.current = true
  }

  function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` }

  const button = <Button data-reader-audio-trigger aria-expanded={expanded} aria-controls="reader-audio-panel" disabled={loading || authLoading} onClick={() => setExpanded(value => !value)} startIcon={<VolumeUp />} sx={{ minHeight: 44, px: 2, color: expanded ? '#fff' : { xs: 'var(--awm-bark)', md: '#fff' }, bgcolor: expanded ? '#b8860b' : { xs: 'var(--awm-white)', md: 'rgba(255,255,255,.08)' }, border: '1px solid', borderColor: expanded ? '#b8860b' : { xs: 'var(--awm-gold)', md: 'rgba(255,255,255,.25)' }, textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif' }}>
    {authLoading ? awmT("Checking account…") : awmT("Audio")}
  </Button>

  const player = (<Collapse in={expanded} timeout={260} unmountOnExit={false}>
    <Paper id="reader-audio-panel" component="section" aria-label={awmT("Chapter audio")} elevation={0} sx={{ mt: 1.5, mb: 0.5, mx: { xs: 0.75, md: 1.5 }, p: { xs: 1, md: 1.25 }, borderRadius: { xs: '10px', md: '9999px' }, bgcolor: 'var(--awm-white)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1, md: 1.5 }}}>
      <IconButton aria-label={playing ? awmT("Pause audio") : awmT("Play audio")} onClick={togglePlayback} disabled={loading || authLoading} sx={{ width: 36, height: 36, color: 'var(--awm-gold)' }}>
        {loading ? <RefreshRounded /> : playing ? <PauseRounded /> : <PlayArrowRounded />}
      </IconButton>
      <LtrSlider aria-label={awmT("Audio position")} min={0} max={(timeline?.timings.durationMs ?? 1000) / 1000} step={1} marks={pageMarkers.map(marker => ({ value: marker.seconds, label: `P${marker.page}` }))} value={Math.min(position, (timeline?.timings.durationMs ?? 1000) / 1000)} disabled={!timeline} onChange={(_, value) => seekTimeline(value as number)} onChangeCommitted={() => savePosition()} sx={{ flex: 1, minWidth: 120, color: '#b8860b', py: 0.5 }} />
      <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 11.5, md: 13 }, fontWeight: 600, color: 'var(--awm-muted)', whiteSpace: 'nowrap' }}>{formatTime(position)} / {formatTime((timeline?.timings.durationMs ?? 0) / 1000)}</Typography>
      <Button aria-label={awmT('Audiobook playback speed: {rate}\u00d7',{rate})} aria-haspopup="menu" onClick={event => setSpeedAnchor(event.currentTarget)} sx={{ width: 40, minWidth: 40, height: 32, p: 0, borderRadius: '50%', border: '1px solid var(--awm-gold)', color: 'inherit', fontSize: 11, textTransform: 'none' }}>{rate}×</Button>
      <Menu anchorEl={speedAnchor} open={Boolean(speedAnchor)} onClose={() => setSpeedAnchor(null)} slotProps={{ list: { 'aria-label': awmT("Audiobook playback speed") } }}>
        {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(value => <MenuItem key={value} selected={rate === value} onClick={() => { usePlayerStore.getState().setAudiobookRate(value); setSpeedAnchor(null) }}>{value}×</MenuItem>)}
      </Menu>
      {error && <Alert severity="info" action={<Button startIcon={<RefreshRounded />} onClick={() => { playRequestedRef.current = true; void loadPlayback() }}><UiText>{"Retry audio"}</UiText></Button>}><UiText>{error}</UiText></Alert>}
    </Paper>
  </Collapse>)

  return <>
    {render ? render({ button, player }) : <Box>{button}{player}</Box>}
    {sources?.ar.sourceType === 'supabase_storage' && <audio ref={arabicRef} preload="metadata" src={sources.ar.url} onPlay={() => { playingRef.current = true; setPlaying(true) }} onPause={() => { playingRef.current = false; setPlaying(false); savePosition() }} onEnded={advance} onTimeUpdate={event => {
      if (activeItem?.language !== 'ar') return
      const time = event.currentTarget.currentTime
      setMediaTime(activeItem, time)
      if (Math.floor(time) - lastSavedRef.current >= 10) { lastSavedRef.current = Math.floor(time); savePosition() }
      if (time >= activeItem.endMs / 1000 - 0.04) advance()
    }} />}
    {sources?.en.sourceType === 'supabase_storage' && <audio ref={englishRef} preload="metadata" src={sources.en.url} onPlay={() => { playingRef.current = true; setPlaying(true) }} onPause={() => { playingRef.current = false; setPlaying(false); savePosition() }} onEnded={advance} onTimeUpdate={event => {
      if (activeItem?.language !== 'en') return
      const time = event.currentTarget.currentTime
      setMediaTime(activeItem, time)
      if (Math.floor(time) - lastSavedRef.current >= 10) { lastSavedRef.current = Math.floor(time); savePosition() }
      if (time >= activeItem.endMs / 1000 - 0.04) advance()
    }} />}
    <PremiumPrompt key={authKey} open={upgrade} onClose={() => setUpgrade(false)} reason="Audiobook playback is available with AWM+." />
  </>
}
