'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import { createPortal } from 'react-dom'
import SafeHtml from '@/app/components/SafeHtml'
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
  useMediaQuery,
  Chip,
  Drawer,
  Breadcrumbs,
  Popover,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ArrowBack, Settings, Close, ExpandMore, ExpandLess, ChevronRight, Quiz } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { stripDiacritics } from '@/app/lib/arabic'
import { EpisodeFull, CartoonWordEntry } from '@/app/lib/cartoons'
import { HtmlTooltip, WordTooltip, LEVEL_COLORS } from '@/app/components/vocab-tooltip'
import EpisodeTestDialog from './EpisodeTestDialog'

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
    padding: 4px 20px 12px;
  }
  @media (min-width: 1200px) {
    #mobile-fixed-header { display: none; }
  }

  .script-block {
    transition: background 0.15s ease, border-color 0.2s ease;
    border-radius: 8px;
    border-left: 3px solid transparent;
    padding: 12px 16px;
    margin-bottom: 8px;
  }
  .script-block:hover  { background: rgba(184,134,11,0.06); }
  .script-block.active { background: rgba(184,134,11,0.12); border-left-color: var(--gold); }

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

  .note-line {
    font-family: Jost, var(--font-sans);
    font-size: 0.85rem;
    color: var(--muted);
    line-height: 1.6;
    padding: 6px 0;
    border-left: 2px solid var(--gold);
    padding-left: 10px;
    margin: 4px 0;
  }
  .note-line em {
    color: var(--bark);
    font-weight: 600;
    font-style: normal;
  }
`

/* ─────────────────────────────────────────────
   YouTube IFrame API Types
───────────────────────────────────────────── */
namespace YT {
  export interface Player {
    getCurrentTime(): number
    seekTo(seconds: number, allowSeekAhead: boolean): void
    playVideo(): void
    pauseVideo(): void
    destroy(): void
  }
}

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => YT.Player
      PlayerState: { PLAYING: number }
    }
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
  hasVideo,
  onHeightChange,
  top,
}: {
  title: string
  onBack: () => void
  videoRef: React.RefObject<HTMLDivElement | null>
  isShort: boolean
  hasVideo: boolean
  onHeightChange?: (height: number) => void
  top: number
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
    <div id="mobile-fixed-header" ref={innerRef} style={{ top: `${top}px` }}>
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
      {hasVideo && (
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
      )}
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
        background: enabled ? `${activeColor}14` : 'transparent',
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
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, borderRadius: '999px', border: '1px solid rgba(122,110,101,0.2)', background: 'rgba(122,110,101,0.02)', height: 28, flex: 1, minWidth: 80, maxWidth: 160 }}>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
      <Slider value={textScale} min={1.0} max={1.4} step={0.1} size="small" onChange={(_, v) => onChange(v as number)} sx={{ color: '#b8860b', flex: 1, '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
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
      <DialogTitle sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e', pb: 0.5, pt: 2.5, px: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, maxWidth: 180 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}><Slider value={textScale} min={0.9} max={1.5} step={0.1} size="small" onChange={(_, v) => onTextScaleChange(v as number)} sx={{ color: '#b8860b', width: '100%', '& .MuiSlider-thumb': { width: 14, height: 14 } }} /></Box>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5 }}>
        <Button fullWidth variant="contained" onClick={onClose} disableElevation sx={{ background: '#2c1a0e', color: '#f5ede0', fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.95rem', textTransform: 'none', borderRadius: '10px', py: 1.1, '&:hover': { background: '#1a0f08' } }}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}

/* ─────────────────────────────────────────────
   WordTooltip — inline markdown word popup
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   Global guard — disable script-line clicks while any vocab UI is open
───────────────────────────────────────────── */
let openVocabCount = 0
let lastVocabCloseAt = 0

function useVocabOpenTracker(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      openVocabCount++
      return () => {
        openVocabCount--
        lastVocabCloseAt = Date.now()
      }
    }
  }, [isOpen])
}

/* ─────────────────────────────────────────────
   ArabicLineText — Desktop tooltip / Mobile bottom-sheet
───────────────────────────────────────────── */
function ArabicLineText({
  text,
  wordMap,
  diacritizedMap,
  textScale,
  showDiacritics,
}: {
  text: string
  wordMap: Record<string, CartoonWordEntry>
  diacritizedMap: Record<string, CartoonWordEntry>
  textScale: number
  showDiacritics: boolean
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))

  const [activeEntry, setActiveEntry] = useState<CartoonWordEntry | null>(null)
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  const childRef = useRef<HTMLSpanElement | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    clearLeaveTimer()
    leaveTimerRef.current = setTimeout(() => {
      setOpen(false)
      setActiveEntry(null)
      setActivePartIndex(null)
      childRef.current = null
    }, 50)
  }, [clearLeaveTimer])

  const handleOpen = useCallback((entry: CartoonWordEntry, el: HTMLSpanElement, partIndex: number) => {
    clearLeaveTimer()
    setActiveEntry(entry)
    setActivePartIndex(partIndex)
    setOpen(true)
    childRef.current = el
  }, [clearLeaveTimer])

  const handleClose = useCallback(() => {
    clearLeaveTimer()
    setOpen(false)
    setActiveEntry(null)
    setActivePartIndex(null)
    childRef.current = null
    lastVocabCloseAt = Date.now()
  }, [clearLeaveTimer])

  useVocabOpenTracker(open)

  useEffect(() => {
    return () => {
      clearLeaveTimer()
    }
  }, [clearLeaveTimer])

  const parts = text.split(/([\u0600-\u06FF]+)/)

  return (
    <>
      {parts.map((part, i) => {
        if (!/[\u0600-\u06FF]+/.test(part)) {
          return <span key={i}>{part}</span>
        }
        const plain = stripDiacritics(part)
        const entry = diacritizedMap[part] || wordMap[plain]
        if (!entry) {
          return <span key={i}>{part}</span>
        }

        const isActive = activeEntry === entry && open && activePartIndex === i

        /* ── Mobile: tap word → bottom sheet ── */
        if (isMobile) {
          return (
            <React.Fragment key={i}>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpen(entry, e.currentTarget, i)
                }}
                className="vocab-word"
                style={{
                  cursor: 'pointer',
                  borderBottom: '2px dotted var(--gold)',
                  paddingBottom: showDiacritics ? '5px' : '1px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(184,134,11,0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {part}
              </span>

              <Drawer
                anchor="bottom"
                open={isActive}
                onClose={() => handleClose()}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: '16px 16px 0 0',
                      bgcolor: '#fff',
                      boxShadow: '0 -8px 32px rgba(44,26,14,0.15)',
                    },
                  },
                }}
              >
                <Box sx={{ p: 2, pt: 1.5, position: 'relative' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 4,
                      bgcolor: 'rgba(122,110,101,0.25)',
                      borderRadius: 2,
                      mx: 'auto',
                      mb: 1.5,
                    }}
                  />
                  {activeEntry && (
                    <WordTooltip entry={activeEntry} textScale={textScale} />
                  )}
                </Box>
              </Drawer>
            </React.Fragment>
          )
        }

        /* ── Desktop: hover word → tooltip ── */
        return (
          <HtmlTooltip
            key={i}
            open={isActive}
            title={
              isActive ? (
                <Box
                  onMouseEnter={clearLeaveTimer}
                  onMouseLeave={scheduleClose}
                  sx={{ position: 'relative' }}
                >
                  <Box sx={{ p: 2.5 }}>
                    <WordTooltip entry={activeEntry} textScale={textScale} />
                  </Box>
                </Box>
              ) : (
                <></>
              )
            }
            placement="bottom"
            arrow
            describeChild
            disableHoverListener
            disableFocusListener
            disableTouchListener
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'preventOverflow',
                    enabled: true,
                    options: {
                      padding: 16,
                      boundary: 'viewport',
                    },
                  },
                  {
                    name: 'flip',
                    enabled: true,
                    options: {
                      padding: 16,
                    },
                  },
                ],
              },
            }}
          >
            <span
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(184,134,11,0.12)'
                handleOpen(entry, e.currentTarget, i)
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                scheduleClose()
              }}
              className="vocab-word"
              style={{
                cursor: 'pointer',
                borderBottom: '2px dotted var(--gold)',
                paddingBottom: showDiacritics ? '5px' : '1px',
                transition: 'background 0.15s',
              }}
            >
              {part}
            </span>
          </HtmlTooltip>
        )
      })}
    </>
  )
}

/* ─────────────────────────────────────────────
   YouTube Player Hook
───────────────────────────────────────────── */
function useYouTubePlayer(videoId: string | undefined, onTimeUpdate?: (time: number) => void) {
  const playerRef = useRef<YT.Player | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const segmentPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const segmentSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])

  useEffect(() => {
    if (!videoId || !wrapRef.current) return

    const clearWrap = (el: HTMLDivElement) => {
      while (el.firstChild) {
        el.removeChild(el.firstChild)
      }
    }

    const initPlayer = () => {
      if (!wrapRef.current || !videoId) return
      clearWrap(wrapRef.current)
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
            onStateChange: (event: { data: number }) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                if (!intervalRef.current) intervalRef.current = setInterval(() => {
                  const t = playerRef.current?.getCurrentTime?.()
                  if (typeof t === 'number') onTimeUpdateRef.current?.(t)
                }, 200)
              } else { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null }
            },
            onError: (e: { data: number }) => console.error('YT Error:', e.data),
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
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      if (segmentPollRef.current) clearInterval(segmentPollRef.current)
      segmentPollRef.current = null
      if (segmentSafetyRef.current) clearTimeout(segmentSafetyRef.current)
      segmentSafetyRef.current = null
      try { playerRef.current?.destroy?.() } catch { }
      if (wrapRef.current) clearWrap(wrapRef.current)
      setIsReady(false)
    }
  }, [videoId])

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seconds, true)
      playerRef.current.playVideo?.()
    }
  }, [])

  const playSegment = useCallback((startSeconds: number, durationSeconds: number) => {
    if (!playerRef.current) return
    const endTime = startSeconds + durationSeconds
    playerRef.current.seekTo(startSeconds, true)
    playerRef.current.playVideo?.()

    // Clear any previous segment polling
    if (segmentPollRef.current) clearInterval(segmentPollRef.current)
    if (segmentSafetyRef.current) clearTimeout(segmentSafetyRef.current)

    // Poll and pause when segment ends
    const poll = setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.()
      if (typeof t === 'number' && t >= endTime) {
        clearInterval(poll)
        segmentPollRef.current = null
        playerRef.current?.pauseVideo?.()
      }
    }, 150)
    segmentPollRef.current = poll

    // Safety cleanup after duration + 1s
    const safety = setTimeout(() => {
      clearInterval(poll)
      segmentPollRef.current = null
    }, (durationSeconds + 1) * 1000)
    segmentSafetyRef.current = safety
  }, [])

  const pauseVideo = useCallback(() => {
    playerRef.current?.pauseVideo?.()
  }, [])

  return { wrapRef, seekTo, playSegment, pauseVideo, isReady }
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function EpisodePage({ episode, showTitle }: { episode: EpisodeFull; showTitle: string }) {
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [showDiacritics, setShowDiacritics] = useState(true)
  const [textScale, setTextScale] = useState(1.3)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null)
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const [testDialogOpen, setTestDialogOpen] = useState(false)

  const [navbarHeight, setNavbarHeight] = useState(NAVBAR_HEIGHT);

  useEffect(() => {
    const measure = () => {
      const nav = document.getElementById('main-navbar');
      if (nav) {
        setNavbarHeight(nav.offsetHeight);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── Mobile header height ──
  const estimatedMobileHeader = episode.youtubeShort ? 380 : 280
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(estimatedMobileHeader)
  const [isMobile, setIsMobile] = useState(false)

  const activeBlockRef = useRef<HTMLDivElement | null>(null)
  const skipInitialScroll = useRef(true)

  // ── Desktop video resize ──
  const [desktopVideoWidth, setDesktopVideoWidth] = useState(420)
  const desktopVideoDrag = useRef<{ startX: number; startWidth: number } | null>(null)
  const desktopVideoContainerRef = useRef<HTMLDivElement | null>(null)

  const startDesktopDrag = useCallback((clientX: number) => {
    desktopVideoDrag.current = { startX: clientX, startWidth: desktopVideoWidth }
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }, [desktopVideoWidth])

  const onDesktopDrag = useCallback((clientX: number) => {
    if (!desktopVideoDrag.current) return
    const delta = clientX - desktopVideoDrag.current.startX
    const newW = Math.max(320, Math.min(720, desktopVideoDrag.current.startWidth + delta))
    setDesktopVideoWidth(newW)
  }, [])

  const endDesktopDrag = useCallback(() => {
    desktopVideoDrag.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => onDesktopDrag(e.clientX)
    const handleMouseUp = () => endDesktopDrag()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onDesktopDrag, endDesktopDrag])

  const scrollOffsetRef = useRef(0)
  useEffect(() => {
    scrollOffsetRef.current = navbarHeight + mobileHeaderHeight + 16
  }, [navbarHeight, mobileHeaderHeight])

  const handleTimeUpdate = useCallback((time: number) => {
    const blocks = episode.scriptBlocks
    let lo = 0, hi = blocks.length - 1, idx = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const ts = blocks[mid].timestamp
      if (ts != null && ts <= time) {
        idx = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    setActiveIndex(idx >= 0 ? idx : null)
  }, [episode.scriptBlocks])

  const { wrapRef, seekTo, playSegment } = useYouTubePlayer(episode.youtubeId, handleTimeUpdate)

  useEffect(() => {
    if (activeIndex == null) return
    if (skipInitialScroll.current) {
      skipInitialScroll.current = false
      return
    }
    if (!activeBlockRef.current) return

    if (isMobile) {
      const rect = activeBlockRef.current.getBoundingClientRect()
      const offset = scrollOffsetRef.current
      const isAbove = rect.top < offset
      const isBelow = rect.bottom > window.innerHeight

      if (isAbove || isBelow) {
        const scrollTop = window.scrollY + rect.top - offset
        window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' })
      }
    } else {
      activeBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex, isMobile])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1200)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const blocksWithNotes = episode.scriptBlocks
    .map((block, i) => ({ hasNotes: block.notes.length > 0, index: i }))
    .filter((b) => b.hasNotes)
    .map((b) => b.index)
  const allNotesExpanded = blocksWithNotes.length > 0 && blocksWithNotes.every((i) => expandedNotes.has(i))

  return (
    <>
      <style>{PAGE_CSS}</style>

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
          top={navbarHeight}
          title={episode.title}
          onBack={() => router.push(`/cartoons/${episode.show}`)}
          videoRef={wrapRef}
          isShort={!!episode.youtubeShort}
          hasVideo={!!episode.youtubeId}
          onHeightChange={setMobileHeaderHeight}
        />
      )}

      <Box
        component="main"
        sx={{
          background: 'var(--cream)',
          pt: {
            xs: `${navbarHeight + mobileHeaderHeight}px`,
            lg: '112px',
          },
          pb: { xs: 6, md: 10 },
        }}
      >
        <Box
          sx={{
            display: { xs: 'flex', lg: 'grid' },
            flexDirection: { xs: 'column', lg: 'unset' },
            gridTemplateColumns: { lg: `${desktopVideoWidth}px 1fr` },
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
              ref={desktopVideoContainerRef}
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(44,26,14,0.18)',
                background: '#000',
                aspectRatio: episode.youtubeShort ? '9/16' : '16/9',
                maxHeight: episode.youtubeShort ? 560 : 'auto',
                position: 'relative',
              }}
            >
              <Box ref={wrapRef} sx={{ width: '100%', height: '100%' }} />

              {/* Desktop resize handle */}
              <Box
                onMouseDown={(e) => {
                  e.stopPropagation()
                  startDesktopDrag(e.clientX)
                }}
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  width: 24,
                  height: 24,
                  cursor: 'se-resize',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
                  <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM22 14H20V12H22V14ZM18 22H16V20H18V22Z" />
                </svg>
              </Box>
            </Box>

            {/* Desktop video resize hint */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', justifyContent: 'space-between', mt: -1 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                Drag corner to resize
              </Typography>
              {desktopVideoWidth !== 420 && (
                <Button
                  size="small"
                  onClick={() => setDesktopVideoWidth(420)}
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.7rem',
                    color: 'var(--gold)',
                    textTransform: 'none',
                    py: 0,
                    minHeight: 24,
                    '&:hover': { background: 'transparent', color: '#9c6b00' },
                  }}
                >
                  Reset size
                </Button>
              )}
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

          {/* ── Right: Tabs ── */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              px: { xs: 2.5, md: 5, lg: 0 },
              mt: { xs: 1, lg: 0 },
            }}
          >
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              {/* Breadcrumbs */}
              <Breadcrumbs
                separator={<ChevronRight sx={{ fontSize: 14, color: 'var(--muted)' }} />}
                sx={{
                  '& .MuiBreadcrumbs-li': { fontFamily: 'Jost, sans-serif', fontSize: '0.78rem' },
                }}
              >
                <Typography
                  onClick={() => router.push('/')}
                  sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer', '&:hover': { color: 'var(--gold)' } }}
                >
                  Home
                </Typography>
                <Typography
                  onClick={() => router.push('/cartoons')}
                  sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer', '&:hover': { color: 'var(--gold)' } }}
                >
                  Cartoons
                </Typography>
                <Typography
                  onClick={() => router.push(`/cartoons/${episode.show}`)}
                  sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer', '&:hover': { color: 'var(--gold)' } }}
                >
                  {showTitle}
                </Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'var(--bark)', fontWeight: 500 }}>
                  {episode.title}
                </Typography>
              </Breadcrumbs>

              {/* Desktop settings button */}
              <Button
                onClick={(e) => setSettingsAnchor(e.currentTarget)}
                size="small"
                startIcon={<Settings sx={{ fontSize: '1.1rem' }} />}
                sx={{
                  display: { xs: 'none', lg: 'inline-flex' },
                  color: '#7a6e65',
                  border: '1px solid rgba(122,110,101,0.25)',
                  borderRadius: '8px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  px: 1.5,
                  py: 0.5,
                  minHeight: 34,
                  '&:hover': { background: 'rgba(122,110,101,0.08)', borderColor: 'rgba(122,110,101,0.4)' },
                }}
              >
                Settings
              </Button>
              <Popover
                open={Boolean(settingsAnchor)}
                anchorEl={settingsAnchor}
                onClose={() => setSettingsAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: '12px',
                      boxShadow: '0 12px 40px rgba(44,26,14,0.15)',
                      p: 1.5,
                      width: 'auto',
                      minWidth: 160,
                      border: '1px solid rgba(44,26,14,0.08)',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Text Size
                    </Typography>
                    <DesktopTextScaleSlider textScale={textScale} onChange={setTextScale} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Diacritics
                    </Typography>
                    <PillToggle enabled={showDiacritics} onToggle={() => setShowDiacritics((p) => !p)} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                  </Box>
                </Box>
              </Popover>
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
                <Tab label="Vocabulary List" />
                <Tab label="Grammar Points" />
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

            <Box sx={{ background: '#fff', borderRadius: '0 0 12px 12px', px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
              {/* ── Test Yourself button (Script tab only) ── */}
              {tab === 0 && episode.scriptBlocks.length > 0 && (
                <Box sx={{ mb: { xs: 2, md: 3 }, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setTestDialogOpen(true)}
                    startIcon={<Quiz sx={{ fontSize: '1.1rem' }} />}
                    sx={{
                      border: '1.5px solid rgba(184,134,11,0.35)',
                      color: '#b8860b',
                      fontFamily: 'Jost, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textTransform: 'none',
                      borderRadius: '10px',
                      px: 2.5,
                      py: 0.8,
                      background: 'rgba(184,134,11,0.04)',
                      '&:hover': {
                        background: 'rgba(184,134,11,0.1)',
                        borderColor: 'rgba(184,134,11,0.55)',
                      },
                    }}
                  >
                    Test Yourself
                  </Button>
                  {blocksWithNotes.length > 0 && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        if (allNotesExpanded) {
                          setExpandedNotes(new Set())
                        } else {
                          setExpandedNotes(new Set(blocksWithNotes))
                        }
                      }}
                      startIcon={allNotesExpanded ? <ExpandLess sx={{ fontSize: '1.1rem' }} /> : <ExpandMore sx={{ fontSize: '1.1rem' }} />}
                      sx={{
                        border: '1.5px solid rgba(122,110,101,0.25)',
                        color: '#7a6e65',
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textTransform: 'none',
                        borderRadius: '10px',
                        px: 2.5,
                        py: 0.8,
                        background: 'transparent',
                        '&:hover': {
                          background: 'rgba(122,110,101,0.06)',
                          borderColor: 'rgba(122,110,101,0.4)',
                        },
                      }}
                    >
                      {allNotesExpanded ? 'Collapse All Notes' : 'Expand All Notes'}
                    </Button>
                  )}
                </Box>
              )}

              {/* ── Script Tab ── */}
              {tab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {episode.scriptBlocks.length === 0 ? (
                    <Typography sx={{ fontFamily: 'Jost, var(--font-sans)', color: 'var(--muted)', fontSize: '0.9rem' }}>No script found in this episode file.</Typography>
                  ) : (
                    episode.scriptBlocks.map((block, i) => {
                      const hasTimestamp = block.timestamp != null
                      const isActive = activeIndex === i
                      const isLast = i === episode.scriptBlocks.length - 1
                      return (
                        <React.Fragment key={i}>
                          <Box
                            ref={isActive ? activeBlockRef : undefined}
                            className={`script-block ${isActive ? 'active' : ''}`}
                            onClick={(e) => {
                              if (openVocabCount > 0) return
                              if (Date.now() - lastVocabCloseAt < 120) return
                              if ((e.target as HTMLElement).closest('.vocab-word')) return
                              if (hasTimestamp) seekTo(block.timestamp!)
                            }}
                            sx={{ cursor: hasTimestamp ? 'pointer' : 'default', opacity: hasTimestamp ? 1 : 0.75 }}
                          >
                            {/* Block title / timestamp */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              {hasTimestamp && (
                                <Typography sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.04em', fontWeight: 600, lineHeight: 1 }}>
                                  {(() => { const s = block.timestamp!; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}` })()}
                                </Typography>
                              )}
                              <Typography sx={{ fontFamily: 'Jost, var(--font-sans)', fontSize: `calc(0.75rem * ${textScale})`, color: 'var(--muted)', fontWeight: 500 }}>
                                {block.title}
                              </Typography>
                            </Box>

                            {/* Arabic */}
                            <Typography className="arabic-line" sx={{ fontSize: `calc(1.35rem * ${textScale})`, mb: 0.5 }}>
                              <ArabicLineText
                                textScale={textScale}
                                text={showDiacritics ? block.arabicDiacritic : block.arabicPlain}
                                wordMap={episode.wordMap}
                                diacritizedMap={episode.diacritizedMap}
                                showDiacritics={showDiacritics}
                              />
                            </Typography>

                            {/* English */}
                            {block.english && (
                              <Typography className="english-line" sx={{ fontSize: `calc(0.88rem * ${textScale})`, mb: 1.5 }}>
                                {block.english}
                              </Typography>
                            )}

                            {/* Notes — expandable / collapsible */}
                            {block.notes.length > 0 && (
                              <>
                                <Button
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedNotes((prev) => {
                                      const next = new Set(prev)
                                      if (next.has(i)) next.delete(i)
                                      else next.add(i)
                                      return next
                                    })
                                  }}
                                  endIcon={expandedNotes.has(i) ? <ExpandLess sx={{ fontSize: '1rem' }} /> : <ExpandMore sx={{ fontSize: '1rem' }} />}
                                  sx={{
                                    mt: 1,
                                    py: 0.3,
                                    px: 1.5,
                                    minHeight: 28,
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: `calc(0.75rem * ${textScale})`,
                                    fontWeight: 500,
                                    color: 'var(--muted)',
                                    border: '1px solid rgba(122,110,101,0.2)',
                                    borderRadius: '999px',
                                    background: 'transparent',
                                    textTransform: 'none',
                                    gap: 0.5,
                                    '& .MuiButton-endIcon': { ml: 0 },
                                    '&:hover': { background: 'rgba(184,134,11,0.06)', borderColor: 'rgba(184,134,11,0.35)' },
                                  }}
                                >
                                  Notes ({block.notes.length})
                                </Button>
                                {expandedNotes.has(i) && (
                                  <Box sx={{ mt: 1 }}>
                                    {block.notes.map((note, ni) => (
                                      <Typography
                                        key={ni}
                                        component="div"
                                        sx={{
                                          fontFamily: 'Jost, sans-serif',
                                          fontSize: `calc(0.82rem * ${textScale})`,
                                          color: 'var(--muted)',
                                          lineHeight: 1.6,
                                          py: 0.5,
                                          borderLeft: '2px solid var(--gold)',
                                          pl: 1.25,
                                          mb: 0.75,
                                          '& em': {
                                            color: 'var(--bark)',
                                            fontWeight: 600,
                                            fontStyle: 'normal',
                                          },
                                        }}
                                      >
                                        <SafeHtml text={note} />
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                              </>
                            )}
                          </Box>
                          {!isLast && <Divider sx={{ borderColor: 'rgba(44,26,14,0.06)', my: 0.5 }} />}
                        </React.Fragment>
                      )
                    })
                  )}
                </Box>
              )}

              {/* ── Vocabulary List Tab ── */}
              {tab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 1 } }}>
                  {episode.vocabList.length === 0 ? (
                    <Typography sx={{ fontFamily: 'Jost, var(--font-sans)', color: 'var(--muted)', fontSize: '0.9rem' }}>No vocabulary list found.</Typography>
                  ) : (
                    episode.vocabList.map((row) => (
                      <Box
                        key={row.number}
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: { xs: 1, sm: 2 },
                          py: { xs: 2, sm: 1.25 },
                          px: { xs: 2, sm: 2 },
                          borderRadius: { xs: '12px', sm: '10px' },
                          border: '1px solid rgba(44,26,14,0.08)',
                          background: { xs: '#fff', sm: 'rgba(44,26,14,0.02)' },
                          boxShadow: { xs: '0 2px 8px rgba(44,26,14,0.04)', sm: 'none' },
                          transition: 'background 0.15s',
                          '&:hover': { background: { xs: '#fff', sm: 'rgba(184,134,11,0.04)' } },
                        }}
                      >
                        {/* CEFR chip */}
                        <Chip
                          label={row.cefr}
                          size="small"
                          sx={{
                            background: LEVEL_COLORS[row.cefr] ?? 'var(--forest)',
                            color: '#fff',
                            fontFamily: 'Jost, sans-serif',
                            fontWeight: 600,
                            fontSize: `calc(0.65rem * ${textScale})`,
                            minWidth: 40,
                            flexShrink: 0,
                          }}
                        />

                        {/* Arabic */}
                        <Typography
                          sx={{
                            fontFamily: '"EB Garamond", Georgia, serif',
                            fontSize: `calc(1.25rem * ${textScale})`,
                            fontWeight: 700,
                            color: '#2c1a0e',
                            flex: { sm: '0 0 auto' },
                            minWidth: { sm: 100 },
                            textAlign: 'right',
                            direction: 'rtl',
                            lineHeight: 1.4,
                          }}
                        >
                          {showDiacritics ? row.arabic : stripDiacritics(row.arabic)}
                        </Typography>

                        {/* Transliteration */}
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: `calc(0.82rem * ${textScale})`,
                            color: 'var(--muted)',
                            flex: { sm: '0 0 auto' },
                            minWidth: { sm: 70 },
                          }}
                        >
                          {row.transliteration}
                        </Typography>

                        {/* English */}
                        <Typography
                          sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: `calc(0.9rem * ${textScale})`,
                            color: 'var(--bark)',
                            flex: 1,
                            minWidth: 0,
                            textAlign: { xs: 'right', sm: 'left' },
                          }}
                        >
                          {row.english}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {/* ── Grammar Points Tab ── */}
              {tab === 2 && (
                <Box>
                  {episode.grammarPoints.length === 0 ? (
                    <Typography sx={{ fontFamily: 'Jost, var(--font-sans)', color: 'var(--muted)', fontSize: '0.9rem' }}>No grammar points found.</Typography>
                  ) : (
                    <>
                      {/* Mobile: cards */}
                      <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 2 }}>
                        {episode.grammarPoints.map((gp) => (
                          <Box
                            key={gp.number}
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.5,
                              py: 2,
                              px: 2,
                              borderRadius: '12px',
                              border: '1px solid rgba(44,26,14,0.08)',
                              background: '#fff',
                              boxShadow: '0 2px 8px rgba(44,26,14,0.04)',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.75rem * ${textScale})`, fontWeight: 700, color: 'var(--gold)', mt: 0.4, flexShrink: 0 }}>
                                {String(gp.number).padStart(2, '0')}
                              </Typography>
                              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.95rem * ${textScale})`, fontWeight: 600, color: 'var(--bark)', lineHeight: 1.4 }}>
                                <SafeHtml text={gp.pattern} />
                              </Typography>
                            </Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.85rem * ${textScale})`, color: 'var(--bark)', lineHeight: 1.6 }}>
                              {gp.explanation}
                            </Typography>
                            <Box sx={{ textAlign: 'right', direction: 'rtl', background: 'rgba(14,46,31,0.03)', borderRadius: '8px', px: 1.5, py: 1 }}>
                              <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: `calc(1.05rem * ${textScale})`, fontWeight: 700, color: 'var(--forest)', lineHeight: 1.5 }}>
                                {gp.example}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>

                      {/* Desktop: table */}
                      <Box sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'auto' }}>
                        <table className="vocab-table">
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'center', width: 48 }}>#</th>
                              <th>Pattern</th>
                              <th>How It Works</th>
                              <th style={{ textAlign: 'right', direction: 'rtl' }}>Example</th>
                            </tr>
                          </thead>
                          <tbody>
                            {episode.grammarPoints.map((gp) => (
                              <tr key={gp.number}>
                                <td style={{ textAlign: 'center', fontFamily: 'Jost, sans-serif', fontSize: `calc(0.8rem * ${textScale})`, color: 'var(--muted)' }}>
                                  {gp.number}
                                </td>
                                <td style={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.9rem * ${textScale})`, fontWeight: 600, color: 'var(--bark)' }}>
                                  <SafeHtml text={gp.pattern} />
                                </td>
                                <td style={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.85rem * ${textScale})`, color: 'var(--bark)' }}>
                                  {gp.explanation}
                                </td>
                                <td className="vocab-arabic" style={{ fontSize: `calc(1rem * ${textScale})` }}>
                                  {gp.example}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Box>
                    </>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Test Yourself Dialog ── */}
      <EpisodeTestDialog
        episode={episode}
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        playSegment={playSegment}
      />
    </>
  )
}
