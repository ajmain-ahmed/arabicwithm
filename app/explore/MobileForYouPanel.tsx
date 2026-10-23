'use client'

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Box, Button, IconButton, Typography } from '@mui/material'
import { VolumeOff, VolumeUp, KeyboardDoubleArrowUp, KeyboardDoubleArrowDown } from '@mui/icons-material'
import { displayArabic } from '@/app/lib/displayArabic'
import { segmentAtTime, type ForYouClip, type ForYouSegment } from '@/app/lib/forYou'
import { safeTextSize, TEXT_SCALES } from '@/app/components/settings-controls/TextSizeControl'

interface Settings { tashkeel: boolean; meanings: boolean; sentence: boolean; arabicSize?: number; englishSize?: number }
interface Props {
  activeOnly?: boolean
  activeSegment?: ForYouSegment
  modeControl?: ReactNode
  clip: ForYouClip
  segments: ForYouSegment[]
  time: number
  settings: Settings
  switcher?: ReactNode
  filterControl?: ReactNode
  muted?: boolean
  onSound?: () => void
  navigation?: {previous:()=>void;next:()=>void;previousDisabled:boolean;nextDisabled:boolean}
  settingsButton?: ReactNode
  ready: boolean
  playing: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (seconds: number) => void
  rates: number[]
  rate: number
  onRate: (rate: number) => void
}

function timestamp(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}

/** Mobile presentation only. All controls use the existing, single live player. */
export default function MobileForYouPanel({ activeOnly = false, activeSegment, modeControl, clip, segments, time, settings, settingsButton, navigation, switcher, filterControl, muted, onSound, ready, rates, rate, onRate }: Props) {
  const start = clip.clip_start_ms / 1000, end = clip.clip_end_ms / 1000
  const lines = useMemo(() => segments.filter(line => line.start_seconds < end && line.end_seconds > start).sort((a,b) => a.start_seconds - b.start_seconds), [segments, start, end])
  const resolved = time >= start && time < end ? segmentAtTime(lines, time) : undefined
  const active=activeOnly?activeSegment:resolved
  const activeId = active?.id
  const scroller = useRef<HTMLDivElement>(null)
  const cards = useRef(new Map<number, HTMLDivElement>())
  const manualUntil = useRef(0)
  const arabicScale = TEXT_SCALES[safeTextSize(settings.arabicSize)]
  const englishScale = TEXT_SCALES[safeTextSize(settings.englishSize)]
  useEffect(() => {
    // eslint-disable-next-line react-hooks/purity -- Read only inside this imperative scroll effect.
    if (activeOnly || !window.matchMedia?.('(max-width:899.95px)').matches || Date.now() < manualUntil.current) return
    const pane = scroller.current, card = activeId !== undefined ? cards.current.get(activeId) : undefined
    if (!pane || !card) return
    const bounds = pane.getBoundingClientRect(), target = card.getBoundingClientRect()
    if (target.top < bounds.top + 8 || target.bottom > bounds.bottom - 8) {
      pane.scrollTo({ top: Math.max(0, pane.scrollTop + target.top - bounds.top - 8), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [activeId,activeOnly])
  function manualScroll() { manualUntil.current = Date.now() + 4000 }
  const nextRate = rates[(Math.max(0, rates.indexOf(rate)) + 1) % rates.length] ?? 1

  return <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', flex: 1, minHeight: 0, bgcolor: '#111d18', color: '#f5ede0' }}>
    <Box data-mobile-for-you-toolbar role="toolbar" aria-label="For You playback" sx={{display:'flex',flexWrap:'nowrap',alignItems:'center',justifyContent:'space-between',gap:'2px',px:.5,py:1,minHeight:52,boxSizing:'border-box',overflowX:'auto',overscrollBehaviorX:'contain',flexShrink:0,borderBottom:'1px solid rgba(245,237,224,.08)', '& > *':{flexShrink:0},'&& .MuiIconButton-root':{width:32,height:36,p:.5,borderRadius:'50%',color:'inherit',bgcolor:'rgba(255,255,255,.12)'},'@media (min-width:390px)':{'&& .MuiIconButton-root':{width:36}},'& .MuiSvgIcon-root':{fontSize:20},'&& > .MuiButton-root':{minWidth:30,width:30,height:36,p:0,fontSize:12},'&& [aria-label="Explore views"]':{width:100,height:36,p:.25,boxSizing:'border-box',bgcolor:'rgba(255,255,255,.12)',overflow:'hidden',borderRadius:'999px'},'&& [aria-label="Explore views"] button':{width:'50%',height:'100%',minHeight:0,m:0,p:0,borderRadius:'999px',bgcolor:'transparent',fontSize:11,fontWeight:600},'&& [aria-label="Explore views"] button[aria-pressed="true"]':{bgcolor:'var(--awm-gold)'},'&& [data-mobile-mode]':{minWidth:44,width:44,height:36,p:0,fontSize:12}}}>
      {navigation&&<IconButton data-feed-nav aria-label="Previous video" disabled={navigation.previousDisabled} onClick={navigation.previous} sx={{color:'inherit',borderRadius:'50%',bgcolor:'rgba(255,255,255,.14)',width:36,height:36}}><KeyboardDoubleArrowUp/></IconButton>}
      <IconButton aria-label={muted ? 'Unmute clip' : 'Mute clip'} disabled={!ready} onClick={onSound} sx={{ width:40,height:40,color:'inherit' }}>{muted ? <VolumeOff/> : <VolumeUp/>}</IconButton>
      <Button aria-label="Playback speed" title={`Change speed to ${nextRate}×`} disabled={!ready || rates.length < 2} onClick={() => onRate(nextRate)} sx={{ minWidth: 44, minHeight: 40, px: .75, color: 'inherit', fontWeight: 600, '&.Mui-disabled': { color: 'rgba(245,237,224,.5)' } }}>{rate}×</Button>
      {switcher}
      <Box>{filterControl}</Box>
      <Box>{settingsButton}</Box>
      {modeControl}
      {navigation&&<IconButton data-feed-nav aria-label="Next video" disabled={navigation.nextDisabled} onClick={navigation.next} sx={{color:'inherit',borderRadius:'50%',bgcolor:'rgba(255,255,255,.14)',width:36,height:36}}><KeyboardDoubleArrowDown/></IconButton>}
    </Box>
    <Box ref={scroller} data-mobile-clip-transcript data-feed-transcript onWheel={manualScroll} onTouchStart={manualScroll} onPointerDown={manualScroll} sx={{ flex: 1, minHeight: 0, overflowY: activeOnly?'visible':'auto', overscrollBehavior: 'contain', scrollPaddingBlock: 1, px: 'max(12px, env(safe-area-inset-left))', pt: 1.25, pb: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
      {(activeOnly ? active ? [active] : [] : lines).map(line => <Box key={line.id} ref={(node: HTMLDivElement | null) => { if (node) cards.current.set(line.id,node); else cards.current.delete(line.id) }} data-clip-line={line.id} data-active-segment={active?.id === line.id ? 'true' : 'false'} aria-current={active?.id === line.id ? 'true' : undefined} sx={{ p: { xs: 1.5, sm: 2 }, mb: 1.25, borderRadius: '16px', bgcolor: '#1c2c24', border: '1px solid rgba(245,237,224,.12)', '&[data-active-segment="true"]': { borderColor: 'var(--awm-gold-light)', bgcolor: '#223b2d', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--awm-gold-light) 25%, transparent)' } }}>
        {line.tokens.length ? <Box dir="rtl" data-token-glosses sx={{ display: 'flex', justifyContent: 'flex-start', direction: 'rtl', textAlign: 'right', flexWrap: 'wrap', columnGap: 2, rowGap: 1.5, py: .5 }}>
          {line.tokens.map((token,index) => <Box key={index} component="span" data-mobile-token data-active-token={active?.id === line.id && token.start_seconds !== undefined && token.end_seconds !== undefined && token.start_seconds <= time && time < token.end_seconds ? 'true' : undefined} sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%', overflowWrap: 'anywhere', borderRadius: 1, '&[data-active-token="true"]': { bgcolor: 'rgba(212,168,67,.16)' } }}>
            <Typography component="span" lang="ar" sx={{ fontFamily: 'var(--font-serif)', fontSize: `${1.8 * arabicScale}rem`, color: 'inherit', lineHeight: 1.6 }}>{displayArabic(token.arabic,settings.tashkeel)}</Typography>
            {settings.meanings && token.english && <Typography component="span" lang="en" dir="ltr" sx={{ fontSize: `${.8 * englishScale}rem`, color: 'inherit', opacity: .8, textAlign: 'center', lineHeight: 1.4 }}>{token.english}</Typography>}
          </Box>)}
        </Box> : <Typography lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-serif)', fontSize: `${1.8 * arabicScale}rem`, textAlign: 'right', lineHeight: 1.65, overflowWrap: 'anywhere', color: 'inherit' }}>{displayArabic(line.original_text,settings.tashkeel)}</Typography>}
        {settings.sentence && line.english_text && <Typography data-sentence-translation lang="en" dir="ltr" sx={{ mt: 1.5, fontSize: `${englishScale}rem`, fontWeight: 600, lineHeight: 1.6, color: 'inherit', overflowWrap: 'anywhere' }}>{line.english_text}</Typography>}
        <Typography data-segment-timing component="p" dir="ltr" sx={{ mt: 1, mb: 0, fontSize: 11, color: 'inherit', opacity: .65, fontVariantNumeric: 'tabular-nums' }}>{timestamp(line.start_seconds)} – {timestamp(line.end_seconds)}</Typography>
      </Box>)}
    </Box>
  </Box>
}
