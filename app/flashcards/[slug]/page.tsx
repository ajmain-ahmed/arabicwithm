'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Box, Button, Container, Typography, Collapse, Fade, Grow,
    Card, CardContent, CardMedia, CardActionArea, LinearProgress,
    CircularProgress,
} from '@mui/material'
import {
    ArrowBackSharp, ArrowForwardSharp, SkipNextSharp,
    BookmarkAddSharp, CheckCircleSharp, ArrowBackIosSharp,
    VisibilityOffSharp,
    VisibilitySharp,
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

  /* ── example sentences ── */
  .fc-examples {
    background: rgba(245,237,224,0.5);
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    border-left: 3px solid var(--gold);
  }
  @media (max-width: 600px) {
    .fc-examples {
      padding: 0.75rem;
      margin: 0.75rem 0;
    }
  }
  .fc-example-item {
    font-family: 'EB Garamond', serif;
    font-size: clamp(0.9rem, 2vw, 1.1rem);
    color: var(--bark);
    direction: rtl;
    text-align: right;
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }
  .fc-example-translation {
    font-family: 'Jost', sans-serif;
    font-size: clamp(0.75rem, 1.5vw, 0.9rem);
    color: var(--muted);
    font-style: italic;
    margin-bottom: 0.75rem;
  }
  .fc-example-item:last-child {
    margin-bottom: 0;
  }

  /* ── new action buttons ── */
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
  .fc-action-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 0.75rem 0.5rem;
    border-radius: 6px; border: 1px solid;
    background: transparent;
    font-family: 'Jost', sans-serif;
    font-size: clamp(0.75rem, 1.5vw, 0.9rem); 
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, border-color 0.15s;
  }
  @media (max-width: 600px) {
    .fc-action-btn {
      font-size: 0.65rem;
      padding: 0.5rem 0.25rem;
      gap: 2px;
    }
    .fc-action-btn svg {
      font-size: 1rem !important;
    }
  }
  @media (min-width: 900px) {
    .fc-action-btn {
      padding: 1rem 0.75rem;
    }
  }
  .fc-action-btn:active { transform: scale(0.97); }
  
  .fc-btn-back { border-color: var(--muted); color: var(--muted); }
  .fc-btn-back:hover { background: rgba(122,110,101,0.08); }
  
  .fc-btn-skip { border-color: #ff9800; color: #ff9800; }
  .fc-btn-skip:hover { background: rgba(255,152,0,0.08); }
  
  .fc-btn-revision { border-color: #1565c0; color: #1565c0; }
  .fc-btn-revision:hover { background: rgba(21,101,192,0.08); }
  
  .fc-btn-complete { border-color: #2e7d32; color: #2e7d32; }
  .fc-btn-complete:hover { background: rgba(46,125,50,0.08); }

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
  .fc-stat-pill.revision { border-color: rgba(21,101,192,0.2); color: #1565c0; }
  .fc-stat-pill.done   { border-color: rgba(46,125,50,0.2);   color: #2e7d32; }

  /* ── theme cards ── */
  .theme-card {
    border: 1px solid rgba(184,134,11,0.15);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .theme-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 30px rgba(44,26,14,0.08);
  }
  .theme-card.active {
    border-color: var(--gold);
    box-shadow: 0 0 0 2px rgba(184,134,11,0.12);
  }
`

/* ─────────────────────────────────────────────
   Types & Interfaces
───────────────────────────────────────────── */

// Extended Vocab with example fields from your DB schema
type VocabWithExamples = Vocab & {
    ex_ar: string | null
    ex_di: string | null
    ex_en: string | null
}

type CardState = VocabWithExamples & {
    interval: number
    easeFactor: number
    repetitions: number
    due: number
    status: 'new' | 'learning' | 'review' | 'complete'
}

type ExampleItem = {
    arabic: string
    diacritic: string
    english: string
}

/* ─────────────────────────────────────────────
   Card State Helpers
───────────────────────────────────────────── */
function initCard(v: VocabWithExamples): CardState {
    return {
        ...v,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        due: 0,
        status: 'new'
    }
}

function parseExamples(card: CardState): ExampleItem[] {
    if (!card.ex_ar || !card.ex_en) return []

    const ar = card.ex_ar.split(';').map(s => s.trim())
    const di = card.ex_di ? card.ex_di.split(';').map(s => s.trim()) : ar
    const en = card.ex_en.split(';').map(s => s.trim())

    const count = Math.min(ar.length, en.length)
    const items: ExampleItem[] = []

    for (let i = 0; i < count; i++) {
        items.push({
            arabic: ar[i] || '',
            diacritic: di[i] || ar[i] || '',
            english: en[i] || '',
        })
    }

    return items
}

/* ─────────────────────────────────────────────
   Example Sentences (from DB fields)
───────────────────────────────────────────── */
function ExampleSentences({
    card,
    revealed,
    showDiacritics,
}: {
    card: CardState
    revealed: boolean
    showDiacritics: boolean
}) {
    const examples = useMemo(() => parseExamples(card), [card])

    if (!revealed || examples.length === 0) return null

    return (
        <Collapse in={revealed} timeout={300}>
            <Box className="fc-examples">
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    mb: 1,
                }}>
                    Example Sentences
                </Typography>

                {examples.map((ex, idx) => (
                    <Box key={idx} sx={{ mb: idx < examples.length - 1 ? 1.5 : 0 }}>
                        <Box className="fc-example-item">
                            {showDiacritics ? ex.diacritic : ex.arabic}
                        </Box>
                        <Box className="fc-example-translation">
                            {ex.english}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Collapse>
    )
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
    themeLabel,
}: {
    words: VocabWithExamples[]
    showDiacritics: boolean
    onComplete: () => void
    themeLabel: string
}) {
    const [queue, setQueue] = useState<CardState[]>(() => words.map(initCard))
    const [current, setCurrent] = useState<CardState | null>(() => words.length ? initCard(words[0]) : null)
    const [revealed, setRevealed] = useState(false)
    const [doneCount, setDoneCount] = useState(0)
    const [isDone, setIsDone] = useState(false)
    const [cardKey, setCardKey] = useState(0)
    const [revisionCount, setRevisionCount] = useState(0)

    useEffect(() => {
        const deck = words.map(initCard)
        setQueue(deck.slice(1))
        setCurrent(deck[0] ?? null)
        setRevealed(false)
        setDoneCount(0)
        setIsDone(false)
        setRevisionCount(0)
        setCardKey(k => k + 1)
    }, [words])

    // Action handlers
    const handleBack = useCallback(() => {
        onComplete()
    }, [onComplete])

    const handleSkip = useCallback(() => {
        if (!current) return
        setQueue(prev => {
            const next = [...prev, { ...current, status: 'learning' as const }]
            if (next.length === 0) {
                setIsDone(true)
                setCurrent(null)
                return []
            }
            const [nextCard, ...rest] = next
            setCurrent(nextCard)
            setRevealed(false)
            setCardKey(k => k + 1)
            return rest
        })
    }, [current])

    const handleAddToRevision = useCallback(() => {
        if (!current) return
        setRevisionCount(c => c + 1)
        setQueue(prev => {
            const insertIndex = Math.min(3, prev.length)
            const next = [...prev]
            next.splice(insertIndex, 0, { ...current, status: 'review' as const })

            if (next.length === 0) {
                setIsDone(true)
                setCurrent(null)
                return []
            }
            const [nextCard, ...rest] = next
            setCurrent(nextCard)
            setRevealed(false)
            setCardKey(k => k + 1)
            return rest
        })
    }, [current])

    const handleComplete = useCallback(() => {
        if (!current) return
        setDoneCount(d => d + 1)
        setQueue(prev => {
            const next = prev.filter(c => c.id !== current.id)
            if (next.length === 0) {
                setIsDone(true)
                setCurrent(null)
                return []
            }
            const [nextCard, ...rest] = next
            setCurrent(nextCard)
            setRevealed(false)
            setCardKey(k => k + 1)
            return rest
        })
    }, [current])

    const progressPct = isDone ? 100 : Math.round((doneCount / words.length) * 100)
    const newCount = current ? queue.filter(c => c.status === 'new').length + 1 : 0
    const reviewCount = queue.filter(c => c.status === 'review').length

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
                        {themeLabel} complete!
                    </Typography>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.1rem' },
                        color: 'var(--muted)',
                        mb: 3.5,
                        lineHeight: 1.7,
                        px: 2
                    }}>
                        You reviewed all {words.length} words in this theme.
                        {revisionCount > 0 && (
                            <Box component="span" sx={{ display: 'block', mt: 1, color: '#1565c0' }}>
                                {revisionCount} words added to revision list
                            </Box>
                        )}
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
                                setRevisionCount(0)
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
                            Restart theme
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
                            Back to themes
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
                    <span className={`fc-stat-pill${reviewCount > 0 ? ' revision' : ''}`}>{reviewCount} revision</span>
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

                        {/* Example Sentences from DB */}
                        <ExampleSentences
                            card={current}
                            revealed={revealed}
                            showDiacritics={showDiacritics}
                        />

                        {/* New Action Buttons */}
                        <Box className="fc-btn-row">
                            <button
                                className="fc-action-btn fc-btn-back"
                                onClick={handleBack}
                                title="Back to themes"
                            >
                                <ArrowBackIosSharp sx={{ fontSize: { xs: 18, md: 22 } }} />
                                Back
                            </button>
                            <button
                                className="fc-action-btn fc-btn-skip"
                                onClick={handleSkip}
                                title="Skip to later"
                            >
                                <SkipNextSharp sx={{ fontSize: { xs: 18, md: 22 } }} />
                                Skip
                            </button>
                            <button
                                className="fc-action-btn fc-btn-revision"
                                onClick={handleAddToRevision}
                                title="Add to revision list"
                            >
                                <BookmarkAddSharp sx={{ fontSize: { xs: 18, md: 22 } }} />
                                Revision
                            </button>
                            <button
                                className="fc-action-btn fc-btn-complete"
                                onClick={handleComplete}
                                title="Mark as complete"
                            >
                                <CheckCircleSharp sx={{ fontSize: { xs: 18, md: 22 } }} />
                                Complete
                            </button>
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
   Theme Card Component
───────────────────────────────────────────── */
function ThemeCard({
    theme,
    wordCount,
    progress,
    isActive,
    onClick,
}: {
    theme: string
    wordCount: number
    progress: number
    isActive: boolean
    onClick: () => void
}) {
    return (
        <Card
            className={`theme-card${isActive ? ' active' : ''}`}
            sx={{
                maxWidth: 345,
                width: '100%',
                background: '#fff',
            }}
        >
            <CardActionArea onClick={onClick}>
                <CardMedia
                    component="img"
                    height="140"
                    image="/awm1.png"
                    alt={theme}
                    sx={{
                        objectFit: 'cover',
                        borderBottom: '1px solid rgba(184,134,11,0.1)',
                    }}
                />
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                    <Typography
                        gutterBottom
                        sx={{
                            fontFamily: '"EB Garamond", serif',
                            fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.4rem' },
                            fontWeight: 700,
                            color: 'var(--bark)',
                            lineHeight: 1.2,
                        }}
                    >
                        {theme}
                    </Typography>

                    <Typography
                        sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.9rem' },
                            color: 'var(--muted)',
                            mb: 1.5,
                        }}
                    >
                        {wordCount} words
                    </Typography>

                    <Box sx={{ width: '100%' }}>
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.75,
                        }}>
                            <Typography
                                sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: 'var(--gold)',
                                }}
                            >
                                Progress
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--bark)',
                                }}
                            >
                                {Math.round(progress)}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'rgba(184,134,11,0.1)',
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, var(--gold) 0%, var(--gold-lt) 100%)',
                                    borderRadius: 3,
                                },
                            }}
                        />
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
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

    const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
    const [showDiacritics, setShowDiacritics] = useState(true)
    const [quizKey, setQuizKey] = useState(0)

    useEffect(() => { fetchVocab() }, [fetchVocab])

    const levels = LEVEL_MAP[slug] ?? ['A0']
    const label = SLUG_LABELS[slug] ?? slug

    // Cast vocab to include example fields
    const filteredVocab = useMemo(
        () => (storeVocab as VocabWithExamples[]).filter(v => levels.includes(v.level)),
        [storeVocab, slug]
    )

    // Group vocab by theme
    const themeWords = useMemo(() => {
        const grouped: Record<string, VocabWithExamples[]> = {}
        THEMES.forEach(theme => {
            grouped[theme] = filteredVocab.filter(v => v.theme === theme)
        })
        return grouped
    }, [filteredVocab])

    // Calculate theme progress (placeholder)
    const themeProgress = useMemo(() => {
        const progress: Record<string, number> = {}
        THEMES.forEach(theme => {
            progress[theme] = Math.random() * 100
        })
        return progress
    }, [filteredVocab])

    // Overall level progress
    const overallProgress = useMemo(() => {
        const totalWords = filteredVocab.length
        if (totalWords === 0) return 0
        const totalProgress = THEMES.reduce((sum, theme) => {
            return sum + (themeProgress[theme] / 100) * (themeWords[theme]?.length ?? 0)
        }, 0)
        return (totalProgress / totalWords) * 100
    }, [filteredVocab, themeProgress, themeWords])

    const activeWords = selectedTheme ? (themeWords[selectedTheme] ?? []) : []

    const handleThemeSelect = (theme: string) => {
        setSelectedTheme(theme)
        setQuizKey(k => k + 1)
    }

    const handleBackToThemes = () => {
        setSelectedTheme(null)
    }

    return (
        <>
            <style>{PAGE_CSS}</style>
            <Navbar />

            <Box
                component="main"
                sx={{ background: 'var(--cream)', minHeight: '100vh' }}
            >
                {/* ── Header ── */}
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

                        {/* Overall progress */}
                        <Box sx={{ maxWidth: 400, mb: 2 }}>
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 1,
                            }}>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: { xs: '0.75rem', sm: '0.85rem', md: '1rem' },
                                    color: 'rgba(245,237,224,0.7)',
                                    fontWeight: 500,
                                }}>
                                    Overall Progress
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: { xs: '0.75rem', sm: '0.85rem', md: '1rem' },
                                    color: 'var(--gold-lt)',
                                    fontWeight: 600,
                                }}>
                                    {Math.round(overallProgress)}%
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={overallProgress}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(90deg, var(--gold) 0%, var(--gold-lt) 100%)',
                                        borderRadius: 4,
                                    },
                                }}
                            />
                        </Box>

                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1.1rem' },
                            color: 'rgba(245,237,224,0.55)',
                            lineHeight: 1.7,
                            maxWidth: 500,
                        }}>
                            {filteredVocab.length} words across {THEMES.length} themes
                        </Typography>
                    </Container>
                </Box>

                <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4, md: 6 } }}>

                    {selectedTheme ? (
                        /* ── Flashcard Quiz View ── */
                        <Box>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 2,
                                mb: { xs: 2, sm: 3, md: 4 },
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ArrowBackSharp sx={{ fontSize: { xs: 16, md: 20 } }} />}
                                        onClick={handleBackToThemes}
                                        sx={{
                                            borderColor: 'rgba(184,134,11,0.3)',
                                            color: 'var(--bark)',
                                            fontFamily: 'Jost, sans-serif',
                                            fontWeight: 500,
                                            fontSize: { xs: '0.72rem', sm: '0.78rem', md: '0.9rem' },
                                            textTransform: 'none',
                                            borderRadius: '6px',
                                            px: { xs: 1.5, md: 2 },
                                            '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: 'var(--gold)' },
                                        }}
                                    >
                                        Themes
                                    </Button>
                                    <Typography sx={{
                                        fontFamily: '"EB Garamond", serif',
                                        fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' },
                                        fontWeight: 700,
                                        color: 'var(--bark)',
                                    }}>
                                        {selectedTheme}
                                    </Typography>
                                </Box>

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

                            {isLoading ? (
                                <Box className="fc-shell" sx={{ gap: 2 }}>
                                    <Box className="fc-skeleton" sx={{ height: 2, width: '100%', mb: 2 }} />
                                    <Box className="fc-skeleton" sx={{ height: 20, width: 80, mx: 'auto' }} />
                                    <Box className="fc-skeleton" sx={{ height: 88, width: '55%', mx: 'auto', mt: 1 }} />
                                    <Box className="fc-skeleton" sx={{ height: 32, width: '30%', mx: 'auto' }} />
                                    <Box className="fc-skeleton" sx={{ height: 44, width: '100%', mt: 'auto' }} />
                                </Box>
                            ) : activeWords.length === 0 ? (
                                <Box className="fc-shell" sx={{ alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        color: 'var(--muted)',
                                        fontSize: { xs: '0.85rem', sm: '0.9rem', md: '1.1rem' }
                                    }}>
                                        No words found for this theme.
                                    </Typography>
                                </Box>
                            ) : (
                                <FlashcardQuiz
                                    key={quizKey}
                                    words={activeWords}
                                    showDiacritics={showDiacritics}
                                    onComplete={handleBackToThemes}
                                    themeLabel={selectedTheme}
                                />
                            )}
                        </Box>
                    ) : (
                        /* ── Theme Grid View ── */
                        <Box>
                            <Typography sx={{
                                fontFamily: '"EB Garamond", serif',
                                fontSize: { xs: '1.3rem', sm: '1.6rem', md: '2rem' },
                                fontWeight: 700,
                                color: 'var(--bark)',
                                mb: { xs: 2, sm: 3, md: 4 },
                            }}>
                                Select a Theme
                            </Typography>

                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: 'repeat(2, 1fr)',
                                    md: 'repeat(3, 1fr)',
                                    lg: 'repeat(3, 1fr)',
                                    xl: 'repeat(4, 1fr)',
                                },
                                gap: { xs: 2, sm: 3, md: 4 },
                                placeItems: 'center',
                                width: '100%',
                            }}>
                                {THEMES.map((theme) => (
                                    <ThemeCard
                                        key={theme}
                                        theme={theme}
                                        wordCount={themeWords[theme]?.length ?? 0}
                                        progress={themeProgress[theme] ?? 0}
                                        isActive={selectedTheme === theme}
                                        onClick={() => handleThemeSelect(theme)}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                </Container>
            </Box>
        </>
    )
}

const THEMES = [
    'Basics & Greetings',
    'Colours',
    'Numbers & Time',
    'Food & Drink',
    'People & Family',
    'Places & Home',
    'Travel & Nature',
    'Adjectives & Feelings',
    'Actions (Verbs)',
] as const

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