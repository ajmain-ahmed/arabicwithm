'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material'
import { stripDiacritics } from '@/app/lib/arabic'
import { formatCefr, formatPos } from '@/app/lib/display'
import HtmlTooltip from './HtmlTooltip'
import WordTooltip from './WordTooltip'
import type { VocabEntry } from './index'

/* ═══════════════════════════════════════════════
   ArabicText — Desktop tooltip + Mobile bottom-sheet
   ═══════════════════════════════════════════════ */
export interface ArabicTextProps {
  text: string
  wordMap: Record<string, VocabEntry>
  diacritizedMap: Record<string, VocabEntry>
  textScale?: number
  diagnostics?: boolean
}

export default function ArabicText({
  text,
  wordMap,
  diacritizedMap,
  textScale = 1,
  diagnostics = false,
}: ArabicTextProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))

  const [activeEntry, setActiveEntry] = useState<VocabEntry | null>(null)
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

  const handleOpen = useCallback(
    (entry: VocabEntry, el: HTMLSpanElement, partIndex: number) => {
      clearLeaveTimer()
      setActiveEntry(entry)
      setActivePartIndex(partIndex)
      setOpen(true)
      childRef.current = el
    },
    [clearLeaveTimer]
  )

  const handleClose = useCallback(() => {
    clearLeaveTimer()
    setOpen(false)
    setActiveEntry(null)
    setActivePartIndex(null)
    childRef.current = null
  }, [clearLeaveTimer])

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

        const wordSpan = (
          <span
            onClick={(e) => e.stopPropagation()}
            className="vocab-word"
            style={{
              cursor: 'pointer',
              borderBottom: '2px dotted var(--gold, #b8860b)',
              paddingBottom: '1px',
              transition: 'background 0.15s',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(184,134,11,0.12)'
              if (!isMobile) {
                handleOpen(entry, e.currentTarget, i)
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              if (!isMobile) {
                scheduleClose()
              }
            }}
          >
            {part}
            {diagnostics && (
              <span
                style={{
                  display: 'block',
                  fontSize: `calc(0.55rem * ${textScale})`,
                  color: 'var(--muted, #7a6e65)',
                  fontFamily: 'Jost, sans-serif',
                  textAlign: 'center',
                  lineHeight: 1,
                  marginTop: '1px',
                  direction: 'ltr',
                  borderBottom: 'none',
                  pointerEvents: 'none',
                }}
              >
                {entry.pos ? `${formatPos(entry.pos)} · ` : ''}{entry.cefr ? formatCefr(entry.cefr) : ''}
              </span>
            )}
          </span>
        )

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
                  borderBottom: '2px dotted var(--gold, #b8860b)',
                  paddingBottom: '1px',
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
            {wordSpan}
          </HtmlTooltip>
        )
      })}
    </>
  )
}
