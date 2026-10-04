'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { HeadphonesRounded, LockOutlined, RefreshRounded } from '@mui/icons-material'
import { requestChapterAudio, saveAudioProgress, type ChapterAudioPlayback, type ChapterAudioSummary } from '@/app/actions/audiobooks'
import PremiumPrompt from '@/app/components/PremiumPrompt'

function durationLabel(seconds: number | null): string | null {
  if (!seconds) return null
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
}

export default function ChapterAudioPlayer({ audio, chapterTitle }: { audio: ChapterAudioSummary; chapterTitle: string }) {
  const [playback, setPlayback] = useState<ChapterAudioPlayback | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const lastSavedRef = useRef(0)

  async function loadPlayback() {
    setLoading(true); setError('')
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
  return <Paper component="section" elevation={0} sx={{ mb: 3, p: { xs: 2, sm: 2.5 }, borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-gold) 25%, transparent)', bgcolor: 'var(--awm-white)' }}>
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
      onLoadedMetadata={(event) => { event.currentTarget.currentTime = Math.min(playback.positionSeconds, Math.max(0, event.currentTarget.duration - 1)) }}
      onTimeUpdate={(event) => { const second = Math.floor(event.currentTarget.currentTime); if (second - lastSavedRef.current >= 10) { lastSavedRef.current = second; savePosition() } }}
      onPause={() => savePosition()}
      onEnded={() => savePosition(true)}
      onError={() => setError('The secure audio link expired or playback was interrupted. Refresh it to continue.')}
      style={{ width: '100%' }}
    />}
    {playback?.sourceType === 'youtube' && <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: '10px' }}><iframe title={`${chapterTitle} audiobook`} src={`https://www.youtube-nocookie.com/embed/${playback.videoId}?start=${playback.positionSeconds}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} /></Box>}
    {error && <Alert severity="warning" sx={{ mt: 1.5 }} action={playback ? <Button startIcon={<RefreshRounded />} onClick={() => void loadPlayback()}>Refresh audio</Button> : undefined}>{error}</Alert>}
    <PremiumPrompt open={upgrade} onClose={() => setUpgrade(false)} reason="Audiobook playback is available with AWM+." />
  </Paper>
}
