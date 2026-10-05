'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, DialogActions, Paper, Typography } from '@mui/material'
import { HeadphonesRounded, LockOutlined, PlayArrowRounded, RefreshRounded } from '@mui/icons-material'
import { requestChapterAudio, saveAudioProgress, type ChapterAudioPlayback, type ChapterAudioSummary } from '@/app/actions/audiobooks'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'

function YouTubeAudio({ playback }: { playback: Extract<ChapterAudioPlayback, { sourceType: 'youtube' }> }) {
  const { wrapRef, errorCode, retry } = useYouTubePlayer(playback.videoId, undefined, playback.positionSeconds)
  const message = errorCode === 100
    ? 'This YouTube video is private, removed, or unavailable. Ask the administrator for an unlisted or public source.'
    : errorCode === 101 || errorCode === 150
      ? 'The video owner has disabled embedded playback. Ask the administrator to enable embedding or upload the audio.'
      : 'YouTube could not play this video. Try again or ask the administrator to check the source.'
  return <>
    <Box ref={wrapRef} sx={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: '10px', '& iframe': { width: '100%', height: '100%', border: 0 } }} />
    {errorCode !== null && <Alert severity="warning" action={<Button onClick={retry}>Retry YouTube</Button>}>{message}</Alert>}
  </>
}

function durationLabel(seconds: number | null): string | null {
  if (!seconds) return null
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
}

export default function ChapterAudioPlayer({ audio, chapterTitle, compact = false, label = 'Audio' }: { audio: ChapterAudioSummary; chapterTitle: string; compact?: boolean; label?: string }) {
  const [playback, setPlayback] = useState<ChapterAudioPlayback | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const lastSavedRef = useRef(0)
  const [open, setOpen] = useState(false)
  const resumeRef = useRef<number | null>(null)
  const playRequestedRef = useRef(false)

  async function loadPlayback() {
    setLoading(true); setError('')
    if (audioRef.current) resumeRef.current = audioRef.current.currentTime
    try { setPlayback(await requestChapterAudio(audio.chapterId, audio.language)) }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to start playback.'
      if (message.includes('AWM+') || message.includes('Sign in')) setUpgrade(true)
      else setError(message)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!playback || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: chapterTitle, artist: audio.narrator ?? 'ArabicWithM', album: 'ArabicWithM Audiobooks' })
    return () => { navigator.mediaSession.metadata = null }
  }, [audio.narrator, chapterTitle, playback])

  const savePosition = (completed = false) => {
    const element = audioRef.current
    if (!element) return
    void saveAudioProgress(audio.chapterId, completed ? 0 : element.currentTime, completed, audio.language).catch(() => {})
  }

  const metadata = [audio.narrator ? `Narrated by ${audio.narrator}` : null, durationLabel(audio.durationSeconds)].filter(Boolean).join(' · ')
  const player = <Paper component="section" elevation={0} sx={{ mb: compact ? 0 : 3, p: { xs: 2, sm: 2.5 }, borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-gold) 25%, transparent)', bgcolor: 'var(--awm-white)' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: playback ? 1.5 : 0 }}>
      <HeadphonesRounded sx={{ color: 'var(--awm-gold)' }} />
      <Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700, color: 'var(--awm-bark)' }}>Listen to this chapter · {audio.language === 'en' ? 'English' : 'Arabic'}</Typography>{metadata && <Typography variant="body2" color="text.secondary">{metadata}</Typography>}</Box>
      {!playback && <Button disabled={loading} onClick={() => void loadPlayback()} variant="contained" startIcon={<LockOutlined />} sx={{ bgcolor: 'var(--awm-gold)', textTransform: 'none', '&:hover': { bgcolor: '#946c08' } }}>{loading ? 'Loading…' : 'Listen with AWM+'}</Button>}
    </Box>
    {playback?.sourceType === 'supabase_storage' && <audio
      key={playback.url}
      ref={audioRef}
      controls
      preload="metadata"
      src={playback.url}
      onLoadedMetadata={(event) => {
        const element = event.currentTarget
        element.currentTime = Math.min(resumeRef.current ?? playback.positionSeconds, Math.max(0, element.duration - 1))
        if (playRequestedRef.current) { playRequestedRef.current = false; void element.play().catch(() => setError('Press Play in the audio controls to begin playback.')) }
      }}
      onTimeUpdate={(event) => { const second = Math.floor(event.currentTarget.currentTime); if (second - lastSavedRef.current >= 10) { lastSavedRef.current = second; savePosition() } }}
      onPause={() => savePosition()}
      onEnded={() => savePosition(true)}
      onError={() => setError('Audio could not load or playback was interrupted. Refresh the audio to try again.')}
      style={{ width: '100%' }}
    />}
    {playback?.sourceType === 'youtube' && <YouTubeAudio playback={playback} />}
    {error && <Alert severity="warning" sx={{ mt: 1.5 }} action={<Button startIcon={<RefreshRounded />} onClick={() => void loadPlayback()}>Refresh audio</Button>}>{error}</Alert>}
    <PremiumPrompt open={upgrade} onClose={() => setUpgrade(false)} reason="Audiobook playback is available with AWM+." />
  </Paper>
  if (!compact) return player
  return <><Button startIcon={<PlayArrowRounded sx={{ fontSize: 17 }} />} onClick={() => { setOpen(true); playRequestedRef.current = true; if (!playback) void loadPlayback() }} aria-haspopup="dialog" sx={{ minHeight: 44, color: '#fff', border: '1px solid rgba(255,255,255,0.25)', textTransform: 'none', fontFamily: 'Jost, sans-serif' }}>{label}</Button>
    <Dialog open={open} onClose={() => { savePosition(); audioRef.current?.pause(); setOpen(false) }} fullWidth maxWidth="sm"><DialogTitle>{chapterTitle} · {audio.language === 'en' ? 'English' : 'Arabic'} Audio</DialogTitle><DialogContent>{player}</DialogContent><DialogActions><Button onClick={() => { savePosition(); audioRef.current?.pause(); setOpen(false) }}>Close</Button></DialogActions></Dialog>
  </>
}
