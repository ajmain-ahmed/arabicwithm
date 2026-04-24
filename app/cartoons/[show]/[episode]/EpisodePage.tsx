'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Slider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material'
import { ArrowBack, Settings, Close } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/navbar'
import { EpisodeFull } from '@/app/lib/cartoons'

// ─── Fallback — used before we measure the real navbar ────────────────────────
const NAVBAR_HEIGHT = 64 // px
// ──────────────────────────────────────────────────────────────────────────────

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600&display=swap');

  :root {
    --navbar-height: ${NAVBAR_HEIGHT}px;
    --bark:        #2c1a0e;
    --forest:      #0e2e1f;
    --gold:        #b8860b;
    --gold-lt:     #d4a843;
    --muted:       #7a6e65;
    --cream:       #faf7f2;
    --sand:        #f5ede0;
    --font-serif:  Georgia, "Times New Roman", serif;
    --font-sans:   system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  html, body { background: var(--cream); margin: 0; }

  /* Fixed mobile header — rendered via portal directly on <body> so no
     ancestor overflow can interfere. Hidden on lg+. */
  #mobile-fixed-header {
    display: block;
    position: fixed;
    top: var(--navbar-height);
    left: 0;
    right: 0;
    z-index: 30;
    background: var(--cream);
    box-shadow: 0 2px 16px rgba(44,26,14,0.10);
    padding: 10px 20px 12px;
  }
  @media (min-width: 1200px) {
    #mobile-fixed-header { display: none; }
  }

  .script-line {
    transition: background 0.15s ease, border-color 0.2s ease;
    border-radius: 8px;
    border-left: 3px solid transparent;
  }
  .script-line:hover  { background: rgba(184,134,11,0.06); }
  .script-line.active { background: rgba(184,134,11,0.12); border-left-color: var(--gold); }

  .arabic-line {
    font-family: "EB Garamond", Georgia, serif;
    direction: rtl;
    text-align: right;
    line-height: 1.8;
    color: var(--bark);
    font-weight: 700;
  }
  .english-line {
    font-family: Jost, var(--font-sans);
    color: var(--muted);
    line-height: 1.6;
  }

  .vocab-table {
    width: 100%;
    border-collapse: collapse;
    font-family: Jost, var(--font-sans);
  }
  .vocab-table th {
    text-align: left;
    padding: 8px 12px;
    background: rgba(14,46,31,0.05);
    color: var(--forest);
    font-weight: 600;
    font-size: 0.76rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(44,26,14,0.08);
  }
  .vocab-table td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(44,26,14,0.05);
    color: var(--bark);
    vertical-align: top;
  }
  .vocab-table tr:last-child td { border-bottom: none; }
  .vocab-table tr:hover td { background: rgba(184,134,11,0.04); }
  .vocab-arabic {
    font-family: "EB Garamond", Georgia, serif;
    font-weight: 700;
    direction: rtl;
    text-align: right;
  }
`

/* ─────────────────────────────────────────────
   YouTube IFrame API Types
───────────────────────────────────────────── */
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: (() => void) | undefined
    __ytApiReady?: boolean
  }
}

/* ─────────────────────────────────────────────
   MobileFixedHeader — portal into <body>
───────────────────────────────────────────── */
function MobileFixedHeader({
  title,
  onBack,
  videoRef,
  isShort,
  onHeightChange,
}: {
  title: string
  onBack: () => void
  videoRef: React.RefObject<HTMLDivElement | null>
  isShort: boolean
  onHeightChange?: (height: number) => void
}) {
  const [mounted, setMounted] = useState(false)
  const innerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Draggable video height state
  const [maxVideoHeight, setMaxVideoHeight] = useState<number | undefined>(
    isShort ? 300 : undefined
  )
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Report height back to parent so <main> can pad itself correctly
  useEffect(() => {
    if (!innerRef.current || !onHeightChange) return
    const ro = new ResizeObserver(() => {
      onHeightChange(innerRef.current!.offsetHeight)
    })
    ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [mounted, onHeightChange])

  // ── Drag handlers ──
  const startDrag = useCallback(
    (clientY: number) => {
      const currentHeight =
        videoContainerRef.current?.offsetHeight ?? (isShort ? 300 : 200)
      dragState.current = { startY: clientY, startHeight: currentHeight }
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    },
    [isShort]
  )

  const onDrag = useCallback(
    (clientY: number) => {
      if (!dragState.current) return
      const delta = clientY - dragState.current.startY
      const minH = isShort ? 200 : 120
      const maxH = window.innerHeight * 0.65
      const newH = Math.max(
        minH,
        Math.min(maxH, dragState.current.startHeight + delta)
      )
      setMaxVideoHeight(newH)
    },
    [isShort]
  )

  const endDrag = useCallback(() => {
    dragState.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => onDrag(e.clientY)
    const handleMouseUp = () => endDrag()
    const handleTouchMove = (e: TouchEvent) => {
      if (!dragState.current) return
      e.preventDefault()
      onDrag(e.touches[0].clientY)
    }
    const handleTouchEnd = () => endDrag()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onDrag, endDrag])

  if (!mounted) return null

  const content = (
    <div id="mobile-fixed-header" ref={innerRef}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', minHeight: 30, marginBottom: 10 }}>
        {/* Back button — left */}
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(44,26,14,0.05)',
            cursor: 'pointer',
            color: '#7a6e65',
            zIndex: 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>

        {/* Title — absolutely centred */}
        <span
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 48px)',
            textAlign: 'center',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#2c1a0e',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}
        >
          {title}
        </span>
      </div>

      {/* Video — moved into the fixed header on mobile, now draggable-resizable */}
      <div
        ref={videoContainerRef}
        style={{
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#000',
          aspectRatio: isShort ? '9/16' : '16/9',
          maxHeight: maxVideoHeight,
          boxShadow: '0 8px 32px rgba(44,26,14,0.18)',
          position: 'relative',
        }}
      >
        <div
          ref={(el) => {
            if (el && videoRef.current && el.children.length === 0) {
              el.appendChild(videoRef.current)
            }
          }}
          style={{ width: '100%', height: '100%' }}
        />

        {/* Drag handle */}
        <div
          onMouseDown={(e) => startDrag(e.clientY)}
          onTouchStart={(e) => startDrag(e.touches[0].clientY)}
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 40,
            height: 5,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.65)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            cursor: 'ns-resize',
            zIndex: 10,
            touchAction: 'none',
          }}
        />
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function PillToggle({
  enabled, onToggle, label, activeColor = '#b8860b',
}: {
  enabled: boolean; onToggle: () => void; label: string; activeColor?: string
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 1, cursor: 'pointer',
        userSelect: 'none', padding: '5px 12px 5px 6px', borderRadius: '999px',
        border: '1px solid', borderColor: enabled ? activeColor : 'rgba(122,110,101,0.25)',
        background: enabled ? `${activeColor}14` : 'transparent', minWidth: 178,
        transition: 'all 0.15s',
        '&:hover': { borderColor: activeColor, background: `${activeColor}0d` },
      }}
    >
      <Box sx={{ width: 28, height: 16, borderRadius: '999px', background: enabled ? activeColor : 'rgba(122,110,101,0.2)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <Box sx={{ position: 'absolute', top: '2px', left: enabled ? '14px' : '2px', width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)' }} />
      </Box>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.8rem', md: '0.95rem' }, fontWeight: 500, color: enabled ? activeColor : '#7a6e65', whiteSpace: 'nowrap', lineHeight: 1, transition: 'color 0.15s' }}>
        {label}
      </Typography>
    </Box>
  )
}

function DesktopTextScaleSlider({ textScale, onChange }: { textScale: number; onChange: (v: number) => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.5, borderRadius: '999px', border: '1px solid rgba(122,110,101,0.2)', background: 'rgba(122,110,101,0.02)', minWidth: 160 }}>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
      <Slider value={textScale} min={0.9} max={1.5} step={0.1} size="small" onChange={(_, v) => onChange(v as number)} sx={{ color: '#b8860b', flex: 1, '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
    </Box>
  )
}

function SettingsDialog({
  open, onClose, showDiacritics, onToggleDiacritics, textScale, onTextScaleChange,
}: {
  open: boolean; onClose: () => void; showDiacritics: boolean; onToggleDiacritics: () => void; textScale: number; onTextScaleChange: (v: number) => void
}) {
  const ToggleRow = ({ label, description, enabled, onToggle, activeColor }: { label: string; description: string; enabled: boolean; onToggle: () => void; activeColor: string }) => (
    <Box onClick={onToggle} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', py: 1.25, px: 1.5, borderRadius: '10px', border: '1px solid', borderColor: enabled ? `${activeColor}55` : 'rgba(122,110,101,0.15)', background: enabled ? `${activeColor}08` : 'rgba(122,110,101,0.03)', transition: 'all 0.15s', userSelect: 'none', '&:hover': { borderColor: `${activeColor}88`, background: `${activeColor}0d` } }}>
      <Box sx={{ pr: 2 }}>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e', lineHeight: 1.2 }}>{label}</Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65', mt: 0.3, lineHeight: 1.4 }}>{description}</Typography>
      </Box>
      <Box sx={{ width: 38, height: 22, borderRadius: '999px', flexShrink: 0, background: enabled ? activeColor : 'rgba(122,110,101,0.22)', position: 'relative', transition: 'background 0.2s' }}>
        <Box sx={{ position: 'absolute', top: '3px', left: enabled ? '19px' : '3px', width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.22)', transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)' }} />
      </Box>
    </Box>
  )

  return (
    <Dialog open={open} onClose={onClose} slotProps={{ paper: { sx: { borderRadius: '16px', width: '100%', maxWidth: 360, m: 2, overflow: 'hidden', boxShadow: '0 24px 64px rgba(44,26,14,0.2)' } } }}>
      <DialogTitle sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e', pb: 2, pt: 2.5, px: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Settings
        <IconButton onClick={onClose} size="small" sx={{ color: '#7a6e65', mr: -0.5 }}><Close sx={{ fontSize: '1.2rem' }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, pt: 1.5, pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <ToggleRow label="Show Diacritics" description="Display vowel marks on Arabic words" enabled={showDiacritics} onToggle={onToggleDiacritics} activeColor="#b8860b" />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, px: 1.5, borderRadius: '10px', border: '1px solid rgba(122,110,101,0.15)', background: 'rgba(122,110,101,0.03)', gap: 2 }}>
            <Box sx={{ pr: 2, flex: '0 0 auto' }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e' }}>Text Size</Typography>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65', mt: 0.3 }}>Adjust Arabic text size</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}><Slider value={textScale} min={0.9} max={1.5} step={0.1} size="small" onChange={(_, v) => onTextScaleChange(v as number)} sx={{ color: '#b8860b', width: '100%', '& .MuiSlider-thumb': { width: 14, height: 14 } }} /></Box>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5 }}>
        <Button fullWidth variant="contained" onClick={onClose} disableElevation sx={{ background: '#0e2e1f', color: '#f5ede0', fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.95rem', textTransform: 'none', borderRadius: '10px', py: 1.1, '&:hover': { background: '#0e2e1f' } }}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}

/* ─────────────────────────────────────────────
   Timestamp Parser
───────────────────────────────────────────── */
function parseTimestamp(line: string): number | null {
  const m = line.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1] || '0', 10)
  const min = parseInt(m[2], 10)
  const sec = parseInt(m[3], 10)
  if (min > 59 || sec > 59) return null
  return h * 3600 + min * 60 + sec
}

/* ─────────────────────────────────────────────
   Content Parser
───────────────────────────────────────────── */
function parseContent(content: string) {
  const lines = content.split('\n')
  const scriptLines: Array<{ timestamp: number | null; arabicDiacritic: string; arabicPlain: string; english: string }> = []
  const vocabRows: Array<{ arabic: string; plain: string; english: string }> = []
  let inScript = false, inNotes = false
  let pendingTimestamp: number | null = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (line === '## Script') { inScript = true; inNotes = false; i++; continue }
    if (line === '## Notes') { inScript = false; inNotes = true; i++; continue }

    if (inScript && line) {
      const ts = parseTimestamp(line)
      if (ts !== null) { pendingTimestamp = ts; i++; continue }
      const isArabic = /[\u0600-\u06FF]/.test(line)
      if (isArabic) {
        let j = i + 1
        while (j < lines.length && !lines[j].trim()) j++
        const nextLine = lines[j]?.trim() ?? ''
        const nextIsArabic = /[\u0600-\u06FF]/.test(nextLine)
        if (nextIsArabic) {
          let k = j + 1
          while (k < lines.length && !lines[k].trim()) k++
          const englishLine = lines[k]?.trim() ?? ''
          const englishIsArabic = /[\u0600-\u06FF]/.test(englishLine)
          if (!englishIsArabic && englishLine && !englishLine.startsWith('#')) {
            scriptLines.push({ timestamp: pendingTimestamp, arabicDiacritic: line, arabicPlain: nextLine, english: englishLine })
            pendingTimestamp = null; i = k + 1; continue
          } else {
            scriptLines.push({ timestamp: pendingTimestamp, arabicDiacritic: line, arabicPlain: nextLine, english: '' })
            pendingTimestamp = null; i = j + 1; continue
          }
        } else {
          if (nextLine && !nextLine.startsWith('#')) {
            scriptLines.push({ timestamp: pendingTimestamp, arabicDiacritic: line, arabicPlain: line, english: nextLine })
            pendingTimestamp = null; i = j + 1; continue
          } else {
            scriptLines.push({ timestamp: pendingTimestamp, arabicDiacritic: line, arabicPlain: line, english: '' })
            pendingTimestamp = null
          }
        }
      }
    }

    if (inNotes && line.startsWith('|') && !line.startsWith('|--') && !line.startsWith('| Arabic')) {
      const cols = line.split('|').map((c) => c.trim()).filter(Boolean)
      if (cols.length >= 4) vocabRows.push({ arabic: cols[0], plain: cols[1], english: cols[3] })
      else if (cols.length >= 3) vocabRows.push({ arabic: cols[0], plain: cols[0], english: cols[2] })
    }
    i++
  }
  return { scriptLines, vocabRows }
}

/* ─────────────────────────────────────────────
   YouTube Player Hook
───────────────────────────────────────────── */
function useYouTubePlayer(videoId: string | undefined, onTimeUpdate?: (time: number) => void) {
  const playerRef = useRef<any>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<any>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])

  useEffect(() => {
    if (!videoId || !wrapRef.current) return

    const initPlayer = () => {
      if (!wrapRef.current || !videoId) return
      wrapRef.current.innerHTML = ''
      const inner = document.createElement('div')
      inner.style.width = '100%'
      inner.style.height = '100%'
      wrapRef.current.appendChild(inner)
      try {
        playerRef.current = new window.YT.Player(inner, {
          videoId,
          playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1, playsinline: 1, origin: typeof window !== 'undefined' ? window.location.origin : undefined },
          events: {
            onReady: () => {
              setIsReady(true)
              intervalRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime?.()
                if (typeof t === 'number') onTimeUpdateRef.current?.(t)
              }, 200)
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                if (!intervalRef.current) intervalRef.current = setInterval(() => {
                  const t = playerRef.current?.getCurrentTime?.()
                  if (typeof t === 'number') onTimeUpdateRef.current?.(t)
                }, 200)
              } else { clearInterval(intervalRef.current); intervalRef.current = null }
            },
            onError: (e: any) => console.error('YT Error:', e.data),
          },
        })
      } catch (e) { console.error('YT init error:', e) }
    }

    const loadApi = () => {
      if (window.YT?.Player || window.__ytApiReady) { initPlayer(); return }
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { window.__ytApiReady = true; prev?.(); initPlayer() }
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script')
        tag.id = 'youtube-iframe-api'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(tag)
      }
    }

    const timer = setTimeout(loadApi, 50)
    return () => {
      clearTimeout(timer)
      clearInterval(intervalRef.current)
      intervalRef.current = null
      try { playerRef.current?.destroy?.() } catch { }
      if (wrapRef.current) wrapRef.current.innerHTML = ''
      setIsReady(false)
    }
  }, [videoId])

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seconds, true)
      playerRef.current.playVideo?.()
    }
  }, [])

  return { wrapRef, seekTo, isReady }
}

const LEVEL_COLORS: Record<string, string> = {
  A1: '#2d6a4f', A2: '#40916c', B1: '#b5861a', B2: '#9c6b00', C1: '#6d4c9e', C2: '#4a2f7a',
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function EpisodePage({ episode, showTitle }: { episode: EpisodeFull; showTitle: string }) {
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [showDiacritics, setShowDiacritics] = useState(true)
  const [textScale, setTextScale] = useState(1.2)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // ── Dynamic navbar height ──
  const [navbarHeight, setNavbarHeight] = useState(NAVBAR_HEIGHT)
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector('header, nav[role="navigation"], [role="banner"]') as HTMLElement | null
      setNavbarHeight(nav?.offsetHeight ?? NAVBAR_HEIGHT)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  useEffect(() => {
    document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`)
  }, [navbarHeight])

  // ── Mobile header height ──
  const estimatedMobileHeader = episode.youtubeShort ? 380 : 280
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(estimatedMobileHeader)
  const [isMobile, setIsMobile] = useState(false)

  const scriptContainerRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLDivElement | null>(null)
  const skipInitialScroll = useRef(true)

  // Live offset for the fixed header so we don't re-trigger scroll when it resizes
  const scrollOffsetRef = useRef(0)
  scrollOffsetRef.current = navbarHeight + mobileHeaderHeight + 16 // 16px breathing room

  const { scriptLines, vocabRows } = useMemo(() => parseContent(episode.content), [episode.content])

  const handleTimeUpdate = useCallback((time: number) => {
    let idx = -1
    for (let i = 0; i < scriptLines.length; i++) {
      const ts = scriptLines[i].timestamp
      if (ts != null && ts <= time) idx = i
      else if (ts != null && ts > time) break
    }
    setActiveIndex(idx >= 0 ? idx : null)
  }, [scriptLines])

  const { wrapRef, seekTo } = useYouTubePlayer(episode.youtubeId, handleTimeUpdate)

  // Scroll active line into view — skip the first automatic change on mount
  useEffect(() => {
    if (activeIndex == null) return
    if (skipInitialScroll.current) {
      skipInitialScroll.current = false
      return
    }
    if (!activeLineRef.current) return

    if (isMobile) {
      const rect = activeLineRef.current.getBoundingClientRect()
      const offset = scrollOffsetRef.current
      const isAbove = rect.top < offset
      const isBelow = rect.bottom > window.innerHeight

      if (isAbove || isBelow) {
        const scrollTop = window.scrollY + rect.top - offset
        window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' })
      }
    } else {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex, isMobile])

  // Detect mobile breakpoint
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1200)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <>
      <style>{PAGE_CSS}</style>
      <Navbar />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showDiacritics={showDiacritics}
        onToggleDiacritics={() => setShowDiacritics((p) => !p)}
        textScale={textScale}
        onTextScaleChange={setTextScale}
      />

      {/* ── Mobile fixed portal header ── */}
      {isMobile && (
        <MobileFixedHeader
          title={episode.title}
          onBack={() => router.push(`/cartoons/${episode.show}`)}
          videoRef={wrapRef}
          isShort={!!episode.youtubeShort}
          onHeightChange={setMobileHeaderHeight}
        />
      )}

      <Box
        component="main"
        sx={{
          background: 'var(--cream)',
          pt: {
            xs: `${navbarHeight + mobileHeaderHeight}px`,
            lg: '96px',
          },
          pb: { xs: 6, md: 10 },
        }}
      >
        <Box
          sx={{
            display: { xs: 'flex', lg: 'grid' },
            flexDirection: { xs: 'column', lg: 'unset' },
            gridTemplateColumns: { lg: '420px 1fr' },
            gap: { xs: 0, lg: 5 },
            maxWidth: 1536,
            mx: 'auto',
            px: { xs: 0, lg: 6 },
            alignItems: { xs: 'stretch', lg: 'start' },
          }}
        >
          {/* ── Left column (desktop only) ── */}
          <Box
            sx={{
              position: { lg: 'sticky' },
              top: { lg: 96 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              px: { xs: 2.5, md: 5, lg: 0 },
              pt: { xs: 2, lg: 0 },
            }}
          >
            <Typography
              component="h1"
              sx={{
                display: { xs: 'none', lg: 'block' },
                fontFamily: 'var(--font-serif)',
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--bark)',
                lineHeight: 1.15,
              }}
            >
              {episode.title}
            </Typography>

            <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ background: LEVEL_COLORS[episode.level] ?? 'var(--forest)', color: '#fff', fontFamily: 'Jost, var(--font-sans)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', px: 1.2, py: 0.4, borderRadius: '4px' }}>
                {episode.level}
              </Box>
              {episode.tags.map((tag) => (
                <Box key={tag} sx={{ fontFamily: 'Jost, var(--font-sans)', fontSize: '0.68rem', color: 'var(--muted)', border: '1px solid rgba(122,110,101,0.25)', px: 1, py: 0.2, borderRadius: '3px' }}>
                  {tag}
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(44,26,14,0.18)',
                background: '#000',
                aspectRatio: episode.youtubeShort ? '9/16' : '16/9',
                maxHeight: episode.youtubeShort ? 560 : 'auto',
              }}
            >
              <Box ref={wrapRef} sx={{ width: '100%', height: '100%' }} />
            </Box>

            <Box sx={{ display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.3), transparent)' }} />
              <Button
                startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
                onClick={() => router.push(`/cartoons/${episode.show}`)}
                sx={{ fontFamily: 'Jost, var(--font-sans)', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'none', justifyContent: 'flex-start', px: 0, py: 0.5, '&:hover': { color: 'var(--gold)', background: 'transparent' }, transition: 'color 0.2s' }}
              >
                Back to {showTitle}
              </Button>
            </Box>
          </Box>

          {/* ── Right: Script + Vocab ── */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              px: { xs: 2.5, md: 5, lg: 0 },
              mt: { xs: 1, lg: 0 },
            }}
          >
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
              <DesktopTextScaleSlider textScale={textScale} onChange={setTextScale} />
              <PillToggle enabled={showDiacritics} onToggle={() => setShowDiacritics((p) => !p)} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
            </Box>

            <Box sx={{ borderBottom: '1px solid rgba(44,26,14,0.07)', background: '#fff', borderRadius: '12px 12px 0 0', px: { xs: 1, md: 4 }, display: 'flex', alignItems: 'center' }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                  flex: 1,
                  '& .MuiTab-root': { fontFamily: 'Jost, var(--font-sans)', fontSize: '0.82rem', fontWeight: 500, textTransform: 'none', letterSpacing: '0.04em', color: 'var(--muted)', minWidth: 0, px: 2, py: 1.5 },
                  '& .Mui-selected': { color: 'var(--forest) !important', fontWeight: 600 },
                  '& .MuiTabs-indicator': { background: 'var(--gold)', height: '2px' },
                }}
              >
                <Tab label="Script" />
                <Tab label={`Vocabulary (${vocabRows.length})`} />
              </Tabs>

              <IconButton
                onClick={() => setSettingsOpen(true)}
                size="small"
                sx={{
                  display: { xs: 'inline-flex', lg: 'none' },
                  width: 32, height: 32, flexShrink: 0, mx: 0.75,
                  color: '#7a6e65',
                  border: '1px solid rgba(122,110,101,0.25)',
                  borderRadius: '8px',
                  '&:hover': { background: 'rgba(122,110,101,0.08)', borderColor: 'rgba(122,110,101,0.4)' },
                }}
              >
                <Settings sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Box>

            <Box sx={{ background: '#fff', borderRadius: '0 0 12px 12px', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
              {tab === 0 && (
                <Box ref={scriptContainerRef} sx={{ display: 'flex', flexDirection: 'column' }}>
                  {scriptLines.length === 0 ? (
                    <Typography sx={{ fontFamily: 'Jost, var(--font-sans)', color: 'var(--muted)', fontSize: '0.9rem' }}>No script found in this episode file.</Typography>
                  ) : (
                    scriptLines.map((line, i) => {
                      const hasTimestamp = line.timestamp != null
                      const isActive = activeIndex === i
                      const isLast = i === scriptLines.length - 1
                      return (
                        <React.Fragment key={i}>
                          <Box
                            ref={isActive ? activeLineRef : undefined}
                            className={`script-line ${isActive ? 'active' : ''}`}
                            onClick={() => hasTimestamp && seekTo(line.timestamp!)}
                            sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.3, cursor: hasTimestamp ? 'pointer' : 'default', opacity: hasTimestamp ? 1 : 0.75 }}
                          >
                            {hasTimestamp && (
                              <Typography sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.04em', fontWeight: 600, lineHeight: 1 }}>
                                {(() => { const s = line.timestamp!; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}` })()}
                              </Typography>
                            )}
                            <Typography className="arabic-line" sx={{ fontSize: `calc(1.35rem * ${textScale})` }}>
                              {showDiacritics ? line.arabicDiacritic : line.arabicPlain}
                            </Typography>
                            {line.english && (
                              <Typography className="english-line" sx={{ fontSize: `calc(0.88rem * ${textScale})` }}>
                                {line.english}
                              </Typography>
                            )}
                          </Box>
                          {!isLast && <Divider sx={{ borderColor: 'rgba(44,26,14,0.06)', my: 0.5 }} />}
                        </React.Fragment>
                      )
                    })
                  )}
                </Box>
              )}

              {tab === 1 && (
                <Box sx={{ overflowX: 'auto' }}>
                  {vocabRows.length === 0 ? (
                    <Typography sx={{ fontFamily: 'Jost, var(--font-sans)', color: 'var(--muted)', fontSize: '0.9rem' }}>No vocabulary notes found.</Typography>
                  ) : (
                    <table className="vocab-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'right', direction: 'rtl' }}>Arabic</th>
                          <th>English</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vocabRows.map((row, i) => (
                          <tr key={i}>
                            <td className="vocab-arabic" style={{ fontSize: `calc(1.1rem * ${textScale})` }}>
                              {showDiacritics ? row.arabic : row.plain}
                            </td>
                            <td style={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.88rem * ${textScale})` }}>
                              {row.english}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  )
}