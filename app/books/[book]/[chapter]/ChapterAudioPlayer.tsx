'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Alert, Box, Button, ButtonGroup, CircularProgress, Collapse, IconButton, Paper, Slider, Typography } from '@mui/material'
import { ExpandLess, Forward10Rounded, PauseRounded, PlayArrowRounded, RefreshRounded, Replay10Rounded, VolumeUp } from '@mui/icons-material'
import { requestChapterAudioResult, saveAudioProgress, type ChapterAudioPlayback, type ChapterAudioSummary } from '@/app/actions/audiobooks'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import { useAuth } from '@/app/AuthContext'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { BOOK_LANGUAGE_STOP_EVENT } from '@/app/lib/bookReaderSettings'

type VideoControls = { play: () => void; pause: () => void; seek: (seconds: number) => void; time: () => number }

function YouTubeAudio({ playback, controlsRef, onPlaying, onTime, onDuration, hideFrame = false }: {
  playback: Extract<ChapterAudioPlayback, { sourceType: 'youtube' }>
  controlsRef: RefObject<VideoControls | null>
  onDuration: (duration: number) => void
  onTime: (time: number) => void
  onPlaying: (playing: boolean) => void
  hideFrame?: boolean
}) {
  const { wrapRef, errorCode, retry, isPlaying, playWithSound, pauseVideo, seekToOnly, getCurrentTime, getDuration } = useYouTubePlayer(playback.videoId, onTime, playback.positionSeconds, { autoplay: true })
  useEffect(() => { controlsRef.current = { play: playWithSound, pause: pauseVideo, seek: seekToOnly, time: getCurrentTime }; return () => { controlsRef.current = null } }, [controlsRef, pauseVideo, playWithSound, seekToOnly, getCurrentTime])
  useEffect(() => { onPlaying(isPlaying) }, [isPlaying, onPlaying])
  useEffect(() => { const timer = setInterval(() => { const duration = getDuration?.() ?? 0; if (duration > 0) onDuration(duration) }, 1000); return () => clearInterval(timer) }, [getDuration, onDuration])
  const message = errorCode === 100 ? 'This YouTube video is private, removed, or unavailable.'
    : errorCode === 101 || errorCode === 150 ? 'The video owner has disabled embedded playback.'
      : 'YouTube could not play this video. Try again.'
  return <>
    <Box ref={wrapRef} sx={{ display: hideFrame ? 'none' : undefined, width: '100%', maxWidth: 480, aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: '10px' }} />
    {errorCode !== null && <Alert severity="warning" action={<Button onClick={retry}>Retry YouTube</Button>}>{message}</Alert>}
  </>
}

interface AudioLayout { button: ReactNode; player: ReactNode }
interface Props {
  audio: ChapterAudioSummary
  chapterTitle: string
  label?: string
  render?: (layout: AudioLayout) => ReactNode
  dedicated?: boolean
  /* Available narration languages + the reader's current language; drives the
     language pills in the inline (non-dedicated) control panel. */
  audioLanguages?: Array<'ar' | 'en'>
  language?: 'ar' | 'en'
  onLanguageChange?: (language: 'ar' | 'en') => void
}

const CONTROL_BUTTON_SX = {
  width: 36,
  height: 36,
  flex: '0 0 auto',
  color: 'inherit',
  border: '1px solid',
  borderColor: { xs: 'rgba(184,134,11,0.5)', md: 'rgba(255,255,255,0.3)' },
  '&.Mui-disabled': { color: 'inherit', opacity: 0.45 },
} as const

/** One media element owned by the reader; presentation never owns playback. */
export default function ChapterAudioPlayer({ audio, chapterTitle, label = 'Play Audio', render, dedicated, audioLanguages, language, onLanguageChange }: Props) {
  const { user, loading: authLoading } = useAuth()
  const authKey = user?.id ?? 'signed-out'
  return <AudioSession key={`${authKey}:${audio.chapterId}:${audio.language}`} audio={audio} chapterTitle={chapterTitle} label={label} render={render} dedicated={dedicated} audioLanguages={audioLanguages} language={language} onLanguageChange={onLanguageChange} authKey={authKey} signedIn={Boolean(user)} authLoading={Boolean(authLoading)} />
}

function AudioSession({ audio, chapterTitle, label, render, dedicated, audioLanguages, language, onLanguageChange, authKey, signedIn, authLoading }: Props & { authKey: string; signedIn: boolean; authLoading: boolean }) {
  const [source, setSource] = useState<{ authKey: string; playback: ChapterAudioPlayback; expiresAt: number | null } | null>(null)
  const playback = source?.authKey === authKey ? source.playback : null
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(audio.durationSeconds ?? 0)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<VideoControls | null>(null)
  const lastSavedRef = useRef(0)
  const resumeRef = useRef<number | null>(null)
  const playRequestedRef = useRef(false)
  const requestRef = useRef({ revision: 0 })
  const busyRef = useRef(false)

  useEffect(() => {
    const request = requestRef.current
    return () => { request.revision++; busyRef.current = false; playRequestedRef.current = false }
  }, [authKey, audio.chapterId, audio.language])

  useEffect(() => {
    const element = audioRef.current
    return () => {
      if (!element) return
      element.pause()
      void saveAudioProgress(audio.chapterId, element.currentTime, false, audio.language, authKey).catch(() => {})
    }
  }, [authKey, audio.chapterId, audio.language, playback?.sourceType])

  useEffect(()=>{
    const stop=()=>{
      requestRef.current.revision++
      playRequestedRef.current=false;busyRef.current=false;resumeRef.current=null
      audioRef.current?.pause();videoRef.current?.pause()
      setPlaying(false);setLoading(false);setSource(null);setPosition(0)
      if('mediaSession' in navigator) navigator.mediaSession.playbackState='paused'
    }
    window.addEventListener(BOOK_LANGUAGE_STOP_EVENT,stop)
    return()=>window.removeEventListener(BOOK_LANGUAGE_STOP_EVENT,stop)
  },[])

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
      const result = await requestChapterAudioResult(audio.chapterId, audio.language)
      if (request !== requestRef.current.revision) return
      if (result.status === 'upgrade') { playRequestedRef.current = false; setUpgrade(true) }
      else if (result.status === 'error') { playRequestedRef.current = false; setError(result.message) }
      else {
        setSource({ authKey, playback: result.playback, expiresAt: result.playback.sourceType === 'supabase_storage' && result.playback.expiresIn > 0 ? Date.now() + result.playback.expiresIn * 1000 - 30_000 : null })
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
    if (audioRef.current && playback && !audioRef.current.error && (source?.expiresAt == null || Date.now() < source.expiresAt)) {
      void startMedia(audioRef.current)
      return
    }
    playRequestedRef.current = true
    void loadPlayback()
  }

  function skipBy(delta: number) {
    if (playback?.sourceType === 'youtube') { videoRef.current?.seek((videoRef.current.time?.() ?? 0) + delta); return }
    const element = audioRef.current
    if (!element) return
    const target = element.currentTime + delta
    element.currentTime = Number.isFinite(element.duration) ? Math.min(Math.max(0, target), element.duration) : Math.max(0, target)
  }

  useEffect(() => {
    if (!playback || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
    const metadata = new MediaMetadata({ title: chapterTitle, artist: audio.narrator ?? 'ArabicWithM', album: 'ArabicWithM Audiobooks' })
    navigator.mediaSession.metadata = metadata
    return () => { if (navigator.mediaSession.metadata === metadata) navigator.mediaSession.metadata = null }
  }, [audio.narrator, chapterTitle, playback])

  const savePosition = (completed = false) => {
    const element = audioRef.current
    if (!element) return
    void saveAudioProgress(audio.chapterId, completed ? 0 : element.currentTime, completed, audio.language, authKey).catch(() => {})
  }

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

  const button = dedicated
    ? <Button data-reader-audio-trigger disabled={loading || authLoading} onClick={togglePlayback}
        startIcon={playing ? <PauseRounded /> : <PlayArrowRounded />}
        sx={{ minHeight: 44, width: '100%', px: 2, color: 'var(--awm-white)', bgcolor: 'var(--awm-forest)', textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif' }}>
        {authLoading ? 'Checking account…' : loading ? 'Preparing audio…' : playing ? 'Pause Audio' : label}
      </Button>
    : <Button data-reader-audio-trigger aria-expanded={expanded} aria-controls="reader-audio-panel" disabled={loading || authLoading} onClick={() => setExpanded(value => !value)}
        startIcon={<VolumeUp />}
        sx={{ minHeight: 44, px: 2, color: { xs: 'var(--awm-bark)', md: '#fff' }, bgcolor: { xs: 'var(--awm-white)', md: 'rgba(255,255,255,.08)' }, border: '1px solid', borderColor: { xs: 'var(--awm-gold)', md: 'rgba(255,255,255,.25)' }, textTransform: 'none', fontFamily: 'var(--font-sans), sans-serif' }}>
        {authLoading ? 'Checking account…' : 'Audio'}
      </Button>

  const mediaAudio = playback?.sourceType === 'supabase_storage'
    ? <audio ref={audioRef} controls={false} preload="metadata" src={playback.url}
        onLoadedMetadata={event => {
          const element = event.currentTarget
          const position = resumeRef.current ?? playback.positionSeconds
          if (Number.isFinite(element.duration)) element.currentTime = Math.min(position, Math.max(0, element.duration - 1))
          setDuration(Number.isFinite(element.duration) ? element.duration : audio.durationSeconds ?? 0)
          setPosition(element.currentTime)
          resumeRef.current = null
          lastSavedRef.current = Math.floor(element.currentTime)
          if (playRequestedRef.current) { playRequestedRef.current = false; void startMedia(element) }
        }}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={event => { setPosition(event.currentTarget.currentTime); const second = Math.floor(event.currentTarget.currentTime); if (Math.abs(second - lastSavedRef.current) >= 10) { lastSavedRef.current = second; savePosition() } }}
        onPause={() => { setPlaying(false); savePosition() }} onEnded={() => { setPlaying(false); savePosition(true) }}
        onError={() => { setPlaying(false); setError('Audio couldn\'t be loaded. Tap to retry.') }} style={{ display: 'none' }} />
    : null
  const mediaYouTube = playback?.sourceType === 'youtube'
    ? <YouTubeAudio playback={playback} hideFrame={!dedicated} controlsRef={videoRef} onPlaying={setPlaying} onDuration={setDuration} onTime={time => {
        setPosition(time)
        if (Math.abs(time - lastSavedRef.current) >= 10) { lastSavedRef.current = time; void saveAudioProgress(audio.chapterId, time, false, audio.language, authKey).catch(() => {}) }
      }} />
    : null

  const player = dedicated
    ? (playback || error) ? <Paper component="section" aria-label="Chapter audio" elevation={0} sx={{ p: 1.5, minWidth: 0, borderRadius: 0, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'var(--awm-white)' }}>
        {mediaAudio}
        {mediaYouTube}
        {dedicated && <Box sx={{ px: 1, pt: 1 }}>
          <Slider aria-label="Audiobook position" min={0} max={duration || 1} step={1} value={Math.min(position, duration || 1)} disabled={!playback || !duration} onChange={(_, value) => {
            const seconds = value as number
            if (audioRef.current) audioRef.current.currentTime = seconds
            videoRef.current?.seek(seconds)
            setPosition(seconds)
          }} sx={{ color: 'var(--awm-gold)', py: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 13 }}>{formatTime(position)}</Typography><Typography sx={{ fontSize: 13 }}>{formatTime(duration)}</Typography></Box>
        </Box>}
        {error && <Alert severity="info" action={<Button startIcon={<RefreshRounded />} onClick={() => { playRequestedRef.current = true; void loadPlayback() }}>Retry audio</Button>}>{error}</Alert>}
      </Paper> : null
    : <Collapse in={expanded} timeout={260} unmountOnExit={false}>
        {/* Pill panel that unfolds under the reader controls; the media
           elements live inside the collapse too, so playback survives the
           panel closing (Collapse keeps its children mounted). */}
        <Box
          id="reader-audio-panel"
          component="section"
          aria-label="Chapter audio"
          sx={{
            mt: 1.5, mb: 0.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1,
            px: 1.25, py: 1, borderRadius: '9999px',
            color: { xs: 'var(--awm-bark)', md: '#fff' },
            bgcolor: { xs: 'var(--awm-white)', md: 'rgba(255,255,255,.08)' },
            border: '1px solid', borderColor: { xs: 'var(--awm-gold)', md: 'rgba(255,255,255,.25)' },
          }}
        >
          <IconButton aria-label={playing ? 'Pause audio' : 'Play audio'} onClick={togglePlayback} disabled={loading || authLoading} sx={CONTROL_BUTTON_SX}>
            {loading ? <CircularProgress size={18} sx={{ color: 'currentColor' }} /> : playing ? <PauseRounded /> : <PlayArrowRounded />}
          </IconButton>
          <IconButton aria-label="Back 10 seconds" onClick={() => skipBy(-10)} disabled={!playback} sx={CONTROL_BUTTON_SX}><Replay10Rounded /></IconButton>
          <IconButton aria-label="Forward 10 seconds" onClick={() => skipBy(10)} disabled={!playback} sx={CONTROL_BUTTON_SX}><Forward10Rounded /></IconButton>
          <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, fontWeight: 600, minWidth: 84, textAlign: 'center' }}>
            {formatTime(position)} / {formatTime(duration)}
          </Typography>
          {audioLanguages && audioLanguages.length > 1 && onLanguageChange && (
            <ButtonGroup size="small" aria-label="Audio language" sx={{ ml: 'auto', width: 150, '& .MuiButton-root': { flex: '1 1 0%', minWidth: 0, px: 1, py: 0.75, fontSize: 12, lineHeight: 1.2, textTransform: 'none', textAlign: 'center', justifyContent: 'center' } }}>
              {audioLanguages.map(value => (
                <Button
                  key={value}
                  onClick={() => onLanguageChange(value)}
                  aria-pressed={language === value}
                  aria-label={value === 'ar' ? 'Arabic audio' : 'English audio'}
                  variant={language === value ? 'contained' : 'outlined'}
                  sx={{ color: language === value ? '#fff' : 'inherit', bgcolor: language === value ? '#b8860b' : 'transparent', borderColor: { xs: 'rgba(184,134,11,0.5)', md: 'rgba(255,255,255,0.35)' } }}
                >
                  {value === 'ar' ? 'العربية' : 'English'}
                </Button>
              ))}
            </ButtonGroup>
          )}
          <IconButton aria-label="Collapse audio controls" onClick={() => setExpanded(false)} sx={{ ...CONTROL_BUTTON_SX, ml: audioLanguages && audioLanguages.length > 1 ? 0 : 'auto' }}>
            <ExpandLess />
          </IconButton>
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
