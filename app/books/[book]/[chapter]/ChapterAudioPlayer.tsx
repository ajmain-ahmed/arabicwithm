'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Alert, Box, Button, ButtonGroup, CircularProgress, Collapse, IconButton, Menu, MenuItem, Paper, Slider, Typography } from '@mui/material'
import { PauseRounded, PlayArrowRounded, RefreshRounded, VolumeUp } from '@mui/icons-material'
import { requestChapterAudioResult, saveAudioProgress, type ChapterAudioPlayback, type ChapterAudioSummary } from '@/app/actions/audiobooks'
import { chapterAudioPageMarkers, type ChapterAudioTimings } from '@/app/lib/chapterAudioTimings'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import { useAuth } from '@/app/AuthContext'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { BOOK_LANGUAGE_STOP_EVENT } from '@/app/lib/bookReaderSettings'
import { usePlayerStore } from '@/store/playerStore'
import { useAudiobookStore } from '@/store/audiobookStore'

type VideoControls = { play: () => void; pause: () => void; seek: (seconds: number) => void }

function YouTubeAudio({ playback, controlsRef, onPlaying, onTime, onDuration, rate, onRates, hideFrame = false }: {
  rate: number
  onRates: (rates: number[]) => void
  playback: Extract<ChapterAudioPlayback, { sourceType: 'youtube' }>
  controlsRef: RefObject<VideoControls | null>
  onDuration: (duration: number) => void
  onTime: (time: number) => void
  onPlaying: (playing: boolean) => void
  hideFrame?: boolean
}) {
  const { wrapRef, errorCode, retry, isReady, isPlaying, playWithSound, pauseVideo, seekToOnly, getDuration, setPlaybackRate, getPlaybackRates } = useYouTubePlayer(playback.videoId, onTime, playback.positionSeconds, { autoplay: true })
  useEffect(() => { if (isReady) setPlaybackRate(rate) }, [isReady, rate, setPlaybackRate])
  useEffect(() => { if (isReady) onRates(getPlaybackRates()) }, [isReady, getPlaybackRates, onRates])
  const unsupportedRate = isReady && !(getPlaybackRates?.() ?? [1]).includes(rate)
  useEffect(() => { controlsRef.current = { play: playWithSound, pause: pauseVideo, seek: seekToOnly }; return () => { controlsRef.current = null } }, [controlsRef, pauseVideo, playWithSound, seekToOnly])
  useEffect(() => { onPlaying(isPlaying) }, [isPlaying, onPlaying])
  useEffect(() => { const timer = setInterval(() => { const duration = getDuration?.() ?? 0; if (duration > 0) onDuration(duration) }, 1000); return () => clearInterval(timer) }, [getDuration, onDuration])
  const message = errorCode === 100 ? 'This YouTube video is private, removed, or unavailable.'
    : errorCode === 101 || errorCode === 150 ? 'The video owner has disabled embedded playback.'
      : 'YouTube could not play this video. Try again.'
  return <>
    <Box ref={wrapRef} sx={{ display: hideFrame ? 'none' : undefined, width: '100%', maxWidth: 480, aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: '10px' }} />
    {errorCode !== null && <Alert severity="warning" action={<Button onClick={retry}>Retry YouTube</Button>}>{message}</Alert>}
    {unsupportedRate && <Alert severity="info">This YouTube source does not support {rate}× playback.</Alert>}
  </>
}

interface AudioLayout { button: ReactNode; player: ReactNode }
export interface ChapterAudioSeekRequest { revision: number; seconds: number }
interface Props {
  /* The selected narration summary, or null when the chapter has no audio.
     The component stays mounted either way so the surrounding reader chrome
     (settings dialog included) never remounts on a language switch. */
  audio: ChapterAudioSummary | null
  chapterTitle: string
  label?: string
  render?: (layout: AudioLayout) => ReactNode
  dedicated?: boolean
  /* Available narration languages + the active narration language; drives the
     language pills in the inline (non-dedicated) control panel. */
  audioLanguages?: Array<'ar' | 'en'>
  language?: 'ar' | 'en'
  onLanguageChange?: (language: 'ar' | 'en') => void
  onPositionChange?: (seconds: number, timings: ChapterAudioTimings | null) => void
  seekRequest?: ChapterAudioSeekRequest | null
  pageStarts?: number[]
  blockCount?: number
}

function currentEpochMs(): number { return Date.now() }

const PAGE_MARKER_SX = {
  '& .MuiSlider-mark': { width: 2, height: 8, borderRadius: 1, bgcolor: 'var(--awm-bark)', opacity: 0.3 },
  '& .MuiSlider-markActive': { bgcolor: 'var(--awm-gold)', opacity: 0.9 },
  '& .MuiSlider-markLabel': { top: 26, display: { xs: 'none', md: 'block' }, fontFamily: 'var(--font-sans), sans-serif', fontSize: 9, fontWeight: 600, color: 'var(--awm-muted)' },
} as const

const CONTROL_BUTTON_SX = {
  width: { xs: 32, md: 36 },
  height: { xs: 32, md: 36 },
  minWidth: { xs: 32, md: 36 },
  p: 0,
  flex: '0 0 auto',
  '& svg': { fontSize: { xs: 17, md: 20 } },
  color: 'inherit',
  border: '1px solid',
  borderColor: 'rgba(184,134,11,0.5)',
  '&.Mui-disabled': { color: 'inherit', opacity: 0.45 },
} as const

/** One media element owned by the reader; presentation never owns playback. */
export default function ChapterAudioPlayer({ audio, chapterTitle, label = 'Play Audio', render, dedicated, audioLanguages, language, onLanguageChange, onPositionChange, seekRequest, pageStarts, blockCount }: Props) {
  const { user, loading: authLoading } = useAuth()
  const authKey = user?.id ?? 'signed-out'
  /* Expanded lives here, above the AudioSession remount boundary. The inline
     key intentionally excludes the narration language: a language switch
     resets playback via BOOK_LANGUAGE_STOP_EVENT, and remounting here would
     tear down (and visibly replay) the whole reader chrome, settings dialog
     included. Dedicated Listen controls do not emit that reader event, so
     their session key also includes language to replace the old source. */
  const [expanded, setExpanded] = useState(false)
  if (!audio) return render ? render({ button: null, player: null }) : null
  return <AudioSession key={`${authKey}:${audio.chapterId}${dedicated ? `:${audio.language}` : ''}`} audio={audio} chapterTitle={chapterTitle} label={label} render={render} dedicated={dedicated} audioLanguages={audioLanguages} language={language} onLanguageChange={onLanguageChange} onPositionChange={onPositionChange} seekRequest={seekRequest} pageStarts={pageStarts} blockCount={blockCount} expanded={expanded} onExpandedChange={setExpanded} authKey={authKey} signedIn={Boolean(user)} authLoading={Boolean(authLoading)} />
}

function AudioSession({ audio, chapterTitle, label, render, dedicated, audioLanguages, language, onLanguageChange, onPositionChange, seekRequest, pageStarts, blockCount, expanded, onExpandedChange, authKey, signedIn, authLoading }: Omit<Props, 'audio'> & { audio: ChapterAudioSummary; expanded: boolean; onExpandedChange: (next: boolean) => void; authKey: string; signedIn: boolean; authLoading: boolean }) {
  const rate = usePlayerStore(state => state.audiobookRate)
  const setRate = usePlayerStore(state => state.setAudiobookRate)
  const cachePlayback = useAudiobookStore(state => state.cachePlayback)
  const readCachedPlayback = useAudiobookStore(state => state.readCachedPlayback)
  const recordProgress = useAudiobookStore(state => state.recordProgress)
  const markProgressSynced = useAudiobookStore(state => state.markProgressSynced)
  const flushProgressOutbox = useAudiobookStore(state => state.flushProgressOutbox)
  const [speedAnchor, setSpeedAnchor] = useState<HTMLElement | null>(null)
  const [pageAnchor, setPageAnchor] = useState<HTMLElement | null>(null)
  const [youtubeRates, setYoutubeRates] = useState<number[]>([1])
  const [source, setSource] = useState<{ authKey: string; playback: ChapterAudioPlayback; expiresAt: number | null } | null>(null)
  const playback = source?.authKey === authKey ? source.playback : null
  const [position, setPosition] = useState(0)
  const audioDurationKey = `${audio.language}:${audio.durationSeconds ?? ''}`
  const [durationState, setDurationState] = useState({ key: audioDurationKey, value: audio.durationSeconds ?? 0 })
  const duration = durationState.key === audioDurationKey ? durationState.value : audio.durationSeconds ?? 0
  const setDuration = (value: number) => setDurationState({ key: audioDurationKey, value })
  const pageMarkers = chapterAudioPageMarkers(playback?.timings ?? audio.timings ?? null, pageStarts ?? [], blockCount ?? 0, duration)
  const currentPage = [...pageMarkers].reverse().find(marker => marker.seconds <= position + 0.001)?.page ?? pageMarkers[0]?.page ?? 1
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<VideoControls | null>(null)
  const lastSavedRef = useRef(0)
  const resumeRef = useRef<number | null>(null)
  const pendingSeekRef = useRef<number | null>(null)
  const playRequestedRef = useRef(false)
  const requestRef = useRef({ revision: 0 })
  const busyRef = useRef(false)
  const loadPlaybackRef = useRef<() => Promise<void>>(async () => {})
  const seekToRef = useRef<(seconds: number) => void>(() => {})
  const persistSeekRef = useRef<(seconds: number) => void>(() => {})
  const progressQueueRef = useRef<Promise<void>>(Promise.resolve())
  const queueProgressRef = useRef<(seconds: number, completed?: boolean) => void>(() => {})

  useEffect(() => {
    if (authKey === 'signed-out') return
    const flush = () => { void flushProgressOutbox(authKey) }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [authKey, flushProgressOutbox])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate, playback])

  const speedControl = <>
    <Button aria-label={`Audiobook playback speed: ${rate}×`} aria-haspopup="menu" aria-expanded={Boolean(speedAnchor)} onClick={event => setSpeedAnchor(event.currentTarget)} sx={{order:8,width:{xs:32,md:52},minWidth:{xs:32,md:52},height:{xs:32,md:36},minHeight:{xs:32,md:36},p:0,borderRadius:{xs:'50%',md:'9999px'},border:'1px solid var(--awm-gold)',color:'inherit',fontSize:{xs:11,md:13},lineHeight:1,fontWeight:600,textTransform:'none',alignSelf:'center'}}>{rate}×</Button>
    <Menu anchorEl={speedAnchor} open={Boolean(speedAnchor)} onClose={() => setSpeedAnchor(null)} slotProps={{list:{'aria-label':'Audiobook playback speed'}}}>
      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(value => <MenuItem key={value} disabled={playback?.sourceType==='youtube'&&!youtubeRates.includes(value)} selected={rate === value} onClick={() => { setRate(value); setSpeedAnchor(null) }}>{value}×</MenuItem>)}
    </Menu>
  </>

  const timedMeta = pageMarkers.length > 0 ? <Box sx={{ order: { xs: 2, md: 3 }, flex: { xs: '1 1 100%', md: '0 0 auto' }, display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', md: 'flex-start' }, gap: 1, minWidth: 0 }}>
    <Button aria-label="Choose audiobook page" aria-haspopup="menu" aria-expanded={Boolean(pageAnchor)} onClick={event => setPageAnchor(event.currentTarget)} sx={{ display: { xs: 'inline-flex', md: 'none' }, minHeight: 26, px: 0.75, py: 0.25, borderRadius: '6px', color: 'var(--awm-muted)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 10.5, fontWeight: 600, textTransform: 'none' }}>
      Page {currentPage} of {pageStarts?.length ?? pageMarkers.length}
    </Button>
    <Menu anchorEl={pageAnchor} open={Boolean(pageAnchor)} onClose={() => setPageAnchor(null)} slotProps={{ list: { 'aria-label': 'Audiobook pages' } }}>
      {pageMarkers.map(marker => <MenuItem key={marker.page} selected={marker.page === currentPage} onClick={() => { seekTo(marker.seconds); persistSeek(marker.seconds); setPageAnchor(null) }}>Page {marker.page}</MenuItem>)}
    </Menu>
    <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 11.5, md: 13 }, fontWeight: 600, color: 'var(--awm-muted)', whiteSpace: 'nowrap' }}>{formatTime(position)} / {formatTime(duration)}</Typography>
  </Box> : null

  useEffect(() => {
    const request = requestRef.current
    return () => { request.revision++; busyRef.current = false; playRequestedRef.current = false; pendingSeekRef.current = null }
  }, [authKey, audio.chapterId, audio.language])

  useEffect(() => {
    const element = audioRef.current
    return () => {
      if (!element) return
      element.pause()
      queueProgressRef.current(element.currentTime, false)
    }
  }, [authKey, audio.chapterId, audio.language, playback?.sourceType])

  useEffect(()=>{
    const stop=()=>{
      requestRef.current.revision++
      playRequestedRef.current=false;busyRef.current=false;resumeRef.current=null;pendingSeekRef.current=null
      audioRef.current?.pause();videoRef.current?.pause()
      setPlaying(false);setLoading(false);setSource(null);setPosition(0);onPositionChange?.(0,null)
      if('mediaSession' in navigator) navigator.mediaSession.playbackState='paused'
    }
    window.addEventListener(BOOK_LANGUAGE_STOP_EVENT,stop)
    return()=>window.removeEventListener(BOOK_LANGUAGE_STOP_EVENT,stop)
  },[onPositionChange])

  async function startMedia(element: HTMLAudioElement) {
    try { await element.play(); setError('') }
    catch (cause) {
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') setError('Tap the play button to begin listening.')
      else setError('Audio couldn\'t be played. Tap to retry.')
    }
  }

  async function loadPlayback() {
    if (busyRef.current) return
    busyRef.current = true
    const request = ++requestRef.current.revision
    setLoading(true); setError('')
    if (audioRef.current) { resumeRef.current = audioRef.current.currentTime; audioRef.current.pause() }
    try {
      const cached = readCachedPlayback(authKey, audio.chapterId, audio.language)
      if (cached) {
        setSource({ authKey, playback: cached.playback, expiresAt: cached.expiresAt })
        return
      }
      const result = await requestChapterAudioResult(audio.chapterId, audio.language)
      if (request !== requestRef.current.revision) return
      if (result.status === 'upgrade') { playRequestedRef.current = false; setUpgrade(true) }
      else if (result.status === 'error') { playRequestedRef.current = false; setError(result.message) }
      else {
        const expiresAt = result.playback.sourceType === 'supabase_storage' && result.playback.expiresIn > 0 ? currentEpochMs() + result.playback.expiresIn * 1000 - 30_000 : null
        cachePlayback(authKey, audio.chapterId, audio.language, result.playback, expiresAt)
        setSource({ authKey, playback: result.playback, expiresAt })
        // A retry can return the same signed URL; explicitly reload a failed
        // element in that case while retaining the reader's saved position.
        if (result.playback.sourceType === 'supabase_storage' && audioRef.current?.getAttribute('src') === result.playback.url) audioRef.current.load()
      }
    } catch { if (request === requestRef.current.revision) setError('Audio couldn\'t be loaded. Tap to retry.') }
    finally { if (request === requestRef.current.revision) { busyRef.current = false; setLoading(false) } }
  }

  function togglePlayback() {
    if (!signedIn) { setUpgrade(true); return }
    if (playing) { audioRef.current?.pause(); videoRef.current?.pause(); return }
    if (playback?.sourceType === 'youtube') { videoRef.current?.play(); return }
    if (audioRef.current && playback && !audioRef.current.error && (source?.expiresAt == null || currentEpochMs() < source.expiresAt)) {
      void startMedia(audioRef.current)
      return
    }
    playRequestedRef.current = true
    void loadPlayback()
  }

  function seekTo(seconds: number) {
    if (audioRef.current) audioRef.current.currentTime = seconds
    videoRef.current?.seek(seconds)
    setPosition(seconds)
    onPositionChange?.(seconds, playback?.timings ?? null)
  }

  function queueProgress(seconds: number, completed = false) {
    const updatedAt = recordProgress(authKey, audio.chapterId, audio.language, seconds, completed)
    const request = progressQueueRef.current.catch(() => {}).then(async () => {
      try {
        await saveAudioProgress(audio.chapterId, seconds, completed, audio.language, authKey)
        markProgressSynced(authKey, audio.chapterId, audio.language, updatedAt)
      } catch {
        // The outbox retains the entry for a later online retry.
      }
    })
    progressQueueRef.current = request
    void request.catch(() => {})
  }

  function persistSeek(seconds: number) {
    queueProgress(seconds, false)
  }

  useEffect(() => { loadPlaybackRef.current = loadPlayback; seekToRef.current = seekTo; persistSeekRef.current = persistSeek; queueProgressRef.current = queueProgress })
  useEffect(() => {
    if (!seekRequest) return
    pendingSeekRef.current = seekRequest.seconds
    if (!playback?.timings) {
      pendingSeekRef.current = seekRequest.seconds
      if (!busyRef.current) void loadPlaybackRef.current()
      return
    }
    let active = true
    queueMicrotask(() => { if (active) { seekToRef.current(seekRequest.seconds); persistSeekRef.current(seekRequest.seconds) } })
    return () => { active = false }
  }, [seekRequest, playback?.timings])

  useEffect(() => {
    if (!playback || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
    const metadata = new MediaMetadata({ title: chapterTitle, artist: audio.narrator ?? 'ArabicWithM', album: 'ArabicWithM Audiobooks' })
    navigator.mediaSession.metadata = metadata
    return () => { if (navigator.mediaSession.metadata === metadata) navigator.mediaSession.metadata = null }
  }, [audio.narrator, chapterTitle, playback])

  const savePosition = (completed = false) => {
    const element = audioRef.current
    if (!element) return
    queueProgress(completed ? 0 : element.currentTime, completed)
  }

  function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` }

  const button = dedicated
    ? <Button data-reader-audio-trigger disabled={loading || authLoading} onClick={togglePlayback}
        startIcon={playing ? <PauseRounded /> : <PlayArrowRounded />}
        sx={{ minHeight: 44, width: '100%', px: 2, color: 'var(--awm-white)', bgcolor: 'var(--awm-forest)', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif' }}>
        {authLoading ? 'Checking account…' : loading ? 'Preparing audio…' : playing ? 'Pause Audio' : label}
      </Button>
    : <Button data-reader-audio-trigger aria-expanded={expanded} aria-controls="reader-audio-panel" disabled={loading || authLoading} onClick={() => onExpandedChange(!expanded)}
        startIcon={<VolumeUp />}
        sx={{
          minHeight: 44, px: 2,
          /* Gold highlight while the control panel is open. */
          color: expanded ? '#fff' : { xs: 'var(--awm-bark)', md: '#fff' },
          bgcolor: expanded ? '#b8860b' : { xs: 'var(--awm-white)', md: 'rgba(255,255,255,.08)' },
          border: '1px solid',
          borderColor: expanded ? '#b8860b' : { xs: 'var(--awm-gold)', md: 'rgba(255,255,255,.25)' },
          textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif',
        }}>
        {authLoading ? 'Checking account…' : 'Audio'}
      </Button>

  const mediaAudio = playback?.sourceType === 'supabase_storage'
    ? <audio ref={audioRef} controls={false} preload="metadata" src={playback.url}
        onLoadedMetadata={event => {
          const element = event.currentTarget
          element.playbackRate = rate
          const pendingSeek = pendingSeekRef.current
          const position = pendingSeek ?? resumeRef.current ?? playback.positionSeconds
          if (Number.isFinite(element.duration)) element.currentTime = Math.min(position, Math.max(0, element.duration - 1))
          setDuration(Number.isFinite(element.duration) ? element.duration : audio.durationSeconds ?? 0)
          setPosition(element.currentTime)
          onPositionChange?.(element.currentTime, playback.timings)
          if (pendingSeek !== null) { pendingSeekRef.current = null; persistSeekRef.current(element.currentTime) }
          resumeRef.current = null
          lastSavedRef.current = Math.floor(element.currentTime)
          if (playRequestedRef.current) { playRequestedRef.current = false; void startMedia(element) }
        }}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={event => { const time = event.currentTarget.currentTime; setPosition(time); onPositionChange?.(time, playback.timings); const second = Math.floor(time); if (Math.abs(second - lastSavedRef.current) >= 10) { lastSavedRef.current = second; savePosition() } }}
        onPause={() => { setPlaying(false); savePosition() }} onEnded={() => { setPlaying(false); savePosition(true) }}
        onError={() => { setPlaying(false); setError('Audio couldn\'t be loaded. Tap to retry.') }} style={{ display: 'none' }} />
    : null
  const mediaYouTube = playback?.sourceType === 'youtube'
    ? <YouTubeAudio playback={playback} rate={rate} onRates={setYoutubeRates} hideFrame={!dedicated} controlsRef={videoRef} onPlaying={setPlaying} onDuration={setDuration} onTime={time => {
        setPosition(time)
        onPositionChange?.(time, playback.timings)
        if (Math.abs(time - lastSavedRef.current) >= 10) { lastSavedRef.current = time; queueProgress(time, false) }
      }} />
    : null

  const player = dedicated
    ? (playback || error) ? <Paper component="section" aria-label="Chapter audio" elevation={0} sx={{ p: 1.5, minWidth: 0, borderRadius: 0, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'var(--awm-white)' }}>
        {mediaAudio}
        {mediaYouTube}
        {speedControl}
        {dedicated && <Box sx={{ px: 1, pt: 1 }}>
          <Slider aria-label="Audiobook position" min={0} max={duration || 1} step={1} marks={pageMarkers.map(marker=>({value:marker.seconds,label:`P${marker.page}`}))} value={Math.min(position, duration || 1)} disabled={!playback || !duration} onChange={(_, value) => {
            seekTo(value as number)
          }} onChangeCommitted={(_, value) => persistSeek(value as number)} sx={{ color: 'var(--awm-gold)', py: 2, ...(pageMarkers.length ? PAGE_MARKER_SX : {}) }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 13 }}>{formatTime(position)}</Typography><Typography sx={{ fontSize: 13 }}>{formatTime(duration)}</Typography></Box>
        </Box>}
        {error && <Alert severity="info" action={<Button startIcon={<RefreshRounded />} onClick={() => { playRequestedRef.current = true; void loadPlayback() }}>Retry audio</Button>}>{error}</Alert>}
      </Paper> : null
    : <Collapse in={expanded} timeout={260} unmountOnExit={false}>
        {/* Compact control bar under the reader controls. Mobile: two tidy
           rows (transport + slider, then skip/time/language); desktop: one
           translucent pill. Media lives inside the collapse so playback
           survives the panel closing (Collapse keeps children mounted). */}
        <Box
          id="reader-audio-panel"
          component="section"
          aria-label="Chapter audio"
          sx={{
            mt: 1.5, mb: 0.5, mx: { xs: 0.75, md: 1.5 }, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { xs: 0.75, md: 1.25 },
            rowGap: { xs: 1, md: 1.25 },
            justifyContent: { xs: 'space-between', md: 'flex-start' },
            px: { xs: 1, md: 1.25 }, py: { xs: 1.25, md: 1 }, borderRadius: { xs: '10px', md: '9999px' },
            color: 'var(--awm-bark)',
            bgcolor: 'var(--awm-white)',
            border: 0,
          }}
        >
          {/* Transport trio grouped as one control on mobile (contents on
              desktop so each button joins the single pill row). */}
          <Box sx={{ order: { xs: 4, md: 0 }, display: { xs: 'inline-flex', md: 'contents' }, gap: { xs: 1, md: 0 }, alignItems: 'center', alignSelf: 'center' }}>
            <IconButton aria-label={playing ? 'Pause audio' : 'Play audio'} onClick={togglePlayback} disabled={loading || authLoading} sx={{ ...CONTROL_BUTTON_SX, order: { xs: 4, md: 1 } }}>
              {loading ? <CircularProgress size={16} sx={{ color: 'currentColor' }} /> : playing ? <PauseRounded /> : <PlayArrowRounded />}
            </IconButton>
          </Box>
          {timedMeta}
          <Slider
            aria-label="Audio position"
            min={0}
            max={duration || 1}
            step={1}
            marks={pageMarkers.map(marker=>({value:marker.seconds,label:`P${marker.page}`}))}
            value={Math.min(position, duration || 1)}
            disabled={!playback || !duration}
            onChange={(_, value) => seekTo(value as number)}
            onChangeCommitted={(_, value) => persistSeek(value as number)}
            sx={{ order: { xs: 3, md: 4 }, mx: { xs: 1, md: 0 }, ml: { md: 2 }, flex: { xs: '1 1 100%', md: '1 1 210px' }, color: '#b8860b', py: { xs: 0.25, md: 0.5 }, ...(pageMarkers.length ? PAGE_MARKER_SX : {}), '& .MuiSlider-thumb': { width: 14, height: 14 }, '& .MuiSlider-track, & .MuiSlider-rail': { height: 4 } }}
          />
          {pageMarkers.length === 0 && <Typography sx={{ order: { xs: 7, md: 5 }, ml: { xs: 'auto', md: 0 }, fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 11.5, md: 13 }, fontWeight: 600, minWidth: { xs: 68, md: 84 }, height: { xs: 32, md: 36 }, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            {formatTime(position)} / {formatTime(duration)}
          </Typography>}
          {audioLanguages && audioLanguages.length > 1 && onLanguageChange && (
            <ButtonGroup size="small" aria-label="Audio language" sx={{ order: { xs: 1, md: 6 }, ml: 'auto', '& .MuiButton-root': { minWidth: 0, px: { xs: 1, md: 1.75 }, py: { xs: 0.3, md: 0.75 }, fontSize: { xs: 11, md: 13.5 }, lineHeight: 1.2, textTransform: 'none', whiteSpace: 'nowrap' } }}>
              {audioLanguages.map(value => (
                <Button
                  key={value}
                  onClick={() => onLanguageChange(value)}
                  aria-pressed={language === value}
                  aria-label={value === 'ar' ? 'Arabic audio' : 'English audio'}
                  variant={language === value ? 'contained' : 'outlined'}
                  sx={{ color: language === value ? '#fff' : 'inherit', bgcolor: language === value ? '#b8860b' : 'transparent', borderColor: 'rgba(184,134,11,0.5)' }}
                >
                  {value === 'ar' ? 'العربية' : 'English'}
                </Button>
              ))}
            </ButtonGroup>
          )}
          {error && (
            <Box sx={{ flexBasis: '100%', minWidth: 0 }}>
              <Alert severity="info" sx={{ py: 0, alignItems: 'center' }} action={<Button startIcon={<RefreshRounded />} onClick={() => { playRequestedRef.current = true; void loadPlayback() }}>Retry audio</Button>}>{error}</Alert>
            </Box>
          )}
        </Box>
        {mediaAudio}
        {mediaYouTube}
      </Collapse>
  return <>
    {render ? render({ button, player }) : <Box>{button}{player}</Box>}
    <PremiumPrompt key={authKey} open={upgrade} onClose={() => setUpgrade(false)} reason="Audiobook playback is available with AWM+." />
  </>
}
