'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'
import { NavigateNext } from '@mui/icons-material'
import { fetchForYouClips } from '@/app/actions/forYou'
import type { ForYouClip, ForYouToken } from '@/app/lib/forYou'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'

export function ForYouWords({ tokens }: { tokens: ForYouToken[] }) {
  return <Box dir="rtl" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, py: 1 }}>
    {tokens.map((token, index) => <Box key={index} component="span" sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
      <Typography component="span" lang="ar" sx={{ fontFamily: 'var(--font-serif)', fontSize: { xs: '1.8rem', md: '2.2rem' } }}>{token.arabic}</Typography>
      {token.english && <Typography component="span" lang="en" dir="ltr" sx={{ fontFamily: 'var(--font-sans)', fontSize: '.9rem', color: 'text.secondary', whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center' }}>{token.english}</Typography>}
    </Box>)}
  </Box>
}

function ClipPlayer({ clip }: { clip: ForYouClip }) {
  const [time, setTime] = useState(clip.clip_start_ms / 1000)
  const { wrapRef, errorCode, retry } = useYouTubePlayer(clip.video.youtube_id, setTime, clip.clip_start_ms / 1000, { endAt: clip.clip_end_ms / 1000 })
  const active = clip.segments.find(s => s.start_seconds <= time && s.end_seconds > time) ?? clip.segments[0]
  return <Box>
    <Typography variant="h5" dir="auto" sx={{ color: { xs: 'var(--awm-bark)', md: '#f5ede0' }, fontFamily: 'var(--font-heading)', fontWeight: 600, textAlign: 'center', mb: 2 }}>{clip.video.title}</Typography>
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', bgcolor: '#000', borderRadius: { xs: '12px', md: '20px' }, overflow: 'hidden', border: { md: '1px solid rgba(255,255,255,0.08)' }, boxShadow: { md: '0 30px 80px rgba(0,0,0,0.55)' } }}>
      <Box ref={wrapRef} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </Box>
    {errorCode && <Alert severity="warning" sx={{ mt: 2 }}>The video could not be loaded. <Button onClick={retry}>Retry</Button></Alert>}
    {active && <Box sx={{ mt: { xs: 2, md: 3 }, color: { md: '#f5ede0' } }}>
      {active.tokens.length ? <ForYouWords tokens={active.tokens} /> : <Typography lang="ar" dir="rtl" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, textAlign: 'center' }}>{active.original_text}</Typography>}
      {active.english_text && <Typography lang="en" dir="ltr" sx={{ mt: 0.5, textAlign: 'center', color: 'text.secondary' }}>{active.english_text}</Typography>}
    </Box>}
  </Box>
}

export default function ForYouFeed({ initialClips, switcher }: { initialClips?: ForYouClip[]; switcher?: ReactNode }) {
  const [clips, setClips] = useState<ForYouClip[]>(initialClips ?? [])
  const [loadStarted, setLoadStarted] = useState(Boolean(initialClips?.length))
  const [index, setIndex] = useState(0), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [excluded, setExcluded] = useState<number[]>([])
  // Clips are fetched lazily: the explore feed is the default view, so this
  // data is only requested the first time someone opens the For You view.
  useEffect(() => {
    if (loadStarted) return
    setLoadStarted(true)
    void next()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function next() {
    if (busy) return
    setBusy(true); setError('')
    const seen = [...excluded, ...(clips[index]?.segments.map(s => s.id) ?? [])]
    try {
      // Requery on every navigation; do not retain prefetched unpublished clips.
      const batch = await fetchForYouClips(crypto.randomUUID(), seen.slice(-10000), clips.slice(0, index + 1).map(c => c.video.id).slice(-100))
      setExcluded(seen.slice(-10000)); setClips(batch); setIndex(0)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load clips.') } finally { setBusy(false) }
  }

  return <Box component="main" sx={{ minHeight: { md: 'calc(100dvh - var(--awm-navbar-height))' }, bgcolor: { xs: 'var(--awm-cream-light)', md: '#0a0c0b' }, py: { xs: 3, md: 5 } }}>
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3 } }}>
      <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--awm-gold)', textAlign: 'center' }}>For You</Typography>
      <Box sx={{ mt: 0.75, mb: { xs: 2, md: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {clips[index]
          ? <ClipPlayer key={`${clips[index].video.id}:${clips[index].clip_start_ms}`} clip={clips[index]} />
          : <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>{busy ? 'Loading clips…' : 'No more clips available.'}</Typography>}
      </Box>
      <Box sx={{ mt: { xs: 3, md: 4 }, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {switcher}
        <Button variant="contained" endIcon={<NavigateNext />} disabled={busy} onClick={() => void next()} sx={{ bgcolor: '#b8860b', color: '#fff', px: 3.5, py: 1.1, borderRadius: '9999px', textTransform: 'none', fontWeight: 700, fontSize: '0.95rem', '&:hover': { bgcolor: '#a07c0a' } }}>
          {busy ? 'Loading…' : 'Next clip'}
        </Button>
      </Box>
    </Box>
  </Box>
}
