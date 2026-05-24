'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Chip,
  Drawer,
  IconButton,
} from '@mui/material'
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'
import { Close } from '@mui/icons-material'
import { useMediaQuery } from '@mui/material'
import { stripDiacritics, normalizeArabicToken } from '@/app/lib/arabic'
import { useRevisionStore } from '@/store/revisionStore'
import { useAuth } from '@/app/AuthContext'

const LEVEL_COLORS: Record<string, string> = {
  A1: '#2d6a4f', A2: '#40916c', B1: '#b5861a', B2: '#9c6b00', C1: '#6d4c9e', C2: '#4a2f7a',
}

/* ── VocabEntry shape ── */
export interface InlineVocabEntry {
  id: number
  word: string
  word_diacritic: string
  definition: string
  pos: string
  transliteration: string
  level: string
  theme: string
}

/* ── Styled Tooltip ── */
const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#fff',
    color: 'var(--bark)',
    maxWidth: 320,
    fontSize: theme.typography.pxToRem(14),
    border: '1px solid rgba(44,26,14,0.08)',
    borderRadius: '12px',
    padding: 0,
    boxShadow: '0 12px 40px rgba(44,26,14,0.18)',
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: '#fff',
    '&::before': {
      border: '1px solid rgba(44,26,14,0.08)',
    },
  },
}))

/* ── Proclitics & Enclitics ── */
const PROCLITICS = [
  'ال', 'و', 'ف', 'ب', 'ل', 'ك', 'س', 'أ', 'سأ',
  'وب', 'فب', 'ول', 'فل', 'وبال', 'فبال', 'ولل', 'فلل',
  'بال', 'فال', 'وال', 'لل', 'كال', 'وس', 'فس',
]

const ENCLITICS = [
  'ك', 'ه', 'ها', 'هم', 'هن', 'نا', 'ي', 'ن',
  'كما', 'هما', 'تا', 'تما', 'ان', 'ين', 'ون',
  'ات', 'تك', 'ته', 'تها', 'تهم', 'تهن', 'تنا', 'تي', 'تن',
]

function getStrippedForms(word: string): string[] {
  const forms = new Set<string>()
  forms.add(word)

  if (word.endsWith('ة')) {
    forms.add(word.slice(0, -1) + 'ه')
  }

  for (const p of PROCLITICS) {
    if (word.startsWith(p) && word.length - p.length >= 3) {
      forms.add(word.slice(p.length))
    }
  }

  for (const e of ENCLITICS) {
    if (word.endsWith(e) && word.length - e.length >= 3) {
      forms.add(word.slice(0, -e.length))
    }
  }

  for (const p of PROCLITICS) {
    for (const e of ENCLITICS) {
      if (
        word.startsWith(p) &&
        word.endsWith(e) &&
        word.length - p.length - e.length >= 3
      ) {
        forms.add(word.slice(p.length, -e.length))
      }
    }
  }

  return Array.from(forms)
}

function lookupEntry(
  part: string,
  vocabMap: Record<string, InlineVocabEntry>
): InlineVocabEntry | undefined {
  const bare = stripDiacritics(part)

  if (vocabMap[bare]) return vocabMap[bare]

  for (const candidate of getStrippedForms(bare)) {
    if (candidate !== bare && vocabMap[candidate]) {
      return vocabMap[candidate]
    }
  }

  const normalized = normalizeArabicToken(part)
  return vocabMap[normalized]
}

/* ── VocabDetail ── */
function VocabDetail({
  entry,
  toggling,
  inRevision,
  onToggle,
  textScale,
  onClose,
}: {
  entry: InlineVocabEntry
  toggling: boolean
  inRevision: boolean
  onToggle: () => void
  textScale: number
  onClose?: () => void
}) {
  const { user } = useAuth()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {(entry.level || entry.theme || onClose) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
            {entry.level && (
              <Chip
                label={entry.level}
                size="small"
                sx={{
                  background: LEVEL_COLORS[entry.level] ?? 'var(--forest)',
                  color: '#fff',
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 600,
                  fontSize: `calc(0.7rem * ${textScale})`,
                  letterSpacing: '0.04em',
                }}
              />
            )}
            {entry.theme && (
              <Chip
                label={entry.theme}
                size="small"
                sx={{
                  background: 'rgba(184,134,11,0.12)',
                  color: 'var(--gold)',
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 600,
                  fontSize: `calc(0.7rem * ${textScale})`,
                  border: '1px solid rgba(184,134,11,0.25)',
                }}
              />
            )}
          </Box>

          {onClose && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              size="small"
              sx={{ color: '#7a6e65', width: 26, height: 26, flexShrink: 0 }}
            >
              <Close sx={{ fontSize: '0.95rem' }} />
            </IconButton>
          )}
        </Box>
      )}

      <Box sx={{ textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: `calc(1.7rem * ${textScale})`,
            fontWeight: 700,
            color: 'var(--bark)',
            direction: 'rtl',
          }}
        >
          {entry.word_diacritic || entry.word}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: `calc(0.85rem * ${textScale})`,
            color: 'var(--muted)',
            mt: 0.5,
          }}
        >
          {entry.transliteration}
        </Typography>
      </Box>

      <Box>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: `calc(0.75rem * ${textScale})`,
            fontWeight: 600,
            color: 'var(--forest)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {entry.pos}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: `calc(0.95rem * ${textScale})`,
            color: 'var(--bark)',
            mt: 0.5,
          }}
        >
          {entry.definition}
        </Typography>
      </Box>

      {user ? (
        <button
          disabled={toggling}
          onClick={onToggle}
          style={{
            background: inRevision ? '#b8860b' : '#0e2e1f',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontFamily: 'Jost, sans-serif',
            fontWeight: 600,
            fontSize: `calc(0.9rem * ${textScale})`,
            cursor: 'pointer',
            opacity: toggling ? 0.6 : 1,
          }}
        >
          {toggling ? 'Updating…' : inRevision ? 'Remove from Revision' : 'Add to Revision'}
        </button>
      ) : (
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: `calc(0.78rem * ${textScale})`,
            color: 'var(--muted)',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Sign in to save words for revision
        </Typography>
      )}
    </Box>
  )
}

/* ── InlineVocabText ── */
export default function InlineVocabText({
  text,
  vocabMap,
  textScale = 1,
  propagateClick = false,
}: {
  text: string
  vocabMap: Record<string, InlineVocabEntry>
  textScale?: number
  propagateClick?: boolean
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
  const revisionStore = useRevisionStore()
  const isInRevision = revisionStore.isInRevision
  const toggleRevision = revisionStore.toggleRevision

  const [activeEntry, setActiveEntry] = useState<InlineVocabEntry | null>(null)
  const [activePartIndex, setActivePartIndex] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

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

  const handleOpen = useCallback((entry: InlineVocabEntry, el: HTMLSpanElement, partIndex: number) => {
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
  }, [clearLeaveTimer])

  const handleToggle = useCallback(async () => {
    if (!activeEntry) return
    setToggling(true)
    await toggleRevision(activeEntry.id)
    setToggling(false)
  }, [activeEntry, toggleRevision])

  useEffect(() => {
    return () => { clearLeaveTimer() }
  }, [clearLeaveTimer])

  const parts = text.split(/([\u0600-\u06FF]+)/)

  return (
    <>
      {parts.map((part, i) => {
        if (!/[\u0600-\u06FF]+/.test(part)) {
          return <span key={i}>{part}</span>
        }
        const entry = lookupEntry(part, vocabMap)
        if (!entry) {
          return <span key={i}>{part}</span>
        }

        const isActive = activeEntry?.id === entry.id && open && activePartIndex === i

        if (isMobile) {
          return (
            <React.Fragment key={i}>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpen(entry, e.currentTarget, i)
                }}
                style={{
                  cursor: 'pointer',
                  borderBottom: '2px dotted #b8860b',
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
                    <VocabDetail
                      entry={activeEntry}
                      toggling={toggling}
                      inRevision={activeEntry ? isInRevision(activeEntry.id) : false}
                      onToggle={handleToggle}
                      textScale={textScale}
                      onClose={handleClose}
                    />
                  )}
                </Box>
              </Drawer>
            </React.Fragment>
          )
        }

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
                    <VocabDetail
                      entry={activeEntry}
                      toggling={toggling}
                      inRevision={activeEntry ? isInRevision(activeEntry.id) : false}
                      onToggle={handleToggle}
                      textScale={textScale}
                    />
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
                    options: { padding: 16 },
                  },
                ],
              },
            }}
          >
            <span
              onClick={(e) => {
                if (!propagateClick) e.stopPropagation()
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(184,134,11,0.12)'
                handleOpen(entry, e.currentTarget, i)
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                scheduleClose()
              }}
              style={{
                cursor: 'pointer',
                borderBottom: '2px dotted #b8860b',
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
