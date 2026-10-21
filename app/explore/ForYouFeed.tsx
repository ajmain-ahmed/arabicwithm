'use client'

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Alert, Box, Button, CircularProgress, IconButton, Skeleton, Typography, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch, Tooltip } from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp, SettingsOutlined } from '@mui/icons-material'
import { fetchForYouClips } from '@/app/actions/forYou'
import { displayArabic } from '@/app/lib/displayArabic'
import { hourlySeed } from '@/app/lib/forYou'
import type { ForYouClip, ForYouToken } from '@/app/lib/forYou'
import { useForYouCache } from '@/store/forYouStore'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { getExploreSoundPreference, setExploreSoundPreference, subscribeToExploreSoundPreference } from '@/app/lib/explore'

const MAX_RETAINED_CLIPS = 60

interface TranscriptSettings { tashkeel: boolean; meanings: boolean; sentence: boolean }
const DEFAULT_SETTINGS: TranscriptSettings = { tashkeel: true, meanings: true, sentence: true }

export function ForYouWords({ tokens, settings = DEFAULT_SETTINGS }: { tokens: ForYouToken[]; settings?: TranscriptSettings }) {
  return <Box dir="rtl" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, py: 1 }}>
    {tokens.map((token, index) => <Box component="span" key={index} sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography component="span" lang="ar" sx={{ color: 'inherit', fontFamily: 'var(--font-serif)', fontSize: { xs: '1.8rem', md: '2.2rem' } }}>{displayArabic(token.arabic, settings.tashkeel)}</Typography>
      {settings.meanings && token.english && <Typography component="span" lang="en" dir="ltr" sx={{ color: 'inherit', opacity: .75, fontSize: '.9rem', textAlign: 'center', overflowWrap: 'anywhere' }}>{token.english}</Typography>}
    </Box>)}
  </Box>
}

function ClipPlayer({ clip, leftControls, rightControls, settings }: { settings: TranscriptSettings; clip: ForYouClip; leftControls?: ReactNode; rightControls?: ReactNode }) {
  const [time, setTime] = useState(clip.clip_start_ms / 1000)
  const soundEnabled = useSyncExternalStore(subscribeToExploreSoundPreference, getExploreSoundPreference, () => true)
  const { wrapRef, errorCode, retry, isReady, isMuted, autoplayBlocked, playWithSound, mute } = useYouTubePlayer(clip.video.youtube_id, setTime, clip.clip_start_ms / 1000, { autoplay: true, muted: !soundEnabled, mutedAutoplayFallback: true, endAt: clip.clip_end_ms / 1000 })
  useEffect(() => { if (!soundEnabled) mute() }, [soundEnabled, mute])
  const active = clip.segments.find(s => s.start_seconds <= time && s.end_seconds > time) ?? clip.segments[0]
  return <Box>
    {/* Outer box = positioning context for the out-of-frame controls. */}
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#000', borderRadius: { xs: '12px', md: '16px' }, overflow: 'hidden', border: { md: '1px solid rgba(255,255,255,0.08)' }, boxShadow: { md: '0 30px 80px rgba(0,0,0,0.55)' } }}>
        <Box ref={wrapRef} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </Box>
      {leftControls}
      {rightControls}
    </Box>
    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>{isReady ? <Button onClick={() => { if (isMuted || autoplayBlocked) { setExploreSoundPreference(true); playWithSound() } else { setExploreSoundPreference(false); mute() } }} sx={{ minHeight: 44, color: { xs: 'var(--awm-forest)', md: 'var(--awm-gold-light)' } }}>{autoplayBlocked ? 'Play with sound' : isMuted ? 'Turn sound on' : 'Mute'}</Button> : <Typography sx={{ py: 1.5, fontSize: 12, textAlign: 'center', color: { xs: 'var(--awm-muted)', md: '#f5ede0' } }}>Use the player controls for playback and sound.</Typography>}</Box>
    {errorCode && <Alert severity="warning" sx={{ mt: 2 }}>The video could not be loaded. <Button onClick={retry}>Retry</Button></Alert>}
    {active && <Box sx={{ mt: { xs: 2, md: 3 }, color: { md: '#f5ede0' } }}>
      {active.tokens.length ? <ForYouWords key={active.id} tokens={active.tokens} settings={settings} /> : <Typography lang="ar" dir="rtl" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, textAlign: 'center' }}>{displayArabic(active.original_text, settings.tashkeel)}</Typography>}
      {settings.sentence && active.english_text && <Typography lang="en" dir="ltr" sx={{ mt: 0.5, textAlign: 'center', color: 'inherit', opacity: .75 }}>{active.english_text}</Typography>}
    </Box>}
  </Box>
}

function ChevronNav({ onUp, onDown, upDisabled, downDisabled, hidden, sx }: { onUp: () => void; onDown: () => void; upDisabled: boolean; downDisabled: boolean; hidden?: 'mobile' | 'desktop'; sx?: object }) {
  const button = (label: string, onClick: () => void, disabled: boolean, icon: ReactNode) => (
    <IconButton
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      sx={{
        width: { xs: 44, md: 50 }, height: { xs: 44, md: 50 },
        color: { xs: 'var(--awm-gold)', md: '#fff' },
        bgcolor: { xs: 'rgba(184,134,11,0.12)', md: 'rgba(255,255,255,0.14)' },
        '&:hover': { bgcolor: { xs: 'rgba(184,134,11,0.22)', md: 'rgba(255,255,255,0.24)' } },
        '&:disabled': { color: { xs: 'var(--awm-muted-light)', md: 'rgba(255,255,255,0.3)' }, bgcolor: { xs: 'transparent', md: 'rgba(255,255,255,0.06)' } },
      }}
    >
      {icon}
    </IconButton>
  )
  return (
    <Box sx={{ display: hidden === 'mobile' ? { xs: 'none', md: 'flex' } : { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: { xs: 0.75, md: 1.25 }, alignItems: 'center', flexShrink: 0, ...(sx ?? {}) }}>
      {button('Previous clip', onUp, upDisabled, <KeyboardArrowUp />)}
      {button('Next clip', onDown, downDisabled, <KeyboardArrowDown />)}
    </Box>
  )
}

/** Determinate loading state shown in place of the first clip: same page
    structure, with a skeleton video area and a 0-100% progress circle. The
    controls sit beside the skeleton exactly where they land once loaded. */
function ForYouLoading({ progress, leftControls, rightControls, mobileControls }: { progress: number; leftControls?: ReactNode; rightControls?: ReactNode; mobileControls?: ReactNode }) {
  return <Box>
    <Box sx={{ width: { xs: '100%', md: 'min(calc(100% - 160px), calc((100dvh - 390px) * 16 / 9))' }, mx: { md: 'auto' }, position: 'relative', left: 0 }}>
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', bgcolor: '#000', borderRadius: { xs: '12px', md: '16px' }, overflow: 'hidden', border: { md: '1px solid rgba(255,255,255,0.08)' } }}>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress variant="determinate" value={progress} size={58} sx={{ color: '#d4a843' }} />
            <Typography sx={{ mt: 1.25, fontFamily: 'var(--font-sans), sans-serif', fontSize: 12, fontWeight: 700, color: { xs: 'var(--awm-muted)', md: 'rgba(255,255,255,0.72)' } }}>{Math.round(progress)}%</Typography>
          </Box>
        </Box>
      </Box>
      {leftControls}
      {rightControls}
    </Box>
    <Box sx={{ mt: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'center', gap: 3 }}>
      <Skeleton variant="text" width={180} height={30} />
      <Skeleton variant="text" width={120} height={30} />
    </Box>
    {mobileControls && <Box sx={{ mt: { xs: 3 }, display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>{mobileControls}</Box>}
  </Box>
}

export default function ForYouFeed({ initialClips, switcher, railSwitcher, desktopControls }: { initialClips?: ForYouClip[]; switcher?: ReactNode; railSwitcher?: ReactNode; desktopControls?: (settings: ReactNode) => ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('awm-for-you-settings') ?? '{}')
      setSettings(Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => [key, typeof saved[key] === 'boolean' ? saved[key] : value])) as unknown as TranscriptSettings)
    } catch {}
  }, [])
  function toggleSetting(key: keyof TranscriptSettings) {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    try { localStorage.setItem('awm-for-you-settings', JSON.stringify(next)) } catch {}
  }
  /* Session cache: view switches restore clips, position, and exclusions. */
  const cachedClips = useForYouCache((state) => state.clips)
  const cachedIndex = useForYouCache((state) => state.index)
  const cachedExcluded = useForYouCache((state) => state.excluded)
  const setCache = useForYouCache((state) => state.setAll)
  const [clips, setClips] = useState<ForYouClip[]>(initialClips ?? cachedClips)
  const [loadStarted, setLoadStarted] = useState(Boolean(initialClips?.length) || cachedClips.length > 0)
  const [index, setIndex] = useState(cachedIndex), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [excluded, setExcluded] = useState<number[]>(cachedExcluded)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setCache(clips, index, excluded)
  }, [clips, index, excluded, setCache])
  // Clips are fetched lazily: the explore feed is the default view, so this
  // data is only requested the first time someone opens the For You view.
  useEffect(() => {
    if (loadStarted) return
    setLoadStarted(true)
    void loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ease the progress bar toward 90% while the initial request is in flight.
  useEffect(() => {
    if (!busy) return
    const timer = setInterval(() => {
      setProgress((value) => Math.min(90, value + Math.max(0.6, (90 - value) * 0.07)))
    }, 120)
    return () => clearInterval(timer)
  }, [busy])

  async function loadMore() {
    if (busy) return
    setBusy(true); setError('')
    if (clips.length === 0) setProgress(0)
    const seen = [...excluded, ...clips.slice(0, index + 1).flatMap((clip) => clip.segments.map((segment) => segment.id))]
    // First load of the session shares an hourly seed so the data cache can
    // serve every visitor in that window; later loads are unique.
    const seed = clips.length === 0 && excluded.length === 0 ? hourlySeed() : crypto.randomUUID()
    try {
      // Requery on every navigation; do not retain prefetched unpublished clips.
      const batch = await fetchForYouClips(seed, seen.slice(-10000), clips.slice(0, index + 1).map((clip) => clip.video.id).slice(-100))
      setExcluded(seen.slice(-10000))
      if (batch.length) {
        const merged = [...clips, ...batch]
        const trim = Math.max(0, merged.length - MAX_RETAINED_CLIPS)
        setClips(merged.slice(trim))
        setIndex(clips.length === 0 ? 0 : index + 1 - trim)
      }
      setProgress(100)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load clips.') } finally { setBusy(false) }
  }

  function step(offset: 1 | -1) {
    if (offset === -1) {
      setIndex((value) => Math.max(0, value - 1))
      return
    }
    if (index < clips.length - 1) setIndex(index + 1)
    else void loadMore()
  }

  const initialLoading = clips.length === 0 && busy

  return <Box component="main" sx={{ minHeight: { md: 'calc(100dvh - var(--awm-navbar-height))' }, bgcolor: { xs: 'var(--awm-cream-light)', md: '#0a0c0b' }, pt: { xs: 0, md: 3 }, pb: { xs: 3, md: 5 } }}>
    <Box sx={{ maxWidth: 2400, mx: 'auto', px: { xs: 2, sm: 3, md: 5 } }}>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', mb: 2 }}>
        {desktopControls?.(<Tooltip title="Transcript settings"><IconButton aria-label="Transcript settings" onClick={() => setSettingsOpen(true)} sx={{ width: 40, height: 40, borderRadius: '50%', color: 'var(--awm-cream)', bgcolor: 'rgba(255,255,255,.08)', ml: 1, mt: '5px', '&:hover': { bgcolor: 'rgba(255,255,255,.16)' } }}><SettingsOutlined sx={{ fontSize: 21 }} /></IconButton></Tooltip>)}
      </Box>
      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end', mb: 1 }}><Tooltip title="Transcript settings"><IconButton aria-label="Transcript settings" onClick={() => setSettingsOpen(true)} sx={{ width: 44, height: 44, color: 'var(--awm-bark)' }}><SettingsOutlined /></IconButton></Tooltip></Box>
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Transcript settings</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
          {([['tashkeel', 'Tashk\u012bl'], ['meanings', 'Inline word meanings'], ['sentence', 'English sentence']] as const).map(([key, label]) => <FormControlLabel key={key} label={label} control={<Switch checked={settings[key]} onChange={() => toggleSetting(key)} />} />)}
        </DialogContent>
        <DialogActions><Button onClick={() => setSettingsOpen(false)}>Done</Button></DialogActions>
      </Dialog>
      <Box sx={{ mt: 0.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {initialLoading
          ? <ForYouLoading
              progress={progress}
              leftControls={<ChevronNav hidden="mobile" onUp={() => undefined} onDown={() => undefined} upDisabled downDisabled sx={{ position: 'absolute', left: -66, top: '50%', transform: 'translateY(-50%)' }} />}
              rightControls={railSwitcher ? <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', right: -66, bottom: 0 }}>{railSwitcher}</Box> : undefined}
              mobileControls={<>{switcher}<ChevronNav hidden="desktop" onUp={() => undefined} onDown={() => undefined} upDisabled downDisabled /></>}
            />
          : clips[index]
            ? <Box sx={{ minWidth: 0, width: { xs: '100%', md: 'min(calc(100% - 160px), calc((100dvh - 390px) * 16 / 9))' }, mx: { md: 'auto' }, position: 'relative', left: 0 }}>
                <ClipPlayer
                  key={`${clips[index].video.id}:${clips[index].clip_start_ms}`}
                  clip={clips[index]}
                  settings={settings}
                  leftControls={<ChevronNav hidden="mobile" onUp={() => step(-1)} onDown={() => step(1)} upDisabled={index === 0} downDisabled={busy} sx={{ position: 'absolute', left: -66, top: '50%', transform: 'translateY(-50%)' }} />}
                  rightControls={railSwitcher ? <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', right: -66, bottom: 0 }}>{railSwitcher}</Box> : undefined}
                />
              </Box>
            : <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>{busy ? 'Loading clips…' : 'No more clips available.'}</Typography>}
      </Box>
      {!initialLoading && !clips[index] && <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', mt: 2 }}>{switcher}</Box>}
      {!initialLoading && (
        <Box sx={{ mt: { xs: 3 }, display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {switcher}
          <ChevronNav hidden="desktop" onUp={() => step(-1)} onDown={() => step(1)} upDisabled={index === 0} downDisabled={busy} />
        </Box>
      )}
    </Box>
  </Box>
}
