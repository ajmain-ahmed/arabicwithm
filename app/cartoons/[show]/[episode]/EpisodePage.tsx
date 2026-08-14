'use client'

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import SafeHtml from '@/app/components/SafeHtml'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  useMediaQuery,
  Chip,
  Breadcrumbs,
  SwipeableDrawer,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ArrowBack, Settings, ExpandMore, ExpandLess, ChevronRight } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'
import { stripDiacritics } from '@/app/lib/arabic'
import { EpisodeFull, CartoonWordEntry } from '@/app/lib/cartoons'
import { type ShowRow } from '@/app/actions/admin'
import { fetchShowsForEpisodeEdit } from '@/app/actions/cartoons'
import { HtmlTooltip, WordTooltip, LEVEL_COLORS } from '@/app/components/vocab-tooltip'
import { SettingsDialog } from '@/app/components/settings-controls'
import { useIsAdmin } from '@/app/lib/useIsAdmin'
import { usePlayerStore } from '@/store/playerStore'

const EpisodeEditDialog = dynamic(() => import('@/app/(admin)/admin/components/EpisodeEditDialog'), { ssr: false })

// ─── Fallback — used before we measure the real navbar ────────────────────────
const NAVBAR_HEIGHT = 64 // px
// ──────────────────────────────────────────────────────────────────────────────

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@700&family=Jost:wght@300;400;500;600&display=swap');

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
    padding: 4px 20px 8px;
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
   Settings button — opens the settings dialog
───────────────────────────────────────────── */
interface SettingsButtonProps {
  onClick: () => void
}

function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="small"
      startIcon={<Settings sx={{ fontSize: 18 }} />}
      sx={{
        color: 'var(--gold)',
        border: '1px solid rgba(184,134,11,0.3)',
        borderRadius: '8px',
        textTransform: 'none',
        fontFamily: 'Jost, sans-serif',
        fontWeight: 600,
        fontSize: '0.85rem',
        px: 1.5,
        minWidth: 0,
        '&:hover': { bgcolor: 'rgba(184,134,11,0.08)' },
      }}
      aria-label="Settings"
    >
      Settings
    </Button>
  )
}

/* ─────────────────────────────────────────────
   MobileFixedHeader — portal into <body>
───────────────────────────────────────────── */
function MobileFixedHeader({
  title,
  onBack,
  onHeightChange,
  top,
  onSettingsClick,
}: {
  title: string
  onBack: () => void
  onHeightChange?: (height: number) => void
  top: number
  onSettingsClick: () => void
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const innerRef = useRef<HTMLDivElement>(null)

  // Report height back to parent so <main> can pad itself correctly
  useLayoutEffect(() => {
    if (innerRef.current && onHeightChange) {
      onHeightChange(innerRef.current.offsetHeight)
    }
  }, [mounted, onHeightChange])

  useEffect(() => {
    if (!innerRef.current || !onHeightChange) return
    const ro = new ResizeObserver(() => {
      onHeightChange(innerRef.current!.offsetHeight)
    })
    ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [mounted, onHeightChange])

  if (!mounted) return null

  const content = (
    <div id="mobile-fixed-header" ref={innerRef} style={{ top: `${top}px` }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 30, marginBottom: 14 }}>
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
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>

        {/* Title — centred */}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            margin: '0 12px',
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

        {/* Actions — settings only on mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <SettingsButton onClick={onSettingsClick} />
        </div>
      </div>

      {/* Video — moved into the fixed header on mobile */}
    </div>
  )

  return createPortal(content, document.body)
}

/* ─────────────────────────────────────────────
   WordTooltip — inline markdown word popup
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   Global guard — disable script-line clicks while any vocab UI is open.
   Lives outside component instances so multiple tooltips share state.
───────────────────────────────────────────── */
const vocabTrackerRef = { openCount: 0, lastCloseAt: 0 }

function useVocabOpenTracker(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      vocabTrackerRef.openCount++
      return () => {
        vocabTrackerRef.openCount--
        vocabTrackerRef.lastCloseAt = Date.now()
      }
    }
  }, [isOpen])
}

/* ─────────────────────────────────────────────
   ArabicLineText — Desktop tooltip / Mobile bottom-sheet
───────────────────────────────────────────── */
function ArabicLineText({
  text,
  words,
  wordMap,
  diacritizedMap,
  textScale,
  showDiacritics,
  onDrawerOpenChange,
}: {
  text: string
  words?: CartoonWordEntry[]
  wordMap: Record<string, CartoonWordEntry>
  diacritizedMap: Record<string, CartoonWordEntry>
  textScale: number
  showDiacritics: boolean
  onDrawerOpenChange?: (open: boolean) => void
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))

  const [activeEntry, setActiveEntry] = useState<CartoonWordEntry | null>(null)
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  const [drawerEntry, setDrawerEntry] = useState<CartoonWordEntry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const handleOpenDrawer = useCallback((entry: CartoonWordEntry) => {
    setDrawerEntry(entry)
    setDrawerOpen(true)
    onDrawerOpenChange?.(true)
  }, [onDrawerOpenChange])

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
    onDrawerOpenChange?.(false)
  }, [onDrawerOpenChange])

  useVocabOpenTracker(open)

  useEffect(() => {
    return () => {
      clearLeaveTimer()
    }
  }, [clearLeaveTimer])

  const findEntry = useCallback(
    (part: string): CartoonWordEntry | null => {
      const normalized = part.normalize('NFC')
      const stripped = normalized.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '')
      const plain = stripDiacritics(normalized)
      const strippedPlain = stripDiacritics(stripped)
      return (
        diacritizedMap[normalized] ??
        diacritizedMap[stripped] ??
        wordMap[plain] ??
        wordMap[strippedPlain] ??
        null
      )
    },
    [diacritizedMap, wordMap]
  )

  const segments = useMemo(() => {
    type Segment =
      | { type: 'text'; text: string }
      | { type: 'word'; text: string; entry: CartoonWordEntry; index: number }
      | { type: 'unmatched-word'; text: string }

    // If we have the exact block words, use them directly so each occurrence
    // keeps its own metadata (POS, English, CEFR, etc.) instead of being
    // overwritten by a later occurrence in the global wordMap.
    if (words && words.length > 0) {
      const segs: Segment[] = []
      words.forEach((w, idx) => {
        if (idx > 0) {
          segs.push({ type: 'text', text: ' ' })
        }
        segs.push({ type: 'word', text: showDiacritics ? w.arabic : w.plain, entry: w, index: idx })
      })
      return segs
    }

    type Token = { type: 'word' | 'sep'; value: string }
    const tokens: Token[] = []
    let current = ''
    let isWord: boolean | null = null
    for (const char of text) {
      const charIsWord = /[\u0600-\u06FF]/.test(char)
      if (isWord === null) {
        isWord = charIsWord
        current = char
      } else if (isWord === charIsWord) {
        current += char
      } else {
        tokens.push({ type: isWord ? 'word' : 'sep', value: current })
        isWord = charIsWord
        current = char
      }
    }
    if (current) tokens.push({ type: isWord ? 'word' : 'sep', value: current })

    const segs: Segment[] = []
    let i = 0
    let wordIndex = 0
    while (i < tokens.length) {
      const token = tokens[i]
      if (token.type === 'sep') {
        segs.push({ type: 'text', text: token.value })
        i++
        continue
      }

      let matchedEntry = findEntry(token.value)
      let matchedLen = 1
      let phrase = token.value
      let j = i + 1

      while (j < tokens.length) {
        if (tokens[j].type === 'sep' && /^\s+$/.test(tokens[j].value)) {
          if (j + 1 < tokens.length && tokens[j + 1].type === 'word') {
            const candidate = phrase + tokens[j].value + tokens[j + 1].value
            const entry = findEntry(candidate)
            if (entry) {
              matchedEntry = entry
              matchedLen = j + 1 - i + 1
              phrase = candidate
            }
            j += 2
          } else {
            break
          }
        } else {
          break
        }
      }

      if (matchedEntry) {
        segs.push({ type: 'word', text: phrase, entry: matchedEntry, index: wordIndex })
        wordIndex++
        i += matchedLen
      } else {
        if (token.type === 'word') {
          segs.push({ type: 'unmatched-word', text: token.value })
        } else {
          segs.push({ type: 'text', text: token.value })
        }
        i++
      }
    }
    return segs
  }, [text, words, showDiacritics, findEntry])

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>
        }

        /* ── Unmatched Arabic word — highlight missing lemma match ── */
        if (seg.type === 'unmatched-word') {
          return (
            <span
              key={i}
              style={{
                borderBottom: '2px dotted #c62828',
                paddingBottom: showDiacritics ? '10px' : '4px',
              }}
            >
              {seg.text}
            </span>
          )
        }

        const { text: wordText, entry, index } = seg
        const isActive = activeEntry === entry && open && activePartIndex === index
        const underlineColor = 'var(--gold)'

        /* ── Mobile: tap word → bottom-sheet summary ── */
        if (isMobile) {
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                handleOpenDrawer(entry)
              }}
              className="vocab-word"
              style={{
                cursor: 'pointer',
                borderBottom: `2px dotted ${underlineColor}`,
                paddingBottom: showDiacritics ? '10px' : '4px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(184,134,11,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {wordText}
            </span>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(184,134,11,0.12)'
                handleOpen(entry, e.currentTarget, index)
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                scheduleClose()
              }}
              className="vocab-word"
              style={{
                cursor: 'pointer',
                borderBottom: `2px dotted ${underlineColor}`,
                paddingBottom: showDiacritics ? '10px' : '4px',
                transition: 'background 0.15s',
              }}
            >
              {wordText}
            </span>
          </HtmlTooltip>
        )
      })}

      {/* Mobile bottom-sheet summary */}
      <SwipeableDrawer
        anchor="bottom"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onOpen={() => {}}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px 20px 0 0',
              bgcolor: 'var(--cream)',
              maxHeight: '70vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {drawerEntry && (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                px: 3,
                pb: 3.5,
                pt: 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontSize: '2.1rem',
                  fontWeight: 700,
                  color: 'var(--bark)',
                  direction: 'rtl',
                  lineHeight: 1.25,
                }}
              >
                {showDiacritics ? drawerEntry.arabic : drawerEntry.plain}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                {drawerEntry.cefr && (
                  <Chip
                    label={drawerEntry.cefr}
                    size="small"
                    sx={{
                      bgcolor: LEVEL_COLORS[drawerEntry.cefr] ?? 'var(--forest)',
                      color: '#fff',
                      fontFamily: 'Jost, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      letterSpacing: '0.04em',
                    }}
                  />
                )}
                {drawerEntry.pos && (
                  <Chip
                    label={drawerEntry.pos}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(44,26,14,0.08)',
                      color: 'var(--bark)',
                      fontFamily: 'Jost, sans-serif',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      textTransform: 'capitalize',
                    }}
                  />
                )}
              </Box>

              {drawerEntry.transliteration && (
                <Typography
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '1.1rem',
                    color: 'var(--muted)',
                    fontStyle: 'normal',
                    lineHeight: 1.4,
                  }}
                >
                  {drawerEntry.transliteration}
                </Typography>
              )}

              {drawerEntry.english ? (
                <Typography
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--bark)',
                    lineHeight: 1.45,
                  }}
                >
                  {drawerEntry.english}
                </Typography>
              ) : (
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.05rem', color: 'var(--muted)' }}>
                  No meaning available.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </SwipeableDrawer>

    </>
  )
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function EpisodePage({
  episode,
  showTitle,
}: {
  episode: EpisodeFull
  showTitle: string
}) {
  const router = useRouter()
  const isAdmin = useIsAdmin()
  const openPip = usePlayerStore((state) => state.openPip)
  const closePip = usePlayerStore((state) => state.closePip)
  const requestPipSeek = usePlayerStore((state) => state.requestSeek)
  const pipCurrentTime = usePlayerStore((state) => state.currentTime)
  const pipVideoId = usePlayerStore((state) => state.videoId)
  const [tab, setTab] = useState(0)
  const [showDiacritics, setShowDiacritics] = useState(true)
  const [textScale, setTextScale] = useState(1.3)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())
  const [localActiveIndex, setLocalActiveIndex] = useState<number | null>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [mobileWordDrawerOpen, setMobileWordDrawerOpen] = useState(false)
  const [allShows, setAllShows] = useState<ShowRow[]>([])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    fetchShowsForEpisodeEdit()
      .then((shows) => {
        if (!cancelled) setAllShows(shows)
      })
      .catch((err) => {
        console.error("[EpisodePage] failed to load shows for edit:", err)
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const theme = useTheme()
  const isMobileViewport = useMediaQuery(theme.breakpoints.down('md'))
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
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
  const estimatedMobileHeader = 56
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(estimatedMobileHeader)

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

  const findActiveIndex = useCallback((time: number) => {
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
    return idx >= 0 ? idx : null
  }, [episode.scriptBlocks])

  const handleTimeUpdate = useCallback((time: number) => {
    setLocalActiveIndex(findActiveIndex(time))
  }, [findActiveIndex])

  const activeIndex = isMobile && pipVideoId === episode.youtubeId
    ? findActiveIndex(pipCurrentTime)
    : localActiveIndex

  const { wrapRef, seekTo } = useYouTubePlayer(
    isMobile ? undefined : episode.youtubeId,
    handleTimeUpdate
  )

  useEffect(() => {
    if (!episode.youtubeId) return

    if (isMobile) {
      const currentPlayer = usePlayerStore.getState()
      if (!currentPlayer.pipOpen || currentPlayer.videoId !== episode.youtubeId) {
        openPip({
          videoId: episode.youtubeId,
          episodePath: `/cartoons/${episode.show}/${episode.slug}`,
          title: episode.title,
          showTitle,
          currentTime: 0,
          orientation: 'portrait',
        })
      }
    } else {
      const currentPlayer = usePlayerStore.getState()
      if (currentPlayer.pipOpen && currentPlayer.videoId === episode.youtubeId) closePip()
    }
  }, [closePip, episode.show, episode.slug, episode.title, episode.youtubeId, isMobile, openPip, showTitle])

  // Keep the YouTube wrapper non-interactive for a short delay after the mobile
  // word drawer closes. The tap that dismisses the drawer is sometimes
  // re-delivered to the iframe once it unmounts, which would toggle playback.
  const mobileOverlayOpen = mobileWordDrawerOpen
  useEffect(() => {
    if (!wrapRef.current) return
    if (mobileOverlayOpen) {
      wrapRef.current.style.pointerEvents = 'none'
      return
    }
    const t = setTimeout(() => {
      if (wrapRef.current) wrapRef.current.style.pointerEvents = 'auto'
    }, 250)
    return () => clearTimeout(t)
  }, [mobileOverlayOpen, wrapRef])

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

  const blocksWithNotes = episode.scriptBlocks
    .map((block, i) => ({ hasNotes: block.notes.length > 0, index: i }))
    .filter((b) => b.hasNotes)
    .map((b) => b.index)
  const allNotesExpanded = blocksWithNotes.length > 0 && blocksWithNotes.every((i) => expandedNotes.has(i))

  const openSettings = useCallback(() => setSettingsOpen(true), [])

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
        onEdit={isAdmin ? () => setEditDialogOpen(true) : undefined}
      />

      {/* ── Mobile fixed portal header ── */}
      {isMobile && (
        <MobileFixedHeader
          top={navbarHeight}
          title={episode.title}
          onBack={() => router.push(`/cartoons/${episode.show}`)}
          onHeightChange={setMobileHeaderHeight}
          onSettingsClick={openSettings}
        />
      )}

      <Box
        component="main"
        sx={{
          background: 'var(--cream)',
          // Counteract the root layout main padding-top so the fixed mobile
          // header and transcript sit flush.
          mt: { xs: '-56px', md: '-64px' },
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
                fontFamily: 'var(--font-heading)',
                fontSize: '2rem',
                fontWeight: 600,
                color: 'var(--bark)',
                lineHeight: 1.15,
                mb: 1,
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
                aspectRatio: '9/16',
                maxHeight: 560,
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
              mt: { xs: 0.5, lg: 0 },
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

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsButton onClick={openSettings} />
              </Box>
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
                <Tab label={isMobileViewport ? 'Vocab' : 'Vocabulary List'} />
                <Tab label={isMobileViewport ? 'Grammar' : 'Grammar Points'} />
              </Tabs>

            </Box>

            <Box sx={{ background: '#fff', borderRadius: '0 0 12px 12px', px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
              {/* ── Test Yourself button (Script tab only) ── */}
              {tab === 0 && episode.scriptBlocks.length > 0 && (
                <Box sx={{ mb: { xs: 2, md: 3 }, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
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
                      {allNotesExpanded ? 'Collapse notes' : 'Notes'}
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
                              if (vocabTrackerRef.openCount > 0) return
                              if (Date.now() - vocabTrackerRef.lastCloseAt < 120) return
                              if ((e.target as HTMLElement).closest('.vocab-word')) return
                              if (hasTimestamp) {
                                if (isMobile) requestPipSeek(block.timestamp!)
                                else seekTo(block.timestamp!)
                              }
                            }}
                            sx={{ cursor: hasTimestamp ? 'pointer' : 'default', opacity: hasTimestamp ? 1 : 0.75 }}
                          >
                            {/* Block title / timestamp */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                {hasTimestamp && (
                                  <Typography sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.04em', fontWeight: 600, lineHeight: 1 }}>
                                    {(() => { const s = block.timestamp!; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}` })()}
                                  </Typography>
                                )}
                                <Typography sx={{ fontFamily: 'Jost, var(--font-sans)', fontSize: `calc(0.75rem * ${textScale})`, color: 'var(--muted)', fontWeight: 500 }}>
                                  {block.title}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Arabic */}
                            <Typography component="div" className="arabic-line" sx={{ fontSize: `calc(1.35rem * ${textScale})`, mb: 0.5 }}>
                              <ArabicLineText
                                textScale={textScale}
                                text={showDiacritics ? block.arabicDiacritic : block.arabicPlain}
                                words={block.words}
                                wordMap={episode.wordMap}
                                diacritizedMap={episode.diacritizedMap}
                                showDiacritics={showDiacritics}
                                onDrawerOpenChange={setMobileWordDrawerOpen}
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
                        {row.cefr && (
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
                        )}

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

      {/* ── Admin Edit Dialog ── */}
      {isAdmin && (
        <EpisodeEditDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          episodeId={episode.id}
          showId={episode.show_id}
          shows={allShows ?? []}
          onSaved={() => {
            setEditDialogOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
