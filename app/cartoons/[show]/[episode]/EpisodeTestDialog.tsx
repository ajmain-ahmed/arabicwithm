'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Box, Typography, Button, Collapse, Dialog, IconButton, Chip, Tooltip, type TooltipProps,
} from '@mui/material'
import { useMediaQuery } from '@mui/material'
import { tooltipClasses } from '@mui/material/Tooltip'
import { styled } from '@mui/material/styles'
import {
  Close, Replay, Check, Visibility,
  VolumeUp, School,
} from '@mui/icons-material'
import type { ScriptBlock, EpisodeFull, CartoonWordEntry } from '@/app/lib/cartoons'
import { stripDiacritics } from '@/app/lib/arabic'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Types ───────────────────────────────────────────── */
type Rating = 'correct' | 'incorrect'

interface CardLog {
  cardId: number
  rating: Rating
  timeTaken: number
}

/* ── Helpers ───────────────────────────────────────────── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sentenceTransliteration(words: { transliteration: string }[]): string {
  return words.map(w => w.transliteration).join(' ')
}

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#fff',
    color: '#2c1a0e',
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

function WordTooltip({ entry, textScale }: { entry: CartoonWordEntry; textScale: number }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 200, p: 2.5 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: `calc(1.6rem * ${textScale})`, fontWeight: 700, color: '#2c1a0e', direction: 'rtl' }}>
          {entry.arabic}
        </Typography>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.85rem * ${textScale})`, color: '#7a6e65', mt: 0.5 }}>
          {entry.transliteration}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
        {entry.pos && (
          <Chip
            label={entry.pos}
            size="small"
            sx={{
              background: 'rgba(44,26,14,0.08)',
              color: '#2c1a0e',
              fontFamily: 'Jost, sans-serif',
              fontWeight: 600,
              fontSize: `calc(0.7rem * ${textScale})`,
              letterSpacing: '0.04em',
              textTransform: 'capitalize',
            }}
          />
        )}
      </Box>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.95rem * ${textScale})`, color: '#2c1a0e', textAlign: 'center', minHeight: `calc(0.95rem * ${textScale})` }}>
        {entry.english || '—'}
      </Typography>
    </Box>
  )
}

const RATING_META: { value: Rating; label: string; color: string; border: string; bg: string; icon: React.ReactNode }[] = [
  { value: 'incorrect', label: 'Incorrect', color: '#c62828', border: 'rgba(198,40,40,0.4)', bg: 'rgba(198,40,40,0.06)', icon: <Replay sx={{ fontSize: '1rem' }} /> },
  { value: 'correct', label: 'Correct', color: '#2e7d32', border: 'rgba(46,125,50,0.4)', bg: 'rgba(46,125,50,0.06)', icon: <Check sx={{ fontSize: '1rem' }} /> },
]

/* ── Progress dots ─────────────────────────────────────── */
function DotBar({ total, current, ratings }: { total: number; current: number; ratings: (Rating | null)[] }) {
  const maxDots = 30
  let start = 0
  let end = total
  if (total > maxDots) {
    start = Math.max(0, Math.min(current - 10, total - maxDots))
    end = start + maxDots
  }
  const visible = Array.from({ length: end - start }, (_, i) => start + i)
  return (
    <Box sx={{ display: 'flex', gap: '5px', mb: 2, flexWrap: 'wrap' }}>
      {visible.map((idx) => {
        const r = ratings[idx]
        const color = r ? RATING_META.find(x => x.value === r)?.color : idx === current ? '#b8860b' : 'rgba(122,110,101,0.25)'
        return (
          <Box
            key={idx}
            sx={{
              width: 8, height: 8, borderRadius: '50%',
              background: color,
              transition: 'all 0.3s ease',
              ...(idx === current && !r && { boxShadow: '0 0 0 3px rgba(184,134,11,0.2)' }),
            }}
          />
        )
      })}
    </Box>
  )
}

/* ── Single card: Arabic shown, reveal shows transliteration + English ── */
function RecallCard({
  block, onReveal, revealed, textScale, showDiacritics, onPlayAudio,
}: {
  block: ScriptBlock
  onReveal: () => void
  revealed: boolean
  textScale: number
  showDiacritics: boolean
  onPlayAudio: () => void
}) {
  const isMobile = useMediaQuery('(max-width:600px)')
  const arabicText = showDiacritics ? block.arabicDiacritic : block.arabicPlain
  const tr = sentenceTransliteration(block.words)

  const wordMap = useMemo(() => {
    const map: Record<string, CartoonWordEntry> = {}
    block.words.forEach(w => {
      map[w.plain] = w
      map[w.arabic] = w
      map[stripDiacritics(w.arabic)] = w
    })
    return map
  }, [block.words])

  const parts = arabicText.split(/([\u0600-\u06FF]+)/)

  return (
    <>
      {/* Audio + header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: '#9e8a7a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Recall the meaning
        </Typography>
        {block.timestamp != null && (
          <IconButton
            onClick={(e) => { e.stopPropagation(); onPlayAudio() }}
            size="small"
            sx={{
              width: 36, height: 36,
              border: '1px solid rgba(184,134,11,0.3)',
              borderRadius: '50%',
              color: '#b8860b',
              '&:hover': { background: 'rgba(184,134,11,0.08)' },
            }}
          >
            <VolumeUp sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        )}
      </Box>

      {/* Arabic sentence + transliteration — always visible */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography dir="rtl" sx={{
          fontFamily: "'EB Garamond', serif",
          fontSize: `calc(${isMobile ? '1.8rem' : '2.4rem'} * ${textScale})`,
          fontWeight: 700, color: '#2c1a0e', lineHeight: 1.6,
        }}>
          {parts.map((part, i) => {
            if (!/[\u0600-\u06FF]+/.test(part)) {
              return <span key={i}>{part}</span>
            }
            const plain = stripDiacritics(part)
            const entry = wordMap[plain] || wordMap[part]
            if (!entry || !revealed) {
              return <span key={i}>{part}</span>
            }
            return (
              <React.Fragment key={i}>
                <HtmlTooltip
                  title={<WordTooltip entry={entry} textScale={textScale} />}
                  placement="bottom"
                  arrow
                >
                  <span
                    style={{
                      cursor: 'pointer',
                      borderBottom: '2px dotted #b8860b',
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
                </HtmlTooltip>
              </React.Fragment>
            )
          })}
        </Typography>
        <Typography sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: `calc(${isMobile ? '1rem' : '1.15rem'} * ${textScale})`,
          fontWeight: 500, color: '#b8860b', letterSpacing: '0.04em', lineHeight: 1.5,
          mt: 1.5,
        }}>
          {tr}
        </Typography>
      </Box>

      {/* Revealed: English meaning only */}
      <Collapse in={revealed} timeout={{ enter: 300, exit: 0 }}>
        <Box sx={{ borderTop: '1px solid rgba(184,134,11,0.1)', pt: '1.5rem', mb: '1rem', textAlign: 'center' }}>
          <Typography sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: `calc(${isMobile ? '1.1rem' : '1.3rem'} * ${textScale})`,
            fontWeight: 500, color: '#7a6e65', lineHeight: 1.5, fontStyle: 'italic',
          }}>
            {block.english || block.title}
          </Typography>
        </Box>
      </Collapse>

      {!revealed && (
        <Box sx={{ pt: { xs: 2, md: 3 } }}>
          <Button
            fullWidth variant="outlined" onClick={onReveal}
            startIcon={<Visibility />}
            sx={{
              py: { xs: '0.75rem', md: '0.8rem' },
              border: '1px solid rgba(184,134,11,0.3)', borderRadius: '6px',
              color: '#2c1a0e', fontFamily: 'Jost, sans-serif',
              fontSize: { xs: '1rem', md: 'clamp(1rem, 1.6vw, 1.2rem)' },
              fontWeight: 500, letterSpacing: '0.04em', textTransform: 'none',
              '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: 'rgba(184,134,11,0.5)' },
            }}
          >
            Show English
          </Button>
        </Box>
      )}
    </>
  )
}

/* ── Results screen ────────────────────────────────────── */
function ResultsScreen({ logs, onRestart, onClose }: { logs: CardLog[]; onRestart: () => void; onClose: () => void }) {
  const total = logs.length
  const counts = { correct: 0, incorrect: 0 }
  logs.forEach(l => counts[l.rating]++)
  const correct = counts.correct
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  let label = 'Keep Practicing'
  let color = '#c62828'
  if (accuracy >= 90) { label = 'Outstanding!'; color = '#1565c0' }
  else if (accuracy >= 75) { label = 'Great Work'; color = '#2e7d32' }
  else if (accuracy >= 60) { label = 'Good Progress'; color = '#b8860b' }
  else if (accuracy >= 40) { label = 'Keep Practicing'; color = '#e65100' }

  return (
    <Box sx={{ textAlign: 'center', py: { xs: 4, md: 6 }, px: 2 }}>
      <Typography sx={{
        fontFamily: "'EB Garamond', serif", fontSize: { xs: '1.8rem', md: '2.4rem' },
        fontWeight: 700, color: '#2c1a0e', mb: 0.5,
      }}>
        Practice Complete!
      </Typography>
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 1,
        px: 2.5, py: 1, borderRadius: '999px',
        background: `${color}14`, border: `1.5px solid ${color}44`, mb: 4,
      }}>
        <School sx={{ fontSize: 18, color }} />
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 700, color }}>
          {label}
        </Typography>
      </Box>

      <Typography sx={{
        fontFamily: "'EB Garamond', serif", fontSize: { xs: '2.5rem', md: '3rem' },
        fontWeight: 700, color: '#2c1a0e', mb: 0.5,
      }}>
        {accuracy}%
      </Typography>
      <Typography sx={{
        fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#9e8a7a',
        mb: 4, textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        accuracy
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, maxWidth: 400, mx: 'auto', mb: 4 }}>
        {RATING_META.map(({ value, label: l, color: c }) => {
          const count = counts[value]
          const max = Math.max(1, counts.correct + counts.incorrect)
          const pct = (count / max) * 100
          return (
            <Box key={value} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: c, width: 64, flexShrink: 0, textAlign: 'right' }}>
                {l}
              </Typography>
              <Box sx={{ flex: 1, height: 8, background: 'rgba(122,110,101,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                <Box sx={{ width: `${pct}%`, height: '100%', background: c, borderRadius: '999px', transition: 'width 0.6s ease' }} />
              </Box>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: '#2c1a0e', width: 28, flexShrink: 0, textAlign: 'left' }}>
                {count}
              </Typography>
            </Box>
          )
        })}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="contained" onClick={onRestart}
          sx={{
            background: 'linear-gradient(135deg, #b8860b 0%, #d4a843 100%)', color: '#1a0e00',
            fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '0.95rem',
            textTransform: 'none', borderRadius: '10px', px: 3, py: 1.1,
          }}
        >
          Practice Again
        </Button>
        <Button
          variant="outlined" onClick={onClose}
          sx={{
            borderColor: 'rgba(122,110,101,0.3)', color: '#7a6e65',
            fontFamily: 'Jost, sans-serif', fontWeight: 500, textTransform: 'none',
            borderRadius: '10px', px: 3, py: 1.1,
          }}
        >
          Close
        </Button>
      </Box>
    </Box>
  )
}

/* ── Main Dialog ───────────────────────────────────────── */
export default function EpisodeTestDialog({
  episode,
  open,
  onClose,
  playSegment,
}: {
  episode: EpisodeFull
  open: boolean
  onClose: () => void
  playSegment: (startSeconds: number, durationSeconds: number) => void
}) {
  const isMobile = useMediaQuery('(max-width:600px)')
  const [cards, setCards] = useState<ScriptBlock[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [logs, setLogs] = useState<CardLog[]>([])
  const [showResults, setShowResults] = useState(false)
  const textScale = 1.1
  const showDiacritics = true
  const startRef = useRef<number>(0)

  const init = useCallback(() => {
    setCards(shuffle(episode.scriptBlocks))
    setIndex(0)
    setRevealed(false)
    setLogs([])
    setShowResults(false)
    startRef.current = Date.now()
  }, [episode])

  // Initialize when dialog opens
  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const t = setTimeout(() => init(), 0)
      prevOpenRef.current = true
      return () => clearTimeout(t)
    }
    if (!open) {
      prevOpenRef.current = false
    }
  }, [open, init])

  const current = cards[index]
  const isComplete = index >= cards.length

  const handleReveal = useCallback(() => {
    setRevealed(true)
  }, [])

  const handleRate = useCallback((rating: Rating) => {
    const timeTaken = startRef.current ? (Date.now() - startRef.current) / 1000 : 0
    setLogs(prev => [...prev, { cardId: index, rating, timeTaken: Math.round(timeTaken * 10) / 10 }])
    setRevealed(false)
    setIndex(i => i + 1)
    startRef.current = Date.now()
  }, [index])

  const handlePlayAudio = useCallback(() => {
    if (!current || current.timestamp == null) return
    const originalIndex = episode.scriptBlocks.findIndex(b => b === current)
    const nextBlock = episode.scriptBlocks[originalIndex + 1]
    const duration = nextBlock?.timestamp != null
      ? nextBlock.timestamp - current.timestamp
      : 3
    playSegment(current.timestamp, Math.max(1.5, duration))
  }, [current, episode.scriptBlocks, playSegment])

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            background: '#faf7f2',
            borderRadius: isMobile ? 0 : '16px',
            m: isMobile ? 0 : 2,
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
          },
        },
        backdrop: {
          sx: {
            backdropFilter: isMobile ? 'none' : 'blur(8px)',
            backgroundColor: isMobile ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 },
        borderBottom: '1px solid rgba(184,134,11,0.15)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <School sx={{ color: '#b8860b', fontSize: 24 }} />
          <Typography sx={{
            fontFamily: "'EB Garamond', serif", fontSize: { xs: '1.1rem', md: '1.3rem' },
            fontWeight: 700, color: '#2c1a0e',
          }}>
            Test Yourself
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!showResults && (
            <Typography sx={{
              fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#9e8a7a', fontWeight: 500,
            }}>
              {Math.min(index + 1, cards.length)} / {cards.length}
            </Typography>
          )}
          <IconButton onClick={onClose} size="small" sx={{ color: '#7a6e65' }}>
            <Close sx={{ fontSize: '1.3rem' }} />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
        <AnimatePresence mode="wait">
          {showResults || isComplete ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ResultsScreen
                logs={logs}
                onRestart={init}
                onClose={onClose}
              />
            </motion.div>
          ) : current ? (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <DotBar total={cards.length} current={index} ratings={logs.map(l => l.rating)} />

              <Box sx={{
                background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px',
                padding: { xs: '1.25rem 0.875rem 0.5rem', md: '2rem 1.5rem 0.75rem' },
                minHeight: { xs: '280px', md: '320px' }, display: 'flex', flexDirection: 'column',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{
                    fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: '#b8860b',
                  }}>
                    {Math.round((index / cards.length) * 100)}%
                  </Typography>
                </Box>

                <RecallCard
                  block={current}
                  onReveal={handleReveal}
                  revealed={revealed}
                  textScale={textScale}
                  showDiacritics={showDiacritics}
                  onPlayAudio={handlePlayAudio}
                />

                {/* Rating buttons */}
                <Collapse in={revealed} timeout={{ enter: 200, exit: 0 }}>
                  <Box sx={{ mt: { xs: '1.25rem', md: '1.5rem' } }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {RATING_META.map(btn => (
                        <Button key={btn.value} variant="outlined" onClick={() => handleRate(btn.value)} startIcon={btn.icon}
                          sx={{
                            color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 600,
                            fontSize: '0.9rem', textTransform: 'none', borderRadius: '6px', py: '0.6rem',
                            border: `1.5px solid ${btn.border}`, background: 'transparent',
                            '&:hover': { background: btn.bg, borderColor: btn.color },
                          }}>
                          {btn.label}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Box>
    </Dialog>
  )
}
