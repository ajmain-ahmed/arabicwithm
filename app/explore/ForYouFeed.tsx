'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Alert, Box, Button, CircularProgress, IconButton, Skeleton, Typography, Popover, FormControlLabel, Switch, Tooltip } from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp, SettingsOutlined } from '@mui/icons-material'
import { fetchForYouClips, fetchForYouTranscript } from '@/app/actions/forYou'
import { displayArabic } from '@/app/lib/displayArabic'
import { hourlySeed, segmentAtTime } from '@/app/lib/forYou'
import type { ForYouClip, ForYouToken, ForYouSegment } from '@/app/lib/forYou'
import { useForYouCache } from '@/store/forYouStore'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { getExploreSoundPreference, subscribeToExploreSoundPreference } from '@/app/lib/explore'

import { blockedForYouSources, excludeForYouSource } from '@/app/lib/forYouPlayback'
import TextSizeControl, { safeTextSize, TEXT_SCALES } from '@/app/components/settings-controls/TextSizeControl'
import MobileClipNavigator from './MobileClipNavigator'

const sourceTranscripts = new Map<string, Promise<ForYouSegment[]>>()
const MAX_RETAINED_CLIPS = 60

interface TranscriptSettings { tashkeel: boolean; meanings: boolean; sentence: boolean; arabicSize?: number; englishSize?: number }
const DEFAULT_SETTINGS: TranscriptSettings = { tashkeel: true, meanings: true, sentence: true }

export function ForYouWords({ tokens, settings = DEFAULT_SETTINGS, time }: { tokens: ForYouToken[]; settings?: TranscriptSettings; time?:number }) {
  return <Box dir="rtl" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, py: 1 }}>
    {tokens.map((token, index) => <Box component="span" key={index} data-active-token={time !== undefined && token.start_seconds !== undefined && token.end_seconds !== undefined && token.start_seconds <= time && time < token.end_seconds ? 'true' : undefined} sx={{ minWidth:0,maxWidth:'100%',overflowWrap:'anywhere',borderRadius: 1, '&[data-active-token="true"]': { bgcolor: 'color-mix(in srgb, var(--awm-gold) 25%, transparent)' }, display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography component="span" lang="ar" sx={{ color: 'inherit', fontFamily: 'var(--font-serif)', fontSize: { xs: `${1.8 * TEXT_SCALES[safeTextSize(settings.arabicSize)]}rem`, md: `${2.2 * TEXT_SCALES[safeTextSize(settings.arabicSize)]}rem` } }}>{displayArabic(token.arabic, settings.tashkeel)}</Typography>
      {settings.meanings && token.english && <Typography component="span" lang="en" dir="ltr" sx={{ color: 'inherit', opacity: .75, fontSize: `${.9 * TEXT_SCALES[safeTextSize(settings.englishSize)]}rem`, textAlign: 'center', overflowWrap: 'anywhere' }}>{token.english}</Typography>}
    </Box>)}
  </Box>
}

export function ClipPlayer({ clip, leftControls, rightControls, settings, onUnavailable }: { settings: TranscriptSettings; clip: ForYouClip; leftControls?: ReactNode; rightControls?: ReactNode; onUnavailable:(source:string,code:number)=>void }) {
  const [time, setTime] = useState(clip.clip_start_ms / 1000)
  const [segments,setSegments]=useState(clip.segments)
  const [ended,setEnded]=useState(false)
  useEffect(()=>{
    let active=true
    if(!sourceTranscripts.has(clip.video.id)){
      if(sourceTranscripts.size>=20)sourceTranscripts.delete(sourceTranscripts.keys().next().value!)
      sourceTranscripts.set(clip.video.id,fetchForYouTranscript(clip.video.id).catch(error=>{sourceTranscripts.delete(clip.video.id);throw error}))
    }
    void sourceTranscripts.get(clip.video.id)!.then(rows=>{if(active&&rows.length)setSegments(rows)}).catch(()=>{/* Selected clip remains usable; no stale sentence is shown outside its timing. */})
    return()=>{active=false}
  },[clip.video.id])
  const soundEnabled = useSyncExternalStore(subscribeToExploreSoundPreference, getExploreSoundPreference, () => true)
  function updateTime(seconds:number){
    setTime(seconds)
    if(seconds>=clip.clip_start_ms/1000 && seconds<clip.clip_end_ms/1000)setEnded(false)
  }
  const { wrapRef, isReady, isMuted, autoplayBlocked, playWithSound, mute, seekTo } = useYouTubePlayer(clip.video.youtube_id, updateTime, clip.clip_start_ms / 1000, { autoplay: true, muted: !soundEnabled, mutedAutoplayFallback: true, endAt: clip.clip_end_ms / 1000, requireTimeUpdates:true, onEnded:()=>setEnded(true), onError:code=>onUnavailable(clip.video.youtube_id,code) })
  useEffect(() => { if (!soundEnabled) mute() }, [soundEnabled, mute])
  const active = segmentAtTime(segments,time)
  return <Box data-for-you-source={clip.video.youtube_id}>
    {/* Outer box = positioning context for the out-of-frame controls. */}
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#000', borderRadius: { xs: '12px', md: '16px' }, overflow: 'hidden', border: { md: '1px solid rgba(255,255,255,0.08)' }, boxShadow: { md: '0 30px 80px rgba(0,0,0,0.55)' } }}>
        <Box ref={wrapRef} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </Box>
      {leftControls}
      {rightControls}
    </Box>
    {ended && <Box sx={{display:'flex',justifyContent:'center',mt:1}}><Button onClick={()=>{setEnded(false);seekTo(clip.clip_start_ms/1000)}} sx={{color:{md:'var(--awm-gold-light)'}}}>Replay clip</Button></Box>}
    {isReady && (isMuted || autoplayBlocked) && <Box sx={{display:'flex',justifyContent:'center',mt:1}}><Button onClick={playWithSound} sx={{color:{md:'var(--awm-gold-light)'}}}>{autoplayBlocked?'Play with sound':'Turn sound on'}</Button></Box>}
    {active && <Box data-feed-transcript sx={{ mt: { xs: 2, md: 3 }, color: { md: '#f5ede0' }, maxHeight:{xs:'35dvh',md:'none'},overflowY:'auto',overscrollBehavior:'contain' }}>
      {active.tokens.length ? <ForYouWords key={active.id} tokens={active.tokens} settings={settings} time={time} /> : <Typography lang="ar" dir="rtl" sx={{ fontSize: { xs: `${1.8 * TEXT_SCALES[safeTextSize(settings.arabicSize)]}rem`, md: `${2.2 * TEXT_SCALES[safeTextSize(settings.arabicSize)]}rem` }, textAlign: 'center' }}>{displayArabic(active.original_text, settings.tashkeel)}</Typography>}
      {settings.sentence && active.english_text && <Typography lang="en" dir="ltr" sx={{ mt: 0.5, textAlign: 'center', color: 'inherit', opacity: .75, fontSize: `${TEXT_SCALES[safeTextSize(settings.englishSize)]}rem` }}>{active.english_text}</Typography>}
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
    <Box sx={{ width: { xs: '100%', md: 'min(calc(100% - 330px), calc((100dvh - 390px) * 16 / 9))' }, mx: { md: 'auto' }, position: 'relative', left: {xs:0,md:-90} }}>
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
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement|null>(null)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('awm-for-you-settings') ?? '{}')
      setSettings({ ...Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => [key, typeof saved[key] === 'boolean' ? saved[key] : value])), arabicSize:safeTextSize(saved.arabicSize),englishSize:safeTextSize(saved.englishSize) } as unknown as TranscriptSettings)
    } catch {}
  }, [])
  function toggleSetting(key: 'tashkeel'|'meanings'|'sentence') {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    try { localStorage.setItem('awm-for-you-settings', JSON.stringify(next)) } catch {}
  }
  function resizeText(key:'arabicSize'|'englishSize',value:number){ const next={...settings,[key]:safeTextSize(value)};setSettings(next);try{localStorage.setItem('awm-for-you-settings',JSON.stringify(next))}catch{} }
  /* Session cache: view switches restore clips, position, and exclusions. */
  const cachedClips = useForYouCache((state) => state.clips)
  const cachedIndex = useForYouCache((state) => state.index)
  const cachedExcluded = useForYouCache((state) => state.excluded)
  const setCache = useForYouCache((state) => state.setAll)
  const [clips, setClips] = useState<ForYouClip[]>(()=> (initialClips ?? cachedClips).filter(clip=>!blockedForYouSources().has(clip.video.youtube_id)))
  const [loadStarted, setLoadStarted] = useState(()=> (initialClips??cachedClips).some(clip=>!blockedForYouSources().has(clip.video.youtube_id)))
  const [index, setIndex] = useState(()=>Math.min(cachedIndex,Math.max(0,(initialClips??cachedClips).filter(clip=>!blockedForYouSources().has(clip.video.youtube_id)).length-1))), [error, setError] = useState(''), [busy, setBusy] = useState(false)
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

  const loadingRef=useRef(false)
  async function loadMore() {
    if (loadingRef.current) return
    loadingRef.current=true
    setBusy(true); setError('')
    if (clips.length === 0) setProgress(0)
    const seen = new Set([...excluded, ...clips.slice(0, index + 1).flatMap((clip) => clip.segments.map((segment) => segment.id))])
    // First load of the session shares an hourly seed so the data cache can
    // serve every visitor in that window; later loads are unique.
    const seed = clips.length === 0 && excluded.length === 0 ? hourlySeed() : crypto.randomUUID()
    try {
      // Requery on every navigation; do not retain prefetched unpublished clips.
      const blocked=blockedForYouSources()
      let next:ForYouClip[]=[]
      // A cached first batch may contain only blocked sources. Exclude those
      // segment IDs and ask for another batch, with a finite retry budget.
      for(let attempt=0;attempt<8;attempt++){
        const batch=await fetchForYouClips(seed,[...seen].slice(-10000),clips.slice(0,index+1).map(clip=>clip.video.id).slice(-100))
        next=batch.filter(clip=>!blocked.has(clip.video.youtube_id))
        if(next.length||!batch.length)break
        const before=seen.size
        batch.forEach(clip=>clip.segments.forEach(segment=>seen.add(segment.id)))
        if(seen.size===before)break
      }
      setExcluded([...seen].slice(-10000))
      const usable=clips.filter(clip=>!blocked.has(clip.video.youtube_id))
      if (next.length) {
        const merged = [...usable, ...next]
        const trim = Math.max(0, merged.length - MAX_RETAINED_CLIPS)
        setClips(merged.slice(trim))
        setIndex(Math.max(0,usable.length - trim))
      }
      setProgress(100)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load clips.') } finally { loadingRef.current=false; setBusy(false) }
  }

  function step(offset: 1 | -1) {
    if (offset === -1) {
      setIndex((value) => Math.max(0, value - 1))
      return
    }
    if (index < clips.length - 1) setIndex(index + 1)
    else void loadMore()
  }

  function unavailable(source:string,code:number){
    setSettingsAnchor(null)
    excludeForYouSource(source,code)
    const remaining=clips.filter(clip=>clip.video.youtube_id!==source)
    const before=clips.slice(0,index).filter(clip=>clip.video.youtube_id!==source).length
    setClips(remaining);setIndex(Math.max(0,Math.min(before,remaining.length-1)))
    if(!remaining.length)void loadMore()
  }
  const settingsButton=<Box sx={{display:'flex',flexDirection:'column',alignItems:'center'}}><Tooltip title="Settings"><IconButton aria-label="Settings" aria-expanded={!!settingsAnchor} onClick={event=>setSettingsAnchor(event.currentTarget)} sx={{width:{xs:44,md:50},height:{xs:44,md:50},color:{xs:'var(--awm-bark)',md:'#fff'},bgcolor:settingsAnchor?'rgba(184,134,11,.24)':{md:'rgba(255,255,255,.14)'},border:settingsAnchor?'1px solid var(--awm-gold)':'1px solid transparent','&:hover':{bgcolor:'rgba(184,134,11,.3)'},'&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2}}}><SettingsOutlined/></IconButton></Tooltip><Typography sx={{display:{xs:'none',md:'block'},fontSize:11,color:'#fff',mt:.5}}>Settings</Typography></Box>
  const desktopRail=<Box sx={{display:{xs:'none',md:'flex'},flexDirection:'column',alignItems:'center',gap:1}}>{desktopControls?.(settingsButton)??<>{railSwitcher}{settingsButton}</>}</Box>
  const initialLoading = clips.length === 0 && busy

  return <Box component="main" sx={{ minHeight: { md: 'calc(100dvh - var(--awm-navbar-height))' }, bgcolor: { xs: 'var(--awm-cream-light)', md: '#0a0c0b' }, pt: { xs: 0, md: 3 }, pb: { xs: 3, md: 5 } }}>
    <Box sx={{ maxWidth: 2400, mx: 'auto', px: { xs: 2, sm: 3, md: 5 } }}>
      <Box sx={{display:{xs:'flex',md:'none'},justifyContent:'flex-end'}}>{settingsButton}</Box>
      <Popover open={Boolean(settingsAnchor)} anchorEl={settingsAnchor} onClose={()=>setSettingsAnchor(null)} anchorOrigin={{vertical:'bottom',horizontal:'right'}} transformOrigin={{vertical:'top',horizontal:'right'}} slotProps={{paper:{sx:{p:2,width:'max-content',maxWidth:'calc(100vw - 32px)',borderRadius:'12px'}}}}>
        <Typography component="h2" sx={{fontWeight:600,mb:1}}>Settings</Typography>
        <TextSizeControl label="Arabic text size" value={safeTextSize(settings.arabicSize)} onChange={value=>resizeText('arabicSize',value)}/>
        <TextSizeControl label="English text size" value={safeTextSize(settings.englishSize)} onChange={value=>resizeText('englishSize',value)}/>
        <Box sx={{display:'flex',flexDirection:'column'}}>
          {([['tashkeel','Tashkīl'],['meanings','Inline word meanings'],['sentence','English sentence']] as const).map(([key,label])=><FormControlLabel key={key} label={label} control={<Switch checked={settings[key]} onChange={()=>toggleSetting(key)}/>}/>)}
        </Box>
        <Button onClick={()=>setSettingsAnchor(null)}>Done</Button>
      </Popover>
      <Box sx={{ mt: 0.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {initialLoading
          ? <ForYouLoading
              progress={progress}
              leftControls={<ChevronNav hidden="mobile" onUp={() => undefined} onDown={() => undefined} upDisabled downDisabled sx={{ position: 'absolute', left: -66, top: '50%', transform: 'translateY(-50%)' }} />}
              rightControls={desktopRail ? <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', left: 'calc(100% + 16px)', top: 0 }}>{desktopRail}</Box> : undefined}
              mobileControls={<>{switcher}<ChevronNav hidden="desktop" onUp={() => undefined} onDown={() => undefined} upDisabled downDisabled /></>}
            />
          : clips[index]
            ? <Box sx={{ minWidth: 0, width: { xs: '100%', md: 'min(calc(100% - 330px), calc((100dvh - 390px) * 16 / 9))' }, mx: { md: 'auto' }, position: 'relative', left: {xs:0,md:-90} }}>
                <MobileClipNavigator clipKey={`${clips[index].video.id}:${clips[index].clip_start_ms}`} canPrevious={index>0} busy={busy} step={step}><ClipPlayer
                  key={`${clips[index].video.id}:${clips[index].clip_start_ms}`}
                  clip={clips[index]}
                  onUnavailable={unavailable}
                  settings={settings}
                  leftControls={<ChevronNav hidden="mobile" onUp={() => step(-1)} onDown={() => step(1)} upDisabled={index === 0} downDisabled={busy} sx={{ position: 'absolute', left: -66, top: '50%', transform: 'translateY(-50%)' }} />}
                  rightControls={desktopRail ? <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', left: 'calc(100% + 16px)', top: 0 }}>{desktopRail}</Box> : undefined}
                /></MobileClipNavigator>
              </Box>
            : <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>{busy ? 'Loading clips…' : 'No more clips available.'}</Typography>}
      </Box>
      {!initialLoading && !clips[index] && <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', mt: 2 }}>{desktopRail}</Box>}
      {!initialLoading && (
        <Box sx={{ mt: { xs: 3 }, display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {switcher}
          <ChevronNav hidden="desktop" onUp={() => step(-1)} onDown={() => step(1)} upDisabled={index === 0} downDisabled={busy} />
        </Box>
      )}
    </Box>
  </Box>
}
