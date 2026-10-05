'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Alert, Box, Button, Paper } from '@mui/material'
import { PauseRounded, PlayArrowRounded, RefreshRounded } from '@mui/icons-material'
import { requestChapterAudioResult, saveAudioProgress, type ChapterAudioPlayback, type ChapterAudioSummary } from '@/app/actions/audiobooks'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import { useAuth } from '@/app/AuthContext'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'

type VideoControls = { play: () => void; pause: () => void }

function YouTubeAudio({ playback, controlsRef, onPlaying }: {
  playback: Extract<ChapterAudioPlayback, { sourceType: 'youtube' }>
  controlsRef: RefObject<VideoControls | null>
  onPlaying: (playing: boolean) => void
}) {
  const { wrapRef, errorCode, retry, isPlaying, playWithSound, pauseVideo } = useYouTubePlayer(playback.videoId, undefined, playback.positionSeconds, { autoplay: true })
  useEffect(() => { controlsRef.current = { play: playWithSound, pause: pauseVideo }; return () => { controlsRef.current = null } }, [controlsRef, pauseVideo, playWithSound])
  useEffect(() => { onPlaying(isPlaying) }, [isPlaying, onPlaying])
  const message = errorCode === 100 ? 'This YouTube video is private, removed, or unavailable.'
    : errorCode === 101 || errorCode === 150 ? 'The video owner has disabled embedded playback.'
      : 'YouTube could not play this video. Try again.'
  return <>
    <Box ref={wrapRef} sx={{ width: '100%', maxWidth: 480, aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: '10px' }} />
    {errorCode !== null && <Alert severity="warning" action={<Button onClick={retry}>Retry YouTube</Button>}>{message}</Alert>}
  </>
}

interface AudioLayout { button: ReactNode; player: ReactNode }
interface Props {
  audio: ChapterAudioSummary
  chapterTitle: string
  label?: string
  render?: (layout: AudioLayout) => ReactNode
}

/** One media element owned by the reader; presentation never owns playback. */
export default function ChapterAudioPlayer({ audio, chapterTitle, label = 'Play Audio', render }: Props) {
  const { user } = useAuth()
  const authKey = user?.id ?? 'signed-out'
  return <AudioSession key={`${authKey}:${audio.chapterId}:${audio.language}`} audio={audio} chapterTitle={chapterTitle} label={label} render={render} authKey={authKey} signedIn={Boolean(user)} />
}

function AudioSession({ audio, chapterTitle, label, render, authKey, signedIn }: Props & { authKey: string; signedIn: boolean }) {
  const [source, setSource] = useState<{ authKey: string; playback: ChapterAudioPlayback; expiresAt: number | null } | null>(null)
  const playback = source?.authKey === authKey ? source.playback : null
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
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

  async function startMedia(element: HTMLAudioElement) {
    try { await element.play(); setError('') }
    catch (cause) {
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') setError('Tap Play Audio to begin listening.')
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

  const button = <Button data-reader-audio-trigger disabled={loading} onClick={togglePlayback}
    startIcon={playing ? <PauseRounded /> : <PlayArrowRounded />}
    sx={{ minHeight: 44, width: { xs: '100%', md: 'auto' }, px: 2, borderRadius: '10px', color: { xs: 'var(--awm-bark)', md: '#fff' }, bgcolor: { xs: 'var(--awm-white)', md: 'rgba(255,255,255,.08)' }, border: '1px solid', borderColor: { xs: 'var(--awm-gold)', md: 'rgba(255,255,255,.25)' }, textTransform: 'none', fontFamily: 'Jost, sans-serif' }}>
    {loading ? 'Preparing audio…' : playing ? 'Pause Audio' : label}
  </Button>
  const player = <>
    {(playback || error) && <Paper component="section" aria-label="Chapter audio" elevation={0} sx={{ p: 1.5, minWidth: 0, borderRadius: 0, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'var(--awm-white)' }}>
      {playback?.sourceType === 'supabase_storage' && <audio ref={audioRef} controls preload="metadata" src={playback.url}
        onLoadedMetadata={event => {
          const element = event.currentTarget
          const position = resumeRef.current ?? playback.positionSeconds
          if (Number.isFinite(element.duration)) element.currentTime = Math.min(position, Math.max(0, element.duration - 1))
          resumeRef.current = null
          lastSavedRef.current = Math.floor(element.currentTime)
          if (playRequestedRef.current) { playRequestedRef.current = false; void startMedia(element) }
        }}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={event => { const second = Math.floor(event.currentTarget.currentTime); if (Math.abs(second - lastSavedRef.current) >= 10) { lastSavedRef.current = second; savePosition() } }}
        onPause={() => { setPlaying(false); savePosition() }} onEnded={() => { setPlaying(false); savePosition(true) }}
        onError={() => { setPlaying(false); setError('Audio couldn\'t be loaded. Tap to retry.') }} style={{ display: 'block', width: '100%' }} />}
      {playback?.sourceType === 'youtube' && <YouTubeAudio playback={playback} controlsRef={videoRef} onPlaying={setPlaying} />}
      {error && <Alert severity="info" action={<Button startIcon={<RefreshRounded />} onClick={() => { playRequestedRef.current = true; void loadPlayback() }}>Retry audio</Button>}>{error}</Alert>}
    </Paper>}
  </>
  return <>
    {render ? render({ button, player }) : <Box>{button}{player}</Box>}
    <PremiumPrompt key={authKey} open={upgrade} onClose={() => setUpgrade(false)} reason="Audiobook playback is available with AWM+." />
  </>
}
