'use client'

// app/flashcards/[slug]/page.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Box, Button, Container, Typography, Collapse, Fade, Grow, Slide,
} from '@mui/material'
import {
    ArrowBackSharp, ArrowForwardSharp, LockOpenSharp,
    VisibilitySharp, VisibilityOffSharp,
} from '@mui/icons-material'
import Navbar from '@/app/components/navbar'
import { useVocabStore, type Vocab } from '@/store/vocabStore'

/* ─────────────────────────────────────────────
   CSS
───────────────────────────────────────────── */
const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Jost:wght@300;400;500;600&display=swap');

  :root {
    --sand:   #f5ede0;
    --cream:  #faf7f2;
    --bark:   #2c1a0e;
    --forest: #0e2e1f;
    --gold:   #b8860b;
    --gold-lt:#d4a843;
    --muted:  #7a6e65;
  }

  html, body { background: var(--cream); margin: 0; }

  /* ── day grid cards ── */
  .day-card {
    border: 1px solid rgba(184,134,11,0.18);
    border-radius: 6px;
    background: #fff;
    padding: 0.75rem 0.5rem;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .day-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(184,134,11,0.04) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .day-card:hover {
    border-color: rgba(184,134,11,0.45);
    box-shadow: 0 4px 20px rgba(184,134,11,0.1);
    transform: translateY(-2px);
  }
  .day-card:hover::before { opacity: 1; }
  .day-card.active {
    border-color: var(--gold);
    box-shadow: 0 0 0 2px rgba(184,134,11,0.15);
  }

  /* ── mobile day selector collapse ── */
  .day-selector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
  }
  .day-selector-chevron {
    transition: transform 0.25s ease;
    color: var(--gold);
  }
  .day-selector-chevron.expanded {
    transform: rotate(180deg);
  }

  /* ── flashcard shell ── */
  .fc-shell {
    background: #fff;
    border: 1px solid rgba(184,134,11,0.2);
    border-radius: 10px;
    padding: 2rem 1.5rem 1.75rem;
    transition: border-color 0.2s;
    min-height: 320px;
    display: flex;
    flex-direction: column;
  }
  @media (max-width: 600px) {
    .fc-shell {
      padding: 1.5rem 1rem 1.5rem;
      min-height: 280px;
    }
  }

  /* ── progress bar ── */
  .fc-progress-bg {
    height: 2px;
    background: rgba(184,134,11,0.1);
    border-radius: 999px;
    margin-bottom: 1.25rem;
    overflow: hidden;
  }
  .fc-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--gold), var(--gold-lt));
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  /* ── badges ── */
  .fc-level-badge {
    display: inline-flex; align-items: center;
    font-family: 'Jost', sans-serif;
    font-size: 10px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px;
  }
  .fc-badge-A0 { background: rgba(14,46,31,0.08); color: var(--forest); }
  .fc-badge-A1 { background: rgba(184,134,11,0.1); color: var(--gold); }
  .fc-badge-A2 { background: rgba(44,26,14,0.08); color: var(--bark); }

  .fc-type-badge {
    display: inline-flex; align-items: center;
    font-family: 'Jost', sans-serif;
    font-size: 10px; font-weight: 500;
    letter-spacing: 0.06em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px;
    background: rgba(122,110,101,0.08); color: var(--muted);
    margin-left: 6px;
  }

  /* ── arabic text ── */
  .fc-arabic-wrapper {
    position: relative;
    text-align: center;
    margin: 0.5rem 0 1.5rem;
    height: clamp(3.5rem, 10vw, 7rem);
  }
  @media (max-width: 600px) {
    .fc-arabic-wrapper {
      margin: 0.5rem 0 1rem;
      height: clamp(3rem, 12vw, 4rem);
    }
  }
  .fc-arabic {
    font-family: 'EB Garamond', serif;
    font-size: clamp(3rem, 10vw, 5.5rem);
    font-weight: 700;
    direction: rtl; text-align: center;
    color: var(--bark); line-height: 1.2;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }
  @media (max-width: 600px) {
    .fc-arabic {
      font-size: clamp(2.2rem, 12vw, 3.5rem);
    }
  }

  /* ── revealed section ── */
  .fc-divider {
    border: none; border-top: 1px solid rgba(184,134,11,0.1);
    margin: 1rem 0 1rem;
  }
  @media (min-width: 900px) {
    .fc-divider {
      margin: 1.5rem 0 1.25rem;
    }
  }
  .fc-transliteration {
    font-family: 'Jost', sans-serif; 
    font-size: clamp(1rem, 2vw, 1.35rem);
    font-style: italic; color: var(--gold);
    text-align: center; letter-spacing: 0.05em;
  }
  @media (max-width: 600px) {
    .fc-transliteration {
      font-size: clamp(0.85rem, 3vw, 1rem);
    }
  }
  .fc-definition {
    font-family: 'EB Garamond', serif;
    font-size: clamp(1.6rem, 4vw, 2.6rem);
    font-weight: 700; color: var(--bark);
    text-align: center; margin: 0.25rem 0;
  }
  @media (max-width: 600px) {
    .fc-definition {
      font-size: clamp(1.3rem, 5vw, 1.8rem);
    }
  }
  .fc-root {
    font-family: 'Jost', sans-serif; 
    font-size: clamp(0.85rem, 1.5vw, 1.1rem);
    color: var(--muted); text-align: center;
    direction: rtl; opacity: 0.75;
    margin-bottom: 0.5rem;
    letter-spacing: 0.04em;
  }
  @media (max-width: 600px) {
    .fc-root {
      font-size: clamp(0.75rem, 2.5vw, 0.9rem);
    }
  }

  /* ── grade buttons ── */
  .fc-btn-row {
    display: grid; grid-template-columns: repeat(4,1fr);
    gap: 8px; margin-top: 1.25rem;
  }
  @media (min-width: 900px) {
    .fc-btn-row {
      gap: 12px;
      margin-top: 1.5rem;
    }
  }
  @media (max-width: 600px) {
    .fc-btn-row {
      gap: 4px;
      margin-top: 0.875rem;
    }
  }
  .fc-grade-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 0.75rem 0.5rem;
    border-radius: 6px; border: 1px solid;
    background: transparent;
    font-family: 'Jost', sans-serif;
    font-size: clamp(0.8rem, 1.5vw, 1rem); 
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  @media (max-width: 600px) {
    .fc-grade-btn {
      font-size: 0.7rem;
      padding: 0.4rem 0.15rem;
      gap: 2px;
    }
  }
  @media (min-width: 900px) {
    .fc-grade-btn {
      padding: 1rem 0.75rem;
    }
  }
  .fc-grade-btn:active { transform: scale(0.97); }
  .fc-btn-again { border-color: #c62828; color: #c62828; }
  .fc-btn-again:hover { background: rgba(198,40,40,0.06); }
  .fc-btn-hard  { border-color: #e65100; color: #e65100; }
  .fc-btn-hard:hover  { background: rgba(230,81,0,0.06); }
  .fc-btn-good  { border-color: #2e7d32; color: #2e7d32; }
  .fc-btn-good:hover  { background: rgba(46,125,50,0.06); }
  .fc-btn-easy  { border-color: #1565c0; color: #1565c0; }
  .fc-btn-easy:hover  { background: rgba(21,101,192,0.06); }

  .fc-show-btn {
    width: 100%; 
    padding: 0.875rem;
    background: transparent;
    border: 1px solid rgba(184,134,11,0.3);
    border-radius: 6px; color: var(--bark);
    font-family: 'Jost', sans-serif;
    font-size: clamp(0.9rem, 1.5vw, 1.1rem); 
    font-weight: 500;
    letter-spacing: 0.04em; cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.2s;
  }
  @media (min-width: 900px) {
    .fc-show-btn {
      padding: 1.25rem;
    }
  }
  @media (max-width: 600px) {
    .fc-show-btn {
      padding: 0.75rem;
      font-size: 0.85rem;
    }
  }
  .fc-show-btn:hover {
    background: rgba(184,134,11,0.05);
    border-color: rgba(184,134,11,0.5);
    transform: translateY(-1px);
  }

  /* ── done state ── */
  .fc-done-circle {
    width: 72px; height: 72px; border-radius: 50%;
    border: 2px solid rgba(14,46,31,0.2);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.25rem; color: var(--forest); font-size: 2rem;
  }
  @media (max-width: 600px) {
    .fc-done-circle {
      width: 56px; height: 56px;
      font-size: 1.5rem;
    }
  }

  /* ── skeleton ── */
  .fc-skeleton {
    background: linear-gradient(90deg,rgba(184,134,11,0.06) 25%,rgba(184,134,11,0.12) 50%,rgba(184,134,11,0.06) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }
  @keyframes shimmer { to { background-position: -200% 0; } }

  /* ── stat pills ── */
  .fc-stat-pill {
    font-family: 'Jost', sans-serif; 
    font-size: clamp(11px, 1.2vw, 14px); 
    font-weight: 500;
    padding: 4px 12px; border-radius: 999px;
    border: 1px solid rgba(122,110,101,0.2); color: var(--muted);
  }
  .fc-stat-pill.again  { border-color: rgba(198,40,40,0.2);  color: #c62828; }
  .fc-stat-pill.done   { border-color: rgba(46,125,50,0.2);   color: #2e7d32; }
`

/* ─────────────────────────────────────────────
   SM-2 types & helpers
───────────────────────────────────────────── */
type CardState = Vocab & {
    interval: number
    easeFactor: number
    repetitions: number
    due: number
}

function initCard(v: Vocab): CardState {
    return { ...v, interval: 0, easeFactor: 2.5, repetitions: 0, due: 0 }
}

function applyGrade(c: CardState, g: 0 | 1 | 2 | 3): CardState {
    const efDeltas = [-0.8, -0.15, 0, 0.15]
    return {
        ...c,
        easeFactor: Math.max(1.3, c.easeFactor + efDeltas[g]),
        repetitions: g === 0 ? 0 : c.repetitions + 1,
        due: Date.now() + (g === 0 ? 60000 : g === 1 ? 300000 : g === 2 ? 600000 : 86400000),
    }
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const WORDS_PER_DAY = 20

const LEVEL_MAP: Record<string, string[]> = {
    beginner: ['A0'],
    elementary: ['A1'],
    intermediate: ['A2'],
    'upper-intermediate': ['B1'],
}

const SLUG_LABELS: Record<string, string> = {
    beginner: 'Beginner',
    elementary: 'Elementary',
    intermediate: 'Intermediate',
    'upper-intermediate': 'Upper Intermediate',
}

/* ─────────────────────────────────────────────
   Animated Arabic Word Component (MUI Fade)
───────────────────────────────────────────── */
function AnimatedArabicWord({ 
    word, 
    wordDiacritic, 
    showDiacritics 
}: { 
    word: string
    wordDiacritic: string
    showDiacritics: boolean 
}) {
    return (
        <Box className="fc-arabic-wrapper">
            <Fade in={!showDiacritics} timeout={300} unmountOnExit>
                <Box className="fc-arabic">
                    {word}
                </Box>
            </Fade>
            <Fade in={showDiacritics} timeout={300} unmountOnExit>
                <Box className="fc-arabic" sx={{ color: 'var(--forest)' }}>
                    {wordDiacritic}
                </Box>
            </Fade>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Flashcard quiz component
───────────────────────────────────────────── */
function FlashcardQuiz({
    words,
    showDiacritics,
    onComplete,
}: {
    words: Vocab[]
    showDiacritics: boolean
    onComplete: () => void
}) {
    const [queue, setQueue] = useState<CardState[]>(() => words.map(initCard))
    const [current, setCurrent] = useState<CardState | null>(() => words.length ? initCard(words[0]) : null)
    const [revealed, setRevealed] = useState(false)
    const [doneCount, setDoneCount] = useState(0)
    const [isDone, setIsDone] = useState(false)
    const [cardKey, setCardKey] = useState(0)

    useEffect(() => {
        const deck = words.map(initCard)
        setQueue(deck.slice(1))
        setCurrent(deck[0] ?? null)
        setRevealed(false)
        setDoneCount(0)
        setIsDone(false)
        setCardKey(k => k + 1)
    }, [words])

    const grade = useCallback((g: 0 | 1 | 2 | 3) => {
        if (!current) return
        const graded = applyGrade(current, g)

        setQueue(prev => {
            const next = [...prev]
            if (g === 0) next.splice(Math.min(4, next.length), 0, graded)

            if (next.length === 0) {
                setIsDone(true)
                setCurrent(null)
                if (g > 0) setDoneCount(d => d + 1)
                return []
            }

            const [nextCard, ...rest] = next
            setCurrent(nextCard)
            setRevealed(false)
            setCardKey(k => k + 1)
            if (g > 0) setDoneCount(d => d + 1)
            return rest
        })
    }, [current])

    const progressPct = isDone ? 100 : Math.round((doneCount / words.length) * 100)
    const dueCount = queue.filter(c => c.repetitions > 0 && c.due <= Date.now()).length
    const newCount = current ? queue.filter(c => c.repetitions === 0).length + 1 : 0

    if (isDone) return (
        <Grow in={true} timeout={500}>
            <Box className="fc-shell" sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <Box className="fc-done-circle">✓</Box>
                    <Typography sx={{ 
                        fontFamily: '"EB Garamond", serif', 
                        fontSize: { xs: '1.6rem', sm: '2rem', md: '2.5rem' }, 
                        fontWeight: 700, 
                        color: 'var(--bark)', 
                        mb: 0.75 
                    }}>
                        Day complete!
                    </Typography>
                    <Typography sx={{ 
                        fontFamily: 'Jost, sans-serif', 
                        fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.1rem' }, 
                        color: 'var(--muted)', 
                        mb: 3.5, 
                        lineHeight: 1.7, 
                        px: 2 
                    }}>
                        You reviewed all {words.length} words for this session.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined" 
                            size="small"
                            onClick={() => {
                                const deck = words.map(initCard)
                                setQueue(deck.slice(1))
                                setCurrent(deck[0] ?? null)
                                setRevealed(false)
                                setDoneCount(0)
                                setIsDone(false)
                                setCardKey(k => k + 1)
                            }}
                            sx={{
                                borderColor: 'rgba(184,134,11,0.35)', 
                                color: 'var(--bark)',
                                fontFamily: 'Jost, sans-serif', 
                                fontWeight: 500,
                                fontSize: { xs: '0.75rem', sm: '0.85rem', md: '1rem' }, 
                                textTransform: 'none', 
                                borderRadius: '6px',
                                px: { xs: 2, sm: 2.5, md: 3 },
                                py: { md: 1 },
                                '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: 'var(--gold)' },
                            }}
                        >
                            Restart day
                        </Button>
                        <Button
                            variant="contained" 
                            size="small"
                            onClick={onComplete}
                            endIcon={<ArrowForwardSharp sx={{ fontSize: { xs: 16, md: 20 } }} />}
                            sx={{
                                background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-lt) 100%)',
                                color: 'var(--bark)',
                                fontFamily: 'Jost, sans-serif', 
                                fontWeight: 600,
                                fontSize: { xs: '0.75rem', sm: '0.85rem', md: '1rem' }, 
                                textTransform: 'none', 
                                borderRadius: '6px',
                                px: { xs: 2, sm: 2.5, md: 3 }, 
                                py: { md: 1 },
                                boxShadow: '0 4px 16px rgba(184,134,11,0.3)',
                                '&:hover': { background: 'var(--gold-lt)' },
                            }}
                        >
                            Next day
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Grow>
    )

    if (!current) return null

    return (
        <Fade in={true} key={cardKey} timeout={400}>
            <Box className="fc-shell">
                <Box className="fc-progress-bg">
                    <Box className="fc-progress-fill" sx={{ width: `${progressPct}%` }} />
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, mb: { xs: 1.5, sm: 2, md: 3 }, flexWrap: 'wrap' }}>
                    <span className="fc-stat-pill">{newCount} new</span>
                    <span className={`fc-stat-pill${dueCount > 0 ? ' again' : ''}`}>{dueCount} due</span>
                    <span className={`fc-stat-pill${doneCount > 0 ? ' done' : ''}`}>{doneCount} done</span>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ textAlign: 'center', mb: { xs: 0.5, md: 1 } }}>
                        <span className={`fc-level-badge fc-badge-${current.level}`}>{current.level}</span>
                    </Box>

                    <AnimatedArabicWord 
                        word={current.word}
                        wordDiacritic={current.word_diacritic}
                        showDiacritics={showDiacritics}
                    />

                    <Collapse in={revealed} timeout={300}>
                        <hr className="fc-divider" />
                        <Box sx={{ textAlign: 'center', mb: { xs: 0.5, md: 1 } }}>
                            <span className="fc-type-badge">{current.type}</span>
                        </Box>
                        <Box className="fc-transliteration" sx={{ mt: { xs: 1, md: 1.5 } }}>
                            {current.transliteration}
                        </Box>
                        <Box className="fc-definition">{current.definition}</Box>
                        {current.root && current.root !== '-' && (
                            <Box className="fc-root">root · {current.root}</Box>
                        )}

                        <Box className="fc-btn-row">
                            {[
                                { label: 'Again', cls: 'fc-btn-again', g: 0 },
                                { label: 'Hard', cls: 'fc-btn-hard', g: 1 },
                                { label: 'Good', cls: 'fc-btn-good', g: 2 },
                                { label: 'Easy', cls: 'fc-btn-easy', g: 3 },
                            ].map(({ label, cls, g }) => (
                                <button key={label} className={`fc-grade-btn ${cls}`} onClick={() => grade(g as 0 | 1 | 2 | 3)}>
                                    {label}
                                </button>
                            ))}
                        </Box>
                    </Collapse>

                    {!revealed && (
                        <Box sx={{ mt: { xs: 2, sm: 3, md: 4 }, width: '100%', marginTop: 'auto' }}>
                            <button
                                className="fc-show-btn"
                                style={{ width: '100%' }}
                                onClick={() => setRevealed(true)}
                            >
                                Show answer
                            </button>
                        </Box>
                    )}
                </Box>
            </Box>
        </Fade>
    )
}

/* ─────────────────────────────────────────────
   Day selector (collapsible on mobile)
───────────────────────────────────────────── */
function DaySelector({
    totalDays,
    selectedDay,
    onSelect,
}: {
    totalDays: number
    selectedDay: number
    onSelect: (d: number) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 900)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const dayGrid = (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(5, 1fr)', sm: 'repeat(6, 1fr)', lg: 'repeat(5, 1fr)' },
                gap: { xs: 1, sm: 1.5, md: 2 },
            }}
        >
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                <Box
                    key={day}
                    sx={{ width: '100%' }}
                >
                    <Box
                        className={`day-card${selectedDay === day ? ' active' : ''}`}
                        onClick={() => onSelect(day)}
                        sx={{ 
                            width: '100%', 
                            boxSizing: 'border-box',
                            transition: 'transform 0.15s, box-shadow 0.2s',
                            '&:hover': { transform: 'scale(1.04)' },
                            '&:active': { transform: 'scale(0.97)' },
                        }}
                    >
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' }, 
                            fontWeight: 600,
                            letterSpacing: '0.1em', 
                            textTransform: 'uppercase',
                            color: 'var(--muted)', 
                            mb: 0.25,
                        }}>
                            Day
                        </Typography>
                        <Typography sx={{
                            fontFamily: '"EB Garamond", serif',
                            fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.6rem' }, 
                            fontWeight: 700,
                            color: selectedDay === day ? 'var(--gold)' : 'var(--bark)',
                            lineHeight: 1,
                        }}>
                            {day}
                        </Typography>
                    </Box>
                </Box>
            ))}
        </Box>
    )

    if (!isMobile) {
        return (
            <Box>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: { xs: '0.65rem', sm: '0.68rem', md: '0.8rem' }, 
                    fontWeight: 600,
                    letterSpacing: '0.16em', 
                    textTransform: 'uppercase',
                    color: 'var(--gold)', 
                    mb: { xs: 1.5, sm: 2, md: 2.5 },
                }}>
                    Choose a Day
                </Typography>
                {dayGrid}
            </Box>
        )
    }

    return (
        <Box>
            <Box 
                className="day-selector-header"
                onClick={() => setExpanded(!expanded)}
                sx={{ mb: expanded ? 1.5 : 0 }}
            >
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.65rem', 
                    fontWeight: 600,
                    letterSpacing: '0.16em', 
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                }}>
                    Choose a Day
                </Typography>
                <Box 
                    className={`day-selector-chevron ${expanded ? 'expanded' : ''}`}
                    sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </Box>
            </Box>
            <Collapse in={expanded} timeout={250}>
                {dayGrid}
            </Collapse>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function FlashcardSlugPage() {
    const params = useParams()
    const router = useRouter()
    const slug = (params?.slug as string) ?? 'beginner'

    const storeVocab = useVocabStore(s => s.vocab)
    const isLoading = useVocabStore(s => s.isLoading)
    const fetchVocab = useVocabStore(s => s.fetch)

    const [selectedDay, setSelectedDay] = useState(1)
    const [showDiacritics, setShowDiacritics] = useState(true)
    const [quizKey, setQuizKey] = useState(0)

    useEffect(() => { fetchVocab() }, [fetchVocab])

    const levels = LEVEL_MAP[slug] ?? ['A0']
    const label = SLUG_LABELS[slug] ?? slug

    const filteredVocab = useMemo(
        () => storeVocab.filter(v => levels.includes(v.level)).sort((a, b) => a.id - b.id),
        [storeVocab, slug]
    )

    const totalDays = Math.ceil(filteredVocab.length / WORDS_PER_DAY) || 1

    const dayWords = useMemo(() => {
        const start = (selectedDay - 1) * WORDS_PER_DAY
        return filteredVocab.slice(start, start + WORDS_PER_DAY)
    }, [filteredVocab, selectedDay])

    const handleDaySelect = (day: number) => {
        setSelectedDay(day)
        setQuizKey(k => k + 1)
    }

    const handleNextDay = () => {
        if (selectedDay < totalDays) handleDaySelect(selectedDay + 1)
    }

    return (
        <>
            <style>{PAGE_CSS}</style>
            <Navbar />

            <Box
                component="main"
                sx={{ background: 'var(--cream)', minHeight: '100vh' }}
            >
                <Box sx={{
                    background: 'linear-gradient(135deg, var(--forest) 0%, #071a0f 100%)',
                    pt: { xs: 10, sm: 12, md: 14 },
                    pb: { xs: 4, md: 6 },
                    position: 'relative', 
                    overflow: 'hidden',
                }}>
                    <Typography aria-hidden="true" sx={{
                        position: 'absolute', 
                        top: -30, 
                        right: -10,
                        fontFamily: '"EB Garamond", serif', 
                        fontStyle: 'italic',
                        fontSize: { xs: '8rem', sm: '10rem', md: '14rem' }, 
                        color: 'rgba(255,255,255,0.03)', 
                        userSelect: 'none',
                        lineHeight: 1,
                    }}>
                        أ
                    </Typography>
                    <Container maxWidth="xl">
                        <Box
                            onClick={() => router.push('/learn')}
                            sx={{
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: 0.75,
                                fontFamily: 'Jost, sans-serif', 
                                fontSize: { xs: '0.7rem', sm: '0.78rem', md: '0.9rem' },
                                color: 'rgba(245,237,224,0.45)', 
                                cursor: 'pointer', 
                                mb: { xs: 1.5, sm: 2 },
                                '&:hover': { color: 'var(--gold-lt)' },
                                transition: 'color 0.2s',
                            }}
                        >
                            <ArrowBackSharp sx={{ fontSize: { xs: 12, sm: 14, md: 16 } }} />
                            Back to Learn
                        </Box>

                        <Typography sx={{
                            fontFamily: '"EB Garamond", serif',
                            fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3.5rem' },
                            fontWeight: 700, 
                            color: 'var(--sand)', 
                            lineHeight: 1.1, 
                            mb: 1,
                        }}>
                            {label} Flashcards
                        </Typography>
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1.1rem' }, 
                            color: 'rgba(245,237,224,0.55)',
                            lineHeight: 1.7, 
                            maxWidth: 500,
                        }}>
                            {filteredVocab.length} words split across {totalDays} days · {WORDS_PER_DAY} words per session
                        </Typography>
                    </Container>
                </Box>

                <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4, md: 6 } }}>

                    <Box sx={{
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between', 
                        flexWrap: 'wrap',
                        gap: 2, 
                        mb: { xs: 2, sm: 3, md: 4 },
                    }}>
                        <Typography sx={{
                            fontFamily: '"EB Garamond", serif',
                            fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' }, 
                            fontWeight: 700, 
                            color: 'var(--bark)',
                        }}>
                            Day {selectedDay}
                            <Typography component="span" sx={{
                                fontFamily: 'Jost, sans-serif', 
                                fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' },
                                color: 'var(--muted)', 
                                ml: 1.5, 
                                fontWeight: 400,
                            }}>
                                words {(selectedDay - 1) * WORDS_PER_DAY + 1}–{Math.min(selectedDay * WORDS_PER_DAY, filteredVocab.length)}
                            </Typography>
                        </Typography>

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={showDiacritics ? <VisibilityOffSharp sx={{ fontSize: { xs: 16, md: 20 } }} /> : <VisibilitySharp sx={{ fontSize: { xs: 16, md: 20 } }} />}
                            onClick={() => setShowDiacritics(p => !p)}
                            sx={{
                                borderColor: 'rgba(184,134,11,0.3)',
                                color: showDiacritics ? 'var(--gold)' : 'var(--muted)',
                                fontFamily: 'Jost, sans-serif', 
                                fontWeight: 500,
                                fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.95rem' }, 
                                textTransform: 'none', 
                                borderRadius: '6px',
                                px: { xs: 1.5, md: 2 },
                                py: { md: 0.5 },
                                '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: 'var(--gold)' },
                            }}
                        >
                            {showDiacritics ? 'Hide diacritics' : 'Show diacritics'}
                        </Button>
                    </Box>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '1fr 340px', xl: '1fr 420px' },
                        gap: { xs: 3, sm: 4, md: 6 },
                        alignItems: 'start',
                    }}>
                        <Box>
                            {isLoading ? (
                                <Box className="fc-shell" sx={{ gap: 2 }}>
                                    <Box className="fc-skeleton" sx={{ height: 2, width: '100%', mb: 2 }} />
                                    <Box className="fc-skeleton" sx={{ height: 20, width: 80, mx: 'auto' }} />
                                    <Box className="fc-skeleton" sx={{ height: 88, width: '55%', mx: 'auto', mt: 1 }} />
                                    <Box className="fc-skeleton" sx={{ height: 32, width: '30%', mx: 'auto' }} />
                                    <Box className="fc-skeleton" sx={{ height: 44, width: '100%', mt: 'auto' }} />
                                </Box>
                            ) : dayWords.length === 0 ? (
                                <Box className="fc-shell" sx={{ alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ 
                                        fontFamily: 'Jost, sans-serif', 
                                        color: 'var(--muted)', 
                                        fontSize: { xs: '0.85rem', sm: '0.9rem', md: '1.1rem' } 
                                    }}>
                                        No words found for this level.
                                    </Typography>
                                </Box>
                            ) : (
                                <FlashcardQuiz
                                    key={quizKey}
                                    words={dayWords}
                                    showDiacritics={showDiacritics}
                                    onComplete={handleNextDay}
                                />
                            )}
                        </Box>

                        <Box sx={{
                            background: '#fff',
                            border: '1px solid rgba(184,134,11,0.15)',
                            borderRadius: '8px',
                            p: { xs: 2, sm: 2.5, md: 3 },
                            width: '100%',
                            boxSizing: 'border-box',
                        }}>
                            <DaySelector
                                totalDays={totalDays}
                                selectedDay={selectedDay}
                                onSelect={handleDaySelect}
                            />
                            <Box sx={{
                                mt: { xs: 2, sm: 2.5, md: 3 }, 
                                pt: { xs: 1.5, sm: 2 },
                                borderTop: '1px solid rgba(184,134,11,0.1)',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                            }}>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif', 
                                    fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.9rem' }, 
                                    color: 'var(--muted)',
                                }}>
                                    {filteredVocab.length} total words
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif', 
                                    fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.9rem' }, 
                                    color: 'var(--muted)',
                                }}>
                                    {WORDS_PER_DAY} per day
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                </Container>
            </Box>
        </>
    )
}