'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Alert, Box, Button, CircularProgress, IconButton, Skeleton, Typography, Popover, FormControlLabel, Switch, Tooltip, useMediaQuery } from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp, SettingsOutlined, VolumeOff, VolumeUp } from '@mui/icons-material'
import { fetchForYouClips, fetchForYouTranscript } from '@/app/actions/forYou'
import { displayArabic } from '@/app/lib/displayArabic'
import { hourlySeed, segmentAtTime } from '@/app/lib/forYou'
import type { ForYouClip, ForYouToken, ForYouSegment } from '@/app/lib/forYou'
import { useForYouCache } from '@/store/forYouStore'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { getExploreSoundPreference, subscribeToExploreSoundPreference, setExploreSoundPreference } from '@/app/lib/explore'

import { blockedForYouSources, excludeForYouSource } from '@/app/lib/forYouPlayback'
import TextSizeControl, { safeTextSize, TEXT_SCALES } from '@/app/components/settings-controls/TextSizeControl'
import MobileClipNavigator from './MobileClipNavigator'
import ShortFullSwitch from './ShortFullSwitch'
import DesktopPlayerResize from './DesktopPlayerResize'
import MobileForYouPanel from './MobileForYouPanel'
import ForYouGroupFilter from './ForYouGroupFilter'

const sourceTranscripts = new Map<string, Promise<ForYouSegment[]>>()
const MAX_RETAINED_CLIPS = 60
// Match the reference's wide player while leaving space for transcript cards.
const MOBILE_PLAYER_HEIGHT = 'max(96px, min(56.25vw, 44dvh, calc(100dvh - var(--awm-navbar-height) - env(safe-area-inset-bottom, 0px) - 230px)))'

function prepareTranscript(source: string) {
  if (!sourceTranscripts.has(source)) {
    if (sourceTranscripts.size >= 20) sourceTranscripts.delete(sourceTranscripts.keys().next().value!)
    sourceTranscripts.set(source, fetchForYouTranscript(source).catch(error => {
      sourceTranscripts.delete(source)
      throw error
    }))
  }
  return sourceTranscripts.get(source)!
}

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

export function ClipPlayer({ clip, leftControls, rightControls, mobileToolbar, mobileSwitcher, filterControl, navigation, settings, onUnavailable, full = false, suppliedSegments, modeControl, mobileModeControl }: { full?: boolean; suppliedSegments?: ForYouSegment[]; modeControl?: ReactNode; mobileModeControl?: ReactNode; navigation?: React.ComponentProps<typeof MobileForYouPanel>['navigation']; mobileSwitcher?: ReactNode; filterControl?: ReactNode; mobileToolbar?: ReactNode; settings: TranscriptSettings; clip: ForYouClip; leftControls?: ReactNode; rightControls?: ReactNode; onUnavailable:(source:string,code:number)=>void }) {
  const isPhone = useMediaQuery('(max-width:899.95px)')
  const playerSizeRef=useRef<HTMLDivElement>(null)
  const [playerWidth,setPlayerWidth]=useState<number|null>(null)
  const [modeStart,setModeStart]=useState({full,start:clip.clip_start_ms/1000})
  const [time, setTime] = useState(clip.clip_start_ms / 1000)
  const [fetchedSegments,setSegments]=useState(clip.segments)
  const segments=suppliedSegments??fetchedSegments
  const [ended,setEnded]=useState(false)
  const [transcriptError,setTranscriptError]=useState('')
  useEffect(()=>{
    let active=true
    if(suppliedSegments)return
    void prepareTranscript(clip.video.id).then(rows=>{if(active&&rows.length)setSegments(rows)}).catch(()=>{if(active)setTranscriptError('Unable to load the full transcript. Reload this source to retry.')})
    return()=>{active=false}
  },[clip.video.id,suppliedSegments])
  const soundEnabled = useSyncExternalStore(subscribeToExploreSoundPreference, getExploreSoundPreference, () => true)
  function updateTime(seconds:number){
    setTime(seconds)
    if(seconds>=clip.clip_start_ms/1000 && seconds<clip.clip_end_ms/1000)setEnded(false)
  }
  if(modeStart.full!==full)setModeStart({full,start:full?time:Math.min(Math.max(time,clip.clip_start_ms/1000),clip.clip_end_ms/1000-.1)})
  const { wrapRef, isReady, isMuted, isPlaying, playWithSound, mute, seekTo, seekToOnly, playVideo, pauseVideo, playbackRate, setPlaybackRate, getPlaybackRates, getSoundMuted } = useYouTubePlayer(clip.video.youtube_id, updateTime, modeStart.start, { verifySoundState: isPhone, autoplay: true, muted: !soundEnabled, mutedAutoplayFallback: true, endAt: full ? undefined : clip.clip_end_ms / 1000, requireTimeUpdates:true, onEnded:()=>setEnded(true), onError:code=>onUnavailable(clip.video.youtube_id,code) })
  useEffect(() => { if (!soundEnabled) mute() }, [soundEnabled, mute])
  useEffect(() => {
    if (!isPhone || !isReady) return
    if (soundEnabled) playWithSound()
    else mute()
  }, [isPhone, isReady, soundEnabled, playWithSound, mute])
  useEffect(() => {
    if (!isPhone || !isReady || !soundEnabled || !isMuted) return
    const enable = (event: Event) => { if(event.target instanceof Element && event.target.closest('button, a, input, select, [role=slider]')) return; playWithSound() }
    document.addEventListener('pointerdown', enable)
    return () => document.removeEventListener('pointerdown', enable)
  }, [isPhone, isReady, soundEnabled, isMuted, playWithSound])
  const visibleClip = full ? {...clip,clip_start_ms:0,clip_end_ms:Math.max(...segments.map(s=>s.end_seconds),clip.clip_end_ms/1000)*1000} : clip
  const active = full || (time>=clip.clip_start_ms/1000 && time<clip.clip_end_ms/1000) ? segmentAtTime(segments,time) : undefined
  const rates=getPlaybackRates?.()??[1],rate=playbackRate??1
  const nextRate=rates[(Math.max(0,rates.indexOf(rate))+1)%rates.length]??1
  const sound=()=>{const muted=getSoundMuted?.()??isMuted;setExploreSoundPreference(muted);if(muted)playWithSound();else mute()}
  return <Box data-for-you-source={clip.video.youtube_id} sx={{ display: { xs: 'flex', md: 'block' }, flexDirection: 'column', flex: { xs: 1, md: 'initial' }, minHeight: 0 }}>

    {full&&transcriptError&&<Alert severity="error">{transcriptError}</Alert>}
    {/* Outer box = positioning context for the out-of-frame controls. */}
    <Box ref={playerSizeRef} data-for-you-player sx={{ position: 'relative',mx:'auto', width:{xs:'100%',md:playerWidth===null?'min(100%, calc(max(270px, 100dvh - var(--awm-navbar-height) - 240px) * 16 / 9))':`min(100%, ${playerWidth}px, calc(max(270px, 100dvh - var(--awm-navbar-height) - 240px) * 16 / 9))`}, aspectRatio: { xs: 'auto', md: '16 / 9' }, height: { xs: MOBILE_PLAYER_HEIGHT, md: 'auto' }, flexShrink: 0 }}>
      <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#000', borderRadius: { xs: 0, md: '16px' }, overflow: 'hidden', border: { md: '1px solid rgba(255,255,255,0.08)' }, boxShadow: { md: '0 30px 80px rgba(0,0,0,0.55)' } }}>
        <Box ref={wrapRef} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </Box>
      {/* Leave the lower 40% (at least 80px) uncovered for native player controls. */}
      <Box data-feed-gesture-zone aria-hidden="true" onClick={()=>{if(isPlaying)pauseVideo();else playVideo()}} sx={{display:{xs:'block',md:'none'},position:'absolute',inset:'0 0 max(80px, 40%)',zIndex:2,touchAction:'pan-x'}} />
      {leftControls}
      {rightControls}
    </Box>
    {ended && <Box sx={{display:{xs:'none',md:'flex'},justifyContent:'center',mt:1}}><Button onClick={()=>{setEnded(false);seekTo(clip.clip_start_ms/1000)}} sx={{color:{md:'var(--awm-gold-light)'}}}>Replay clip</Button></Box>}
    <Box data-desktop-for-you-toolbar sx={{display:{xs:'none',md:'flex'},alignItems:'center',justifyContent:'space-between',gap:1.25,py:2,color:'#fff','& .MuiIconButton-root':{color:'#fff',width:44,height:44},'& .MuiButton-root':{color:'#fff'}}}>
      {navigation&&<IconButton aria-label="Previous video" disabled={navigation.previousDisabled} onClick={navigation.previous}><KeyboardArrowUp/></IconButton>}
      {mobileSwitcher}
      <IconButton aria-label={isMuted?'Unmute clip':'Mute clip'} disabled={!isReady} onClick={sound}>{isMuted?<VolumeOff/>:<VolumeUp/>}</IconButton>
      <Button aria-label="Playback speed" disabled={!isReady||rates.length<2} onClick={()=>setPlaybackRate(nextRate)} sx={{minWidth:44,height:44,textTransform:'none'}}>{rate}{'\u00d7'}</Button>
      {filterControl}{mobileToolbar}{modeControl}
      {!isPhone&&<DesktopPlayerResize playerRef={playerSizeRef} onResize={setPlayerWidth}/>}
      {navigation&&<IconButton aria-label="Next video" disabled={navigation.nextDisabled} onClick={navigation.next}><KeyboardArrowDown/></IconButton>}
    </Box>
    <MobileForYouPanel activeOnly={full} activeSegment={active} modeControl={mobileModeControl} clip={visibleClip} segments={segments} time={time} settings={settings} navigation={navigation} settingsButton={mobileToolbar} switcher={mobileSwitcher} filterControl={filterControl} muted={isMuted} onSound={() => { const actualMuted = getSoundMuted?.() ?? isMuted; setExploreSoundPreference(actualMuted); if(actualMuted) playWithSound(); else mute() }} ready={isReady} playing={isPlaying} onPlay={() => { if (!full && (time < clip.clip_start_ms / 1000 || time >= clip.clip_end_ms / 1000)) seekTo(clip.clip_start_ms / 1000); else playVideo() }} onPause={pauseVideo} onSeek={seekToOnly} rates={getPlaybackRates?.() ?? [1]} rate={playbackRate ?? 1} onRate={setPlaybackRate} />
    <Box data-desktop-clip-transcript data-feed-transcript sx={{display:{xs:'none',md:'block'},color:'#f5ede0',mt:2,minHeight:124,overscrollBehavior:'contain'}}>
      {(active ? [active] : []).map(line=><Box key={line.id} data-clip-line={line.id} data-active-segment={active?.id===line.id} sx={{p:1.5,mb:1,borderRadius:2,bgcolor:'rgba(212,168,67,.14)'}}>
        {line.tokens.length?<ForYouWords tokens={line.tokens} settings={settings} time={time}/>:<Typography lang="ar" dir="rtl" sx={{color:'inherit',textAlign:'center',fontFamily:'var(--font-serif)',fontSize:`${2.2 * TEXT_SCALES[safeTextSize(settings.arabicSize)]}rem`}}>{displayArabic(line.original_text,settings.tashkeel)}</Typography>}
        {settings.sentence&&line.english_text&&<Typography lang="en" sx={{color:'inherit',textAlign:'center',fontSize:`${TEXT_SCALES[safeTextSize(settings.englishSize)]}rem`}}>{line.english_text}</Typography>}
      </Box>)}
    </Box>
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
    <Box sx={{ width: { xs: '100%', md: 'min(100%, 1800px)' }, mx: { md: 'auto' }, height: { xs: '100%', md: 'auto' }, position: 'relative', left:0 }}>
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', bgcolor: '#000', borderRadius: { xs: 0, md: '16px' }, overflow: 'hidden', border: { md: '1px solid rgba(255,255,255,0.08)' } }}>
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

export function Feed({ previewSegments, initialClips, railSwitcher, desktopControls, mobileSwitcher, filterControl, groups = [], freshMobile = false }: { previewSegments?: ForYouSegment[]; freshMobile?: boolean; mobileSwitcher?: ReactNode; filterControl?: ReactNode; groups?: string[]; initialClips?: ForYouClip[]; switcher?: ReactNode; railSwitcher?: ReactNode; desktopControls?: (settings: ReactNode) => ReactNode }) {
  const [full,setFull]=useState(false)
  const modeControl=()=> <ShortFullSwitch full={full} onChange={setFull}/>
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
  const [clips, setClips] = useState<ForYouClip[]>(()=> (initialClips ?? (freshMobile ? [] : cachedClips)).filter(clip=>!blockedForYouSources().has(clip.video.youtube_id)))
  const [loadStarted, setLoadStarted] = useState(()=> (initialClips??(freshMobile ? [] : cachedClips)).some(clip=>!blockedForYouSources().has(clip.video.youtube_id)))
  const [index, setIndex] = useState(()=>Math.min(freshMobile ? 0 : cachedIndex,Math.max(0,(initialClips??(freshMobile ? [] : cachedClips)).filter(clip=>!blockedForYouSources().has(clip.video.youtube_id)).length-1))), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [excluded, setExcluded] = useState<number[]>(freshMobile ? [] : cachedExcluded)
  const [progress, setProgress] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const feedRef = useRef({ clips, index })
  useEffect(() => { feedRef.current = { clips, index } }, [clips, index])
  const advanceAfterLoad = useRef(false)

  useEffect(() => {
    if(!previewSegments)setCache(clips, index, excluded)
  }, [clips, index, excluded, setCache,previewSegments])
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
  async function loadMore(advance = false) {
    if(previewSegments)return
    if (advance) advanceAfterLoad.current = true
    if (loadingRef.current) return
    loadingRef.current=true
    setBusy(true); setError('')
    if (clips.length === 0) setProgress(0)
    const seen = new Set([...excluded, ...clips.flatMap((clip) => clip.segments.map((segment) => segment.id))])
    // First load of the session shares an hourly seed so the data cache can
    // serve every visitor in that window; later loads are unique.
    const seed = !freshMobile && clips.length === 0 && excluded.length === 0 ? hourlySeed() : crypto.randomUUID()
    try {
      // Fetch five results, excluding every buffered clip as well as history.
      const blocked=blockedForYouSources()
      let next:ForYouClip[]=[]
      // A cached first batch may contain only blocked sources. Exclude those
      // segment IDs and ask for another batch, with a finite retry budget.
      for(let attempt=0;attempt<8;attempt++){
        const batch=await fetchForYouClips(seed,[...seen].slice(-10000),[...new Set([...(freshMobile ? recentMobileSources : []),...clips.map(clip=>clip.video.id)])].slice(-100),groups)
        next=batch.filter(clip=>!blocked.has(clip.video.youtube_id))
        if(freshMobile)next=randomMobileBatch(next)
        if(next.length||!batch.length)break
        const before=seen.size
        batch.forEach(clip=>clip.segments.forEach(segment=>seen.add(segment.id)))
        if(seen.size===before)break
      }
      setExcluded([...seen].slice(freshMobile ? -200 : -10000))
      // Navigation can continue while this request is in flight. Preserve the
      // latest active clip, rather than jumping to the newly appended batch.
      const latest = feedRef.current
      const activeClip = latest.clips[latest.index]
      const usable=latest.clips.filter(clip=>!blockedForYouSources().has(clip.video.youtube_id))
      next = next.filter(clip => !blockedForYouSources().has(clip.video.youtube_id) && !usable.some(existing => existing.video.id === clip.video.id && existing.clip_start_ms === clip.clip_start_ms))
      setHasMore(next.length > 0)
      if (next.length) {
        const merged = [...usable, ...next]
        const activeIndex = Math.max(0, usable.indexOf(activeClip))
        const target = advanceAfterLoad.current ? Math.min(activeIndex + 1, merged.length - 1) : activeIndex
        const trim = Math.min(target, Math.max(0, merged.length - MAX_RETAINED_CLIPS))
        setClips(merged.slice(trim))
        setIndex(target - trim)
      }
      setProgress(100)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load clips.') } finally { advanceAfterLoad.current=false; loadingRef.current=false; setBusy(false) }
  }

  useEffect(() => {
    if (clips.length && index > 0 && index >= clips.length - 2 && hasMore) void loadMore()
    // A failed/empty request is retried by the next deliberate navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, clips.length, hasMore])

  const activeSource = clips[index]?.video.id
  useEffect(()=>{if(freshMobile && activeSource){recentMobileSources=[...recentMobileSources.filter(id=>id!==activeSource),activeSource].slice(-60)}},[freshMobile,activeSource])
  const nextSource = clips[index + 1]?.video.id
  useEffect(() => {
    if (nextSource && !previewSegments) void prepareTranscript(nextSource).catch(() => {})
  }, [nextSource,previewSegments])

  function step(offset: 1 | -1) {
    setFull(false)
    if (offset === -1) {
      advanceAfterLoad.current = false
      setIndex((value) => Math.max(0, value - 1))
      return
    }
    if (index < clips.length - 1) setIndex(index + 1)
    else void loadMore(true)
  }

  function unavailable(source:string,code:number){
    if(previewSegments){setError(`Preview player error ${code}: the video may be restricted or unavailable. Check the source URL and embedding permissions.`);return}
    setSettingsAnchor(null)
    excludeForYouSource(source,code)
    const remaining=clips.filter(clip=>clip.video.youtube_id!==source)
    const before=clips.slice(0,index).filter(clip=>clip.video.youtube_id!==source).length
    setClips(remaining);setIndex(Math.max(0,Math.min(before,remaining.length-1)))
    if(!remaining.length)void loadMore()
  }
  const settingsButton=<Box sx={{display:'flex',flexDirection:{xs:'row',md:'column'},gap:{xs:1,md:0},alignItems:'center'}}><Tooltip title="Settings"><IconButton aria-label="Settings" aria-expanded={!!settingsAnchor} onClick={event=>setSettingsAnchor(event.currentTarget)} sx={{width:{xs:44,md:50},height:{xs:44,md:50},color:'#fff',bgcolor:settingsAnchor?{xs:'var(--awm-forest)',md:'rgba(184,134,11,.24)'}:{xs:'var(--awm-forest)',md:'rgba(255,255,255,.14)'},border:settingsAnchor?'1px solid var(--awm-gold)':'1px solid transparent','&:hover':{color:'#fff',bgcolor:{xs:'var(--awm-forest)',md:'rgba(184,134,11,.3)'}},'&:active':{color:'#fff'},'&.Mui-disabled':{color:'rgba(255,255,255,.5)'},'&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2}}}><SettingsOutlined/></IconButton></Tooltip><Typography sx={{fontSize:{xs:13,md:11},color:{xs:'var(--awm-bark)',md:'#fff'},mt:{xs:0,md:.5}}}>Settings</Typography></Box>
  const mobileSettingsButton = <IconButton aria-label="Settings" aria-expanded={!!settingsAnchor} onClick={event => setSettingsAnchor(event.currentTarget)} sx={{ width: 40, height: 40, color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,.1)' }, '&:focus-visible': { outline: '2px solid var(--awm-gold-light)', outlineOffset: 2 } }}><SettingsOutlined /></IconButton>
  const desktopRail=<Box sx={{display:{xs:'none',md:'flex'},flexDirection:'column',alignItems:'center',gap:1}}>{desktopControls?.(settingsButton)??<>{railSwitcher}{settingsButton}</>}{modeControl()}</Box>
  const initialLoading = clips.length === 0 && busy

  return <Box component="main" sx={{ minHeight: { md: 'calc(100dvh - var(--awm-navbar-height))' }, bgcolor: { xs: '#111d18', md: '#0a0c0b' }, pt: { xs: 0, md: 3 }, height: { xs: 'calc(100dvh - var(--awm-navbar-height) - env(safe-area-inset-bottom, 0px))', md: 'auto' }, pb: { xs: 0, md: 5 } }}>
    <Box sx={{ maxWidth: 2400, mx: 'auto', height: { xs: '100%', md: 'auto' }, px: { xs: 0, sm: 0, md: 3 } }}>
      <Popover open={Boolean(settingsAnchor)} anchorEl={settingsAnchor} onClose={()=>setSettingsAnchor(null)} anchorOrigin={{vertical:'bottom',horizontal:'right'}} transformOrigin={{vertical:'top',horizontal:'right'}} slotProps={{paper:{sx:{p:2,width:'max-content',maxWidth:'calc(100vw - 32px)',borderRadius:'12px'}}}}>
        <Typography component="h2" sx={{fontWeight:600,mb:1}}>Settings</Typography>
        <TextSizeControl label="Arabic text size" value={safeTextSize(settings.arabicSize)} onChange={value=>resizeText('arabicSize',value)}/>
        <TextSizeControl label="English text size" value={safeTextSize(settings.englishSize)} onChange={value=>resizeText('englishSize',value)}/>
        <Box sx={{display:'flex',flexDirection:'column'}}>
          {([['tashkeel','Tashkīl'],['meanings','Inline word meanings'],['sentence','English sentence']] as const).map(([key,label])=><FormControlLabel key={key} label={label} control={<Switch checked={settings[key]} onChange={()=>toggleSetting(key)}/>}/>)}
        </Box>
        <Button onClick={()=>setSettingsAnchor(null)}>Done</Button>
      </Popover>
      <Box sx={{ mt: { xs: 0, md: .5 }, height: { xs: '100%', md: 'auto' } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {initialLoading
          ? <ForYouLoading
              progress={progress}
              leftControls={<ChevronNav hidden="mobile" onUp={() => undefined} onDown={() => undefined} upDisabled downDisabled sx={{ position: 'absolute', left: -66, top: '50%', transform: 'translateY(-50%)' }} />}

            />
          : clips[index]
            ? <Box sx={{ minWidth: 0, width: { xs: '100%', md: 'min(100%, 1800px)' }, mx: { md: 'auto' }, height: { xs: '100%', md: 'auto' }, position: 'relative', left:0 }}>
                <MobileClipNavigator clipKey={`${clips[index].video.id}:${clips[index].clip_start_ms}`} disabled={full || !!previewSegments} canPrevious={index>0} busy={busy && index >= clips.length - 1} step={step}><ClipPlayer
                  key={`${clips[index].video.id}:${clips[index].clip_start_ms}`}
                  full={full} suppliedSegments={previewSegments} modeControl={modeControl()} mobileModeControl={<Button data-mobile-mode onClick={()=>setFull(!full)} sx={{color:'inherit',bgcolor:'var(--awm-gold)',borderRadius:'999px',textTransform:'none',fontWeight:600}}>{full?'Full':'Short'}</Button>} clip={clips[index]}
                  onUnavailable={unavailable}
                  settings={settings}
                  navigation={previewSegments ? undefined : {previous:()=>step(-1),next:()=>step(1),previousDisabled:index===0,nextDisabled:busy&&index>=clips.length-1}}
                  mobileToolbar={mobileSettingsButton}
                  mobileSwitcher={mobileSwitcher} filterControl={filterControl}


                /></MobileClipNavigator>
              </Box>
            : <Box><Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>{busy ? 'Loading clips…' : 'No more clips available.'}</Typography><Box sx={{display:{xs:"flex",md:"none"},justifyContent:"center",alignItems:"center",gap:1,pt:2}}>{mobileSwitcher}{filterControl}</Box></Box>}
      </Box>
      {!initialLoading && !clips[index] && <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', mt: 2 }}>{desktopRail}</Box>}

    </Box>
  </Box>
}

let recentMobileSources: string[] = []
function randomMobileBatch(batch: ForYouClip[]) {
 const unique=batch.filter((clip,index)=>batch.findIndex(other=>other.video.youtube_id===clip.video.youtube_id)===index)
 for(let i=unique.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[unique[i],unique[j]]=[unique[j],unique[i]]}
 return unique
}
let sessionGroups: string[] = []
export default function ForYouFeed(props: React.ComponentProps<typeof Feed>) {
 const isPhone=useMediaQuery('(max-width:899.95px)')
 const [groups,setGroups]=useState<string[]>(sessionGroups)
 const [version,setVersion]=useState(0)
 return <Feed {...props} key={`${version}:${isPhone}`} freshMobile={isPhone} groups={groups} filterControl={<ForYouGroupFilter value={groups} onApply={value=>{useForYouCache.setState({clips:[],index:0,excluded:[]});sessionGroups=value;setGroups(value);setVersion(v=>v+1)}}/>}/>
}
