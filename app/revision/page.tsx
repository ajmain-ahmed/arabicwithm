'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
    Box, Container, Typography, Button, Collapse,
    LinearProgress, Skeleton, IconButton, Dialog,
    DialogTitle, DialogContent, Fade,
    DialogActions, Slider, useMediaQuery, Grid,
} from '@mui/material'
import {
    ArrowBackSharp, CheckCircle, Refresh, Close,
    HelpOutlineRounded, Settings, ChevronLeft, ChevronRight,
    Replay, TrendingFlat, Check, TrendingUp, MenuBook,
    ArrowForwardSharp,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/navbar'
import AuthDialog from '@/app/components/AuthDialog'
import { useAuth } from '@/app/AuthContext'
import {
    submitRevisionAnswersBatch,
    type RevisionCard,
    type Answer,
    type SessionLog,
} from '@/app/actions/revision'
import { useRevisionStore } from '@/store/revisionStore'
import { computeAnswerResult, type ProgressState } from '@/app/lib/sm2'
import WelcomeScreen from './WelcomeScreen'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type SessionMode = 'daily' | 'custom'

type Queue = 'new' | 'learning' | 'review'

interface SessionCard {
    data: RevisionCard
    queue: Queue
    lapses: number
    dotId: string
    learningStep: number
}

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */
const QUEUE_CONFIG: Record<Queue, { label: string; color: string; activeBg: string; border: string }> = {
    new: { label: 'New', color: '#1565c0', activeBg: 'rgba(21,101,192,0.12)', border: 'rgba(21,101,192,0.5)' },
    learning: { label: 'Learning', color: '#c13a00', activeBg: 'rgba(193,58,0,0.10)', border: 'rgba(193,58,0,0.45)' },
    review: { label: 'To Review', color: '#2e7d32', activeBg: 'rgba(46,125,50,0.10)', border: 'rgba(46,125,50,0.45)' },
}

const ANSWER_BUTTONS: { label: string; value: Answer; color: string; hoverBg: string; border: string; icon: React.ReactNode }[] = [
    { label: 'Again', value: 'again', color: '#c62828', hoverBg: 'rgba(198,40,40,0.06)', border: 'rgba(198,40,40,0.4)', icon: <Replay sx={{ fontSize: '1rem' }} /> },
    { label: 'Hard', value: 'hard', color: '#e65100', hoverBg: 'rgba(230,81,0,0.06)', border: 'rgba(230,81,0,0.4)', icon: <TrendingFlat sx={{ fontSize: '1rem' }} /> },
    { label: 'Good', value: 'good', color: '#2e7d32', hoverBg: 'rgba(46,125,50,0.06)', border: 'rgba(46,125,50,0.4)', icon: <Check sx={{ fontSize: '1rem' }} /> },
    { label: 'Easy', value: 'easy', color: '#1565c0', hoverBg: 'rgba(21,101,192,0.06)', border: 'rgba(21,101,192,0.4)', icon: <TrendingUp sx={{ fontSize: '1rem' }} /> },
]

const RATING_COLORS: Record<Answer, string> = {
    again: '#c62828',
    hard: '#e65100',
    good: '#2e7d32',
    easy: '#1565c0',
}

const SIDEBAR_PAGE_SIZE = 10

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function classifyCard(card: RevisionCard): Queue {
    const lastReview = card.last_review_at as string | null | undefined
    const interval = card.interval_days as number | null | undefined
    if (!lastReview && (card.repetitions ?? 0) === 0) return 'new'
    if (interval == null || interval === 0) return 'learning'
    return 'review'
}

function parseExamples(card: RevisionCard) {
    const exAr = card.ex_ar
    const exEn = card.ex_en
    const exDi = card.ex_di
    if (!exAr || !exEn) return []
    const ar = exAr.split(';').map((s) => s.trim())
    const di = exDi ? exDi.split(';').map((s) => s.trim()) : ar
    const en = exEn.split(';').map((s) => s.trim())
    const count = Math.min(ar.length, en.length)
    return Array.from({ length: count }, (_, i) => ({
        arabic: ar[i] || '',
        diacritic: di[i] || ar[i] || '',
        english: en[i] || '',
    }))
}

let _dotIdCounter = 0
function makeDotId() { return `dot-${++_dotIdCounter}` }

/* ─────────────────────────────────────────────
   useAnkiQueue
───────────────────────────────────────────── */
interface QueueState {
    deck: SessionCard[]
    answeredDots: Map<string, string>
    dotOrder: string[]
    totalEver: number
}

function useAnkiQueue(initial: SessionCard[], seedAnswered?: Map<string, string>, seedDotOrder?: string[], sessionKey?: number) {
    const [state, setState] = useState<QueueState>(() => {
        const initialDotIds = initial.map(c => c.dotId)
        const mergedDotOrder = [...(seedDotOrder ?? []), ...initialDotIds]
        return {
            deck: initial,
            answeredDots: seedAnswered ? new Map(seedAnswered) : new Map(),
            dotOrder: mergedDotOrder,
            totalEver: mergedDotOrder.length,
        }
    })

    useEffect(() => {
        const initialDotIds = initial.map(c => c.dotId)
        const mergedDotOrder = [...(seedDotOrder ?? []), ...initialDotIds]
        const answeredDots = seedAnswered ? new Map(seedAnswered) : new Map()
        // Pre-colour dots for cards that were already answered in this session
        // (e.g. Again cards that are still in the deck after a soft navigation).
        for (const c of initial) {
            if (c.data.lastRating) {
                answeredDots.set(c.dotId, RATING_COLORS[c.data.lastRating])
            }
        }
        setState({
            deck: initial,
            answeredDots,
            dotOrder: mergedDotOrder,
            totalEver: mergedDotOrder.length,
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionKey])

    const currentCard = state.deck[0] ?? null
    const isComplete = state.deck.length === 0
    const doneCount = state.answeredDots.size

    const counts: Record<Queue, number> = useMemo(() => {
        const c: Record<Queue, number> = { new: 0, learning: 0, review: 0 }
        state.deck.forEach(sc => { c[sc.queue]++ })
        return c
    }, [state.deck])

    const answer = useCallback((ans: Answer, nextLearningStep: number, graduated: boolean) => {
        setState(prev => {
            if (prev.deck.length === 0) return prev
            const [current, ...rest] = prev.deck

            const color = RATING_COLORS[ans]
            const newAnswered = new Map(prev.answeredDots)
            newAnswered.set(current.dotId, color)

            const shouldReinsert = ans === 'again' || !graduated

            if (shouldReinsert) {
                const reinserted: SessionCard = {
                    ...current,
                    queue: 'learning',
                    lapses: ans === 'again' ? current.lapses + 1 : current.lapses,
                    dotId: makeDotId(),
                    learningStep: nextLearningStep,
                    data: {
                        ...current.data,
                        next_review_at: null,
                    },
                }
                const insertAt = Math.min(3, rest.length)
                const newDeck = [
                    ...rest.slice(0, insertAt),
                    reinserted,
                    ...rest.slice(insertAt),
                ]
                const newDotOrder = [...prev.dotOrder]
                const insertDotAt = newDotOrder.indexOf(current.dotId) + 1 + insertAt
                newDotOrder.splice(insertDotAt, 0, reinserted.dotId)

                return {
                    ...prev,
                    deck: newDeck,
                    answeredDots: newAnswered,
                    dotOrder: newDotOrder,
                    totalEver: prev.totalEver + 1,
                }
            }

            return { ...prev, deck: rest, answeredDots: newAnswered }
        })
    }, [])

    return { ...state, currentCard, isComplete, doneCount, counts, answer }
}

/* ─────────────────────────────────────────────
   BucketChips
───────────────────────────────────────────── */
function BucketChips({ counts, currentQueue }: { counts: Record<Queue, number>; currentQueue: Queue }) {
    return (
        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, alignItems: 'center', overflow: 'auto' }}>
            {(['new', 'learning', 'review'] as Queue[]).map(q => {
                const cfg = QUEUE_CONFIG[q]
                const isActive = currentQueue === q
                const count = counts[q]
                return (
                    <Box key={q} sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: '11px', sm: '13px' },
                        fontWeight: isActive ? 700 : 500,
                        px: { xs: '8px', sm: '12px' },
                        py: '4px',
                        borderRadius: '999px',
                        border: `${isActive ? '2px' : '1px'} solid`,
                        borderColor: isActive ? cfg.border : 'rgba(122,110,101,0.2)',
                        color: isActive ? cfg.color : '#7a6e65',
                        background: isActive ? cfg.activeBg : 'transparent',
                        transition: 'all 0.2s',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        opacity: count === 0 && !isActive ? 0.45 : 1,
                        flexShrink: 0,
                    }}>
                        {count} {cfg.label}
                    </Box>
                )
            })}
        </Box>
    )
}

/* ─────────────────────────────────────────────
   PillToggle
───────────────────────────────────────────── */
function PillToggle({ enabled, onToggle, label, activeColor = '#b8860b' }: {
    enabled: boolean; onToggle: () => void; label: string; activeColor?: string
}) {
    return (
        <Box onClick={onToggle} sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            cursor: 'pointer', userSelect: 'none',
            padding: '5px 12px 5px 6px', borderRadius: '999px',
            border: '1px solid',
            borderColor: enabled ? activeColor : 'rgba(122,110,101,0.25)',
            background: enabled ? `${activeColor}14` : 'transparent',
            transition: 'all 0.15s',
            '&:hover': { borderColor: activeColor, background: `${activeColor}0d` },
            minWidth: 172, justifyContent: 'center',
        }}>
            <Box sx={{
                width: 28, height: 16, borderRadius: '999px',
                background: enabled ? activeColor : 'rgba(122,110,101,0.2)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}>
                <Box sx={{
                    position: 'absolute', top: '2px',
                    left: enabled ? '14px' : '2px',
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </Box>
            <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.95rem' },
                fontWeight: 500, color: enabled ? activeColor : '#7a6e65',
                whiteSpace: 'nowrap', lineHeight: 1, transition: 'color 0.15s',
            }}>
                {label}
            </Typography>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   DesktopTextScaleSlider
───────────────────────────────────────────── */
function DesktopTextScaleSlider({ textScale, onChange }: { textScale: number; onChange: (v: number) => void }) {
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 0.5, borderRadius: '999px',
            border: '1px solid rgba(122,110,101,0.2)',
            background: 'rgba(122,110,101,0.02)', minWidth: 160,
        }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
            <Slider value={textScale} min={1.0} max={1.4} step={0.1} size="small" onChange={(_, v) => onChange(v as number)} sx={{ color: '#b8860b', flex: 1, '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   InfoDialog
───────────────────────────────────────────── */
function InfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Dialog open={open} onClose={onClose} slotProps={{
            paper: { sx: { borderRadius: '20px', width: '100%', maxWidth: 420, m: 2, overflow: 'hidden', boxShadow: '0 24px 64px rgba(44,26,14,0.18)' } },
        }}>
            <DialogTitle sx={{
                fontFamily: "'EB Garamond', serif", fontSize: '1.6rem', fontWeight: 700,
                color: '#2c1a0e', pt: 3, px: 3, pb: 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                How Word Bank Works
                <IconButton onClick={onClose} size="small" sx={{ color: '#7a6e65', mr: -0.5 }}>
                    <Close sx={{ fontSize: '1.1rem' }} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: '#7a6e65', mb: 2.5, lineHeight: 1.6 }}>
                    This page uses <strong style={{ color: '#2c1a0e' }}>spaced repetition</strong> — a method that shows you cards exactly when your memory is starting to fade, making every review as efficient as possible.
                </Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b8860b', mb: 1.25 }}>
                    The Three Queues
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2.5 }}>
                    {([
                        { queue: 'new' as Queue, icon: '🟦', body: 'Cards you have added to Word Bank but never studied yet. Max 20 per day.' },
                        { queue: 'learning' as Queue, icon: '🟥', body: 'Cards you are currently learning. You must answer them correctly twice in a row before they graduate. If you press Again, the counter resets.' },
                        { queue: 'review' as Queue, icon: '🟩', body: 'Cards you learned in a previous session. Answer correctly and the interval doubles or triples. Fail and the card lapses back to Learning.' },
                    ]).map(({ queue, icon, body }) => {
                        const cfg = QUEUE_CONFIG[queue]
                        return (
                            <Box key={queue} sx={{
                                display: 'flex', gap: 1.5, alignItems: 'flex-start',
                                p: 1.5, borderRadius: '12px',
                                border: `1px solid ${cfg.border}`, background: cfg.activeBg,
                            }}>
                                <Typography sx={{ fontSize: '1.1rem', flexShrink: 0, mt: '1px' }}>{icon}</Typography>
                                <Box>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: cfg.color, mb: 0.25 }}>{cfg.label}</Typography>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.83rem', color: '#5a4e47', lineHeight: 1.55 }}>{body}</Typography>
                                </Box>
                            </Box>
                        )
                    })}
                </Box>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b8860b', mb: 1.25 }}>
                    Rating Buttons
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1 }}>
                    {([
                        { label: 'Again', color: '#c62828', desc: 'You forgot. The card resets its learning counter and returns within a few cards.' },
                        { label: 'Hard', color: '#e65100', desc: 'You remembered with difficulty. Interval grows slowly.' },
                        { label: 'Good', color: '#2e7d32', desc: 'Normal recall. Interval roughly doubles.' },
                        { label: 'Easy', color: '#1565c0', desc: 'Effortless recall. Interval triples or more.' },
                    ] as { label: string; color: string; desc: string }[]).map(a => (
                        <Box key={a.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                            <Box sx={{ flexShrink: 0, mt: '2px', minWidth: 52, px: 1, py: '2px', borderRadius: '6px', border: `1.5px solid ${a.color}44`, background: `${a.color}0d`, textAlign: 'center' }}>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.78rem', color: a.color }}>{a.label}</Typography>
                            </Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.83rem', color: '#5a4e47', lineHeight: 1.55 }}>{a.desc}</Typography>
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                <Button fullWidth variant="contained" onClick={onClose} disableElevation sx={{
                    background: '#2c1a0e', color: '#f5ede0', fontFamily: 'Jost, sans-serif',
                    fontWeight: 600, fontSize: '0.95rem', textTransform: 'none', borderRadius: '10px', py: 1.1,
                    '&:hover': { background: '#1a0f08' },
                }}>Got it</Button>
            </DialogActions>
        </Dialog>
    )
}

/* ─────────────────────────────────────────────
   AnimatedArabicWord
───────────────────────────────────────────── */
function AnimatedArabicWord({ word, wordDiacritic, showDiacritics, textScale }: {
    word: string; wordDiacritic: string; showDiacritics: boolean; textScale: number
}) {
    const scaledSize = (size: number) => `${size * textScale}rem`
    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            <Fade in={!showDiacritics} timeout={300} unmountOnExit>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: { xs: scaledSize(3.2), md: scaledSize(3.8) },
                        fontWeight: 700, direction: 'rtl', textAlign: 'center', color: '#2c1a0e', lineHeight: 1.2,
                    }}>{word}</Typography>
                </Box>
            </Fade>
            <Fade in={showDiacritics} timeout={300} unmountOnExit>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: { xs: scaledSize(3.2), md: scaledSize(3.8) },
                        fontWeight: 700, direction: 'rtl', textAlign: 'center', color: '#0e2e1f', lineHeight: 1.2,
                    }}>{wordDiacritic}</Typography>
                </Box>
            </Fade>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   DefinitionPanel
───────────────────────────────────────────── */
function DefinitionPanel({ card, showDiacritics, textScale }: {
    card: RevisionCard; showDiacritics: boolean; textScale: number
}) {
    const hasDef = card.def_ar || card.def_tr || card.def_en
    if (!hasDef) return null
    const stripDia = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, '')
    const defArDisplay = showDiacritics ? (card.def_ar ?? '') : stripDia(card.def_ar ?? '')
    return (
        <Box sx={{ background: 'rgba(245,237,224,0.4)', border: '1px solid rgba(184,134,11,0.12)', borderRadius: '10px', p: { xs: '1rem', md: '1.25rem 1.5rem' }, mb: { xs: '0.75rem', md: '0.25rem' } }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.7rem * ${textScale})`, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b8860b', mb: 1 }}>Definition</Typography>
            {card.def_ar && <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: `calc(1.35rem * ${textScale})`, color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.5, mb: 0.5 }}>{defArDisplay}</Typography>}
            {card.def_tr && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.9rem * ${textScale})`, color: '#9e8a7a', textAlign: 'left', lineHeight: 1.5, mb: 0.5 }}>{card.def_tr}</Typography>}
            {card.def_en && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(1rem * ${textScale})`, color: '#7a6e65', textAlign: 'left', lineHeight: 1.5 }}>{card.def_en}</Typography>}
        </Box>
    )
}

/* ─────────────────────────────────────────────
   ExampleSentences
───────────────────────────────────────────── */
function ExampleSentences({ examples, showDiacritics, textScale }: {
    examples: ReturnType<typeof parseExamples>; showDiacritics: boolean; textScale: number
}) {
    if (examples.length === 0) return null
    return (
        <Box sx={{ background: 'rgba(245,237,224,0.5)', borderRadius: '8px', padding: { xs: '1rem', sm: '1.25rem' }, borderLeft: '3px solid #b8860b', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {examples.map((ex, i) => (
                <Box key={i} sx={{ ...(i > 0 && { borderTop: '1px solid rgba(184,134,11,0.12)', pt: 1.5 }) }}>
                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: `calc(1.2rem * ${textScale})`, sm: `calc(1.35rem * ${textScale})` }, color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.5, mb: 0.35 }}>
                        {showDiacritics ? ex.diacritic : ex.arabic}
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: `calc(0.9rem * ${textScale})`, sm: `calc(1rem * ${textScale})` }, color: '#7a6e65', fontStyle: 'italic', textAlign: 'left', lineHeight: 1.5 }}>
                        {ex.english}
                    </Typography>
                </Box>
            ))}
        </Box>
    )
}

/* ─────────────────────────────────────────────
   IntegratedProgressDots
───────────────────────────────────────────── */
interface DotInfo { dotId: string; color?: string; isCurrent: boolean; isAgainPending: boolean }

function IntegratedProgressDots({ dotOrder, answeredDots, currentDotId, againPendingIds }: {
    dotOrder: string[]; answeredDots: Map<string, string>; currentDotId: string | null; againPendingIds: Set<string>
}) {
    const isMobile = useMediaQuery('(max-width:600px)')
    const total = dotOrder.length
    if (total === 0) return null

    const dots: DotInfo[] = dotOrder.map(id => ({
        dotId: id, color: answeredDots.get(id),
        isCurrent: id === currentDotId, isAgainPending: againPendingIds.has(id),
    }))

    const MAX_DESKTOP_DOTS = 20
    const DESKTOP_HALF = 10
    const MAX_MOBILE_DOTS = 10
    let visible: DotInfo[] = dots
    let isWindowed = false

    if (isMobile && total > MAX_MOBILE_DOTS) {
        const currentIdx = currentDotId ? dotOrder.indexOf(currentDotId) : 0
        let start = Math.max(0, currentIdx - 5)
        let end = Math.min(total, start + MAX_MOBILE_DOTS)
        if (end - start < MAX_MOBILE_DOTS && end === total) { start = Math.max(0, total - MAX_MOBILE_DOTS); end = total }
        visible = dots.slice(start, end)
        isWindowed = true
    } else if (!isMobile && total > MAX_DESKTOP_DOTS) {
        const currentIdx = currentDotId ? dotOrder.indexOf(currentDotId) : 0
        let start = Math.max(0, currentIdx - DESKTOP_HALF)
        let end = Math.min(total, start + MAX_DESKTOP_DOTS)
        if (end - start < MAX_DESKTOP_DOTS && end === total) { start = Math.max(0, total - MAX_DESKTOP_DOTS); end = total }
        visible = dots.slice(start, end)
        isWindowed = true
    }

    return (
        <Box sx={{ position: 'relative', mb: '1.25rem' }}>
            <Box sx={{ height: 4, background: 'rgba(184,134,11,0.1)', borderRadius: '999px', overflow: 'visible', position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'linear-gradient(90deg, #b8860b, #d4a843)', borderRadius: '999px', transition: 'width 0.4s ease', width: total > 0 ? `${(answeredDots.size / total) * 100}%` : '0%' }} />
                {visible.map((dot, idx) => {
                    const leftPct = isWindowed
                        ? (visible.length === 1 ? 50 : (idx / (visible.length - 1)) * 100)
                        : (total === 1 ? 50 : (idx / (total - 1)) * 100)
                    const answered = dot.color !== undefined
                    const bg = answered ? dot.color! : dot.isCurrent ? '#fff' : dot.isAgainPending ? '#fff' : 'rgba(122,110,101,0.18)'
                    const border = answered ? 'none' : dot.isCurrent ? '2px solid #b8860b' : dot.isAgainPending ? '2px solid #c62828' : 'none'
                    const size = dot.isCurrent ? 14 : 10
                    return (
                        <Box key={dot.dotId} sx={{
                            position: 'absolute', left: `${leftPct}%`, top: '50%', transform: 'translate(-50%, -50%)',
                            width: size, height: size, borderRadius: '50%', background: bg, border,
                            boxShadow: dot.isCurrent ? '0 0 0 3px rgba(184,134,11,0.2)' : answered ? `0 0 0 1.5px ${dot.color}22` : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                            zIndex: dot.isCurrent ? 3 : answered ? 2 : 1,
                            ...(dot.isCurrent && { animation: 'dotPulse 1.8s ease-in-out infinite' }),
                        }} />
                    )
                })}
            </Box>
            <style>{`@keyframes dotPulse { 0%,100% { box-shadow: 0 0 0 3px rgba(184,134,11,0.20); } 50% { box-shadow: 0 0 0 5px rgba(184,134,11,0.08); } }`}</style>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   SessionSidebar
───────────────────────────────────────────── */
function SessionSidebar({ logs, doneCount, remainingCount }: { logs: SessionLog[]; doneCount: number; remainingCount: number }) {
    const [page, setPage] = useState(1)
    const totalPages = Math.max(1, Math.ceil(logs.length / SIDEBAR_PAGE_SIZE))
    useEffect(() => { setPage(1) }, [logs.length === 0])
    const start = (page - 1) * SIDEBAR_PAGE_SIZE
    const pageLogs = logs.slice(start, start + SIDEBAR_PAGE_SIZE)
    const totalCards = doneCount + remainingCount
    const progress = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0
    const avgTime = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.timeTaken, 0) / logs.length) : 0
    const ratingCounts = { again: 0, hard: 0, good: 0, easy: 0 }
    logs.forEach(l => ratingCounts[l.rating]++)

    return (
        <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.15)', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)', px: 2, py: 2, flexShrink: 0 }}>
                <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#f5ede0', lineHeight: 1.2, mb: 0.75 }}>Word Bank</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: 'rgba(245,237,224,0.6)', fontWeight: 500 }}>{doneCount} / {totalCards} cards</Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: '#d4a843', fontWeight: 700 }}>{progress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #b8860b 0%, #d4a843 100%)', borderRadius: 3 } }} />
            </Box>
            <Box sx={{ px: 2, py: 2.5, borderBottom: '1px solid rgba(184,134,11,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
                {[
                    { label: 'Avg Time', value: `${avgTime}s`, color: '#2c1a0e' },
                    { label: 'Again', value: `${ratingCounts.again}`, color: '#c62828' },
                    { label: 'Hard', value: `${ratingCounts.hard}`, color: '#e65100' },
                    { label: 'Good', value: `${ratingCounts.good}`, color: '#2e7d32' },
                    { label: 'Easy', value: `${ratingCounts.easy}`, color: '#1565c0' },
                ].map(stat => (
                    <Box key={stat.label} sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9e8a7a', mb: 0.75 }}>{stat.label}</Typography>
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
                    </Box>
                ))}
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {logs.length === 0 && (
                    <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.05rem', color: '#9e8a7a' }}>Your session history will appear here</Typography>
                    </Box>
                )}
                {pageLogs.map((log, idx) => (
                    <Box key={start + idx} sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(184,134,11,0.07)', display: 'flex', alignItems: 'center', gap: 1.5, transition: 'background 0.15s', '&:hover': { background: 'rgba(184,134,11,0.03)' } }}>
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: '#9e8a7a', width: 28, flexShrink: 0, fontWeight: 700 }}>{start + idx + 1}</Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.35rem', color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.word}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                {log.level && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#b8860b', background: 'rgba(184,134,11,0.08)', px: 0.75, py: '2px', borderRadius: '4px', lineHeight: 1 }}>{log.level}</Typography>}
                                {log.theme && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: '#7a6e65', background: 'rgba(122,110,101,0.08)', px: 0.75, py: '2px', borderRadius: '4px', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{log.theme}</Typography>}
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25, flexShrink: 0 }}>
                            <Box sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: '#fff', background: RATING_COLORS[log.rating], px: 1.2, py: '3px', borderRadius: '4px', lineHeight: 1, textTransform: 'capitalize' }}>{log.rating}</Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: '#9e8a7a' }}>{log.timeTaken}s</Typography>
                        </Box>
                    </Box>
                ))}
            </Box>
            {logs.length > SIDEBAR_PAGE_SIZE && (
                <Box sx={{ flexShrink: 0, px: 2, py: 1.5, borderTop: '1px solid rgba(184,134,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Button size="small" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} sx={{ minWidth: 0, px: 1, color: '#7a6e65', borderColor: 'rgba(122,110,101,0.25)' }} variant="outlined"><ChevronLeft fontSize="small" /></Button>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: '#7a6e65', fontWeight: 500 }}>Page {page} / {totalPages}</Typography>
                    <Button size="small" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} sx={{ minWidth: 0, px: 1, color: '#7a6e65', borderColor: 'rgba(122,110,101,0.25)' }} variant="outlined"><ChevronRight fontSize="small" /></Button>
                </Box>
            )}
        </Box>
    )
}

/* ─────────────────────────────────────────────
   SessionResults
───────────────────────────────────────────── */
function SessionResults({
    logs,
    onRestart,
    onBack,
    isLoading = false,
}: {
    logs: SessionLog[]
    onRestart: () => void
    onBack: () => void
    isLoading?: boolean
}) {
    const total = logs.length
    const newCards = logs.filter(l => l.queue === 'new').length
    const reviewCards = logs.filter(l => l.queue === 'learning' || l.queue === 'review').length

    const again = logs.filter(l => l.rating === 'again').length
    const hard = logs.filter(l => l.rating === 'hard').length
    const good = logs.filter(l => l.rating === 'good').length
    const easy = logs.filter(l => l.rating === 'easy').length

    const correct = good + easy + hard
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    const avgTime = total > 0 ? Math.round(logs.reduce((s, l) => s + l.timeTaken, 0) / total) : 0

    let ratingLabel = 'Keep Practicing'
    let ratingColor = '#c62828'
    let ratingBg = 'rgba(198,40,40,0.08)'
    if (accuracy >= 90) {
        ratingLabel = 'Outstanding!'
        ratingColor = '#1565c0'
        ratingBg = 'rgba(21,101,192,0.08)'
    } else if (accuracy >= 75) {
        ratingLabel = 'Great Work'
        ratingColor = '#2e7d32'
        ratingBg = 'rgba(46,125,50,0.08)'
    } else if (accuracy >= 60) {
        ratingLabel = 'Good Progress'
        ratingColor = '#b8860b'
        ratingBg = 'rgba(184,134,11,0.08)'
    } else if (accuracy >= 40) {
        ratingLabel = 'Keep Practicing'
        ratingColor = '#e65100'
        ratingBg = 'rgba(230,81,0,0.08)'
    }

    const circumference = 2 * Math.PI * 52
    const strokeDashoffset = circumference - (accuracy / 100) * circumference

    return (
        <Box sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
            <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
                <Box sx={{
                    background: '#fff',
                    border: '1px solid rgba(184,134,11,0.2)',
                    borderRadius: '16px',
                    p: { xs: '2rem 1.5rem', md: '3rem 2.5rem' },
                    textAlign: 'center',
                }}>
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: { xs: '1.8rem', md: '2.4rem' },
                        fontWeight: 700,
                        color: '#2c1a0e',
                        mb: 0.5,
                    }}>
                        Session Complete
                    </Typography>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: '0.9rem', md: '1rem' },
                        color: '#7a6e65',
                        mb: 4,
                    }}>
                        Here is how you performed today
                    </Typography>

                    <Box sx={{ position: 'relative', width: 140, height: 140, mx: 'auto', mb: 4 }}>
                        <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(184,134,11,0.12)" strokeWidth="8" />
                            <circle
                                cx="60"
                                cy="60"
                                r="52"
                                fill="none"
                                stroke="url(#accuracyGrad)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                            />
                            <defs>
                                <linearGradient id="accuracyGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#b8860b" />
                                    <stop offset="100%" stopColor="#d4a843" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <Box sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '2rem',
                                fontWeight: 800,
                                color: '#2c1a0e',
                                lineHeight: 1,
                            }}>
                                {accuracy}%
                            </Typography>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: '#9e8a7a',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                mt: 0.5,
                            }}>
                                accuracy
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2.5,
                        py: 1,
                        borderRadius: '999px',
                        background: ratingBg,
                        border: `1.5px solid ${ratingColor}44`,
                        mb: 4,
                    }}>
                        <CheckCircle sx={{ fontSize: 18, color: ratingColor }} />
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: ratingColor,
                            letterSpacing: '0.02em',
                        }}>
                            {ratingLabel}
                        </Typography>
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {[
                            { label: 'Total Cards', value: total, color: '#2c1a0e' },
                            { label: 'New Cards', value: newCards, color: '#1565c0' },
                            { label: 'Reviewed', value: reviewCards, color: '#2e7d32' },
                            { label: 'Avg Time', value: `${avgTime}s`, color: '#7a6e65' },
                        ].map((stat) => (
                            <Grid key={stat.label} size={{ xs: 6 }}>
                                <Box sx={{
                                    background: 'rgba(245,237,224,0.5)',
                                    border: '1px solid rgba(184,134,11,0.12)',
                                    borderRadius: '12px',
                                    p: 2,
                                }}>
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        color: '#9e8a7a',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        mb: 0.75,
                                    }}>
                                        {stat.label}
                                    </Typography>
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '1.6rem',
                                        fontWeight: 700,
                                        color: stat.color,
                                        lineHeight: 1.2,
                                    }}>
                                        {stat.value}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    <Box sx={{ textAlign: 'left', mb: 4 }}>
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#9e8a7a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            mb: 1.5,
                        }}>
                            Answer Breakdown
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            {([
                                { label: 'Again', count: again, color: '#c62828', bg: 'rgba(198,40,40,0.08)' },
                                { label: 'Hard', count: hard, color: '#e65100', bg: 'rgba(230,81,0,0.08)' },
                                { label: 'Good', count: good, color: '#2e7d32', bg: 'rgba(46,125,50,0.08)' },
                                { label: 'Easy', count: easy, color: '#1565c0', bg: 'rgba(21,101,192,0.08)' },
                            ]).map((row) => {
                                const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
                                return (
                                    <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            color: row.color,
                                            width: 48,
                                            flexShrink: 0,
                                        }}>
                                            {row.label}
                                        </Typography>
                                        <Box sx={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(184,134,11,0.08)', overflow: 'hidden' }}>
                                            <Box sx={{
                                                height: '100%',
                                                width: `${pct}%`,
                                                background: row.color,
                                                borderRadius: 4,
                                                transition: 'width 0.8s ease',
                                            }} />
                                        </Box>
                                        <Typography sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            color: '#2c1a0e',
                                            width: 40,
                                            textAlign: 'right',
                                            flexShrink: 0,
                                        }}>
                                            {row.count}
                                        </Typography>
                                    </Box>
                                )
                            })}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            onClick={onRestart}
                            disabled={isLoading}
                            startIcon={<Refresh />}
                            sx={{
                                background: 'linear-gradient(135deg, #b8860b 0%, #d4a843 100%)',
                                color: '#1a0e00',
                                fontFamily: 'Jost, sans-serif',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                textTransform: 'none',
                                borderRadius: '10px',
                                px: 3,
                                py: 1.1,
                                boxShadow: '0 6px 20px rgba(184,134,11,0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #d4a843 0%, #e6c060 100%)',
                                    boxShadow: '0 8px 28px rgba(184,134,11,0.4)',
                                },
                                '&.Mui-disabled': {
                                    background: 'rgba(184,134,11,0.3)',
                                    color: 'rgba(26,14,0,0.4)',
                                },
                            }}
                        >
                            {isLoading ? 'Loading…' : 'Study Again'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={onBack}
                            startIcon={<ArrowBackSharp />}
                            sx={{
                                borderColor: 'rgba(122,110,101,0.3)',
                                color: '#7a6e65',
                                fontFamily: 'Jost, sans-serif',
                                fontWeight: 500,
                                textTransform: 'none',
                                borderRadius: '10px',
                                px: 3,
                                py: 1.1,
                                '&:hover': {
                                    borderColor: '#7a6e65',
                                    background: 'rgba(122,110,101,0.05)',
                                },
                            }}
                        >
                            Back
                        </Button>
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   RevisionFlashcard
───────────────────────────────────────────── */
const tabButtonSx = {
    fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', fontWeight: 500,
    textTransform: 'none', borderRadius: '20px', px: 2, py: 0.5, minWidth: 80, border: '1px solid',
}

function RevisionFlashcard({
    sessionCard, counts, showDiacritics, onAnswer, textScale,
    dotOrder, answeredDots, againPendingIds, totalEver, doneCount,
}: {
    sessionCard: SessionCard
    counts: Record<Queue, number>
    showDiacritics: boolean
    onAnswer: (ans: Answer, timeTaken: number) => void
    textScale: number
    dotOrder: string[]
    answeredDots: Map<string, string>
    againPendingIds: Set<string>
    totalEver: number
    doneCount: number
}) {
    const [revealed, setRevealed] = useState(false)
    const [activeTab, setActiveTab] = useState<'definition' | 'examples'>('definition')
    const [elapsed, setElapsed] = useState(0)
    const [timerRunning, setTimerRunning] = useState(false)

    const cardStartRef = useRef<number>(Date.now())
    const revealTimeRef = useRef<number>(0)

    const card = sessionCard.data
    const examples = parseExamples(card)
    const progress = totalEver > 0 ? Math.round((doneCount / totalEver) * 100) : 0

    useEffect(() => {
        setRevealed(false)
        setActiveTab('definition')
        cardStartRef.current = Date.now()
        setElapsed(0)
        setTimerRunning(true)
    }, [card.id ?? card.word])

    useEffect(() => {
        if (!timerRunning) return
        const interval = setInterval(() => { setElapsed(Math.round((Date.now() - cardStartRef.current) / 1000)) }, 1000)
        return () => clearInterval(interval)
    }, [timerRunning])

    const handleReveal = () => {
        setRevealed(true)
        setTimerRunning(false)
        revealTimeRef.current = Math.round((Date.now() - cardStartRef.current) / 1000)
    }

    const handleAnswer = (ans: Answer) => {
        const timeTaken = revealTimeRef.current || Math.round((Date.now() - cardStartRef.current) / 1000)
        onAnswer(ans, timeTaken)
    }

    const answerTextSize = `calc(1.5rem * ${textScale})`
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    return (
        <Box sx={{
            background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px',
            padding: { xs: '1.25rem 0.875rem 0.5rem', md: '2rem 1.5rem 0.75rem' },
            minHeight: { xs: '300px', md: '340px' }, display: 'flex', flexDirection: 'column', position: 'relative',
        }}>
            <IntegratedProgressDots dotOrder={dotOrder} answeredDots={answeredDots} currentDotId={sessionCard.dotId} againPendingIds={againPendingIds} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1 }}>
                <BucketChips counts={counts} currentQueue={sessionCard.queue} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: 600, color: timerRunning ? '#9e8a7a' : '#b8860b', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em', transition: 'color 0.3s' }}>
                        {formatTime(elapsed)}
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: '#b8860b', flexShrink: 0 }}>{progress}%</Typography>
                </Box>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Box sx={{ height: { xs: '2.5rem', md: '1.5rem' } }} />
                <Box sx={{
                    flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: { xs: `${(3.2 * textScale * 1.2).toFixed(1)}rem`, md: `${(3.8 * textScale * 1.2).toFixed(1)}rem` },
                    mb: { xs: '1.5rem', md: '2rem' },
                }}>
                    <AnimatedArabicWord word={card.word} wordDiacritic={card.word_diacritic} showDiacritics={showDiacritics} textScale={textScale} />
                </Box>

                <Box sx={{ mt: 'auto', width: '100%' }}>
                    <Collapse in={revealed} timeout={{ enter: 300, exit: 0 }}>
                        <Box sx={{ borderTop: '1px solid rgba(184,134,11,0.1)', pt: '1rem', mb: '1rem' }} />

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 0.5, md: 0.75 } }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Jost, sans-serif', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: '999px', background: 'rgba(122,110,101,0.08)', color: '#7a6e65' }}>
                                {card.type}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', py: 1, mb: { xs: 1, md: 1.5 } }}>
                            {card.transliteration && (
                                <Typography component="span" sx={{ fontFamily: 'Jost, sans-serif', fontSize: answerTextSize, color: '#b8860b', letterSpacing: '0.05em', lineHeight: 1 }}>{card.transliteration}</Typography>
                            )}
                            <Typography component="span" sx={{ fontFamily: "'EB Garamond', serif", fontSize: answerTextSize, fontWeight: 700, color: '#2c1a0e', lineHeight: 1 }}>{card.definition}</Typography>
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                <Button onClick={() => setActiveTab('definition')} sx={{ ...tabButtonSx, background: activeTab === 'definition' ? 'rgba(184,134,11,0.12)' : 'transparent', color: activeTab === 'definition' ? '#b8860b' : '#7a6e65', borderColor: activeTab === 'definition' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)' }}>Definition</Button>
                                <Button onClick={() => setActiveTab('examples')} sx={{ ...tabButtonSx, background: activeTab === 'examples' ? 'rgba(184,134,11,0.12)' : 'transparent', color: activeTab === 'examples' ? '#b8860b' : '#7a6e65', borderColor: activeTab === 'examples' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)' }}>Examples</Button>
                            </Box>
                            {activeTab === 'definition' && <DefinitionPanel card={card} showDiacritics={showDiacritics} textScale={textScale} />}
                            {activeTab === 'examples' && <ExampleSentences examples={examples} showDiacritics={showDiacritics} textScale={textScale} />}
                        </Box>

                        <Box sx={{ mt: { xs: '1.25rem', md: '1.5rem' } }}>
                            <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {ANSWER_BUTTONS.map(btn => (
                                    <Button key={btn.value} variant="outlined" onClick={() => handleAnswer(btn.value)} startIcon={btn.icon}
                                        sx={{ color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', textTransform: 'none', borderRadius: '6px', py: '0.5rem', border: `1.5px solid ${btn.border}`, background: 'transparent', '&:hover': { background: btn.hoverBg, borderColor: btn.color } }}>
                                        {btn.label}
                                    </Button>
                                ))}
                            </Box>
                            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: '8px' }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {ANSWER_BUTTONS.slice(0, 2).map(btn => (
                                        <Button key={btn.value} variant="outlined" onClick={() => handleAnswer(btn.value)} startIcon={btn.icon}
                                            sx={{ color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', borderRadius: '8px', py: '0.55rem', border: `1.5px solid ${btn.border}`, background: 'transparent', '&:hover': { background: btn.hoverBg, borderColor: btn.color } }}>
                                            {btn.label}
                                        </Button>
                                    ))}
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {ANSWER_BUTTONS.slice(2, 4).map(btn => (
                                        <Button key={btn.value} variant="outlined" onClick={() => handleAnswer(btn.value)} startIcon={btn.icon}
                                            sx={{ color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', borderRadius: '8px', py: '0.55rem', border: `1.5px solid ${btn.border}`, background: 'transparent', '&:hover': { background: btn.hoverBg, borderColor: btn.color } }}>
                                            {btn.label}
                                        </Button>
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </Collapse>

                    {!revealed && (
                        <Box sx={{ pt: { xs: 2, md: 3 } }}>
                            <Button fullWidth variant="outlined" onClick={handleReveal}
                                sx={{ py: { xs: '0.65rem', md: '0.6rem' }, border: '1px solid rgba(184,134,11,0.3)', borderRadius: '6px', color: '#2c1a0e', fontFamily: 'Jost, sans-serif', fontSize: { xs: '1rem', md: 'clamp(1rem, 1.6vw, 1.2rem)' }, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'none', transition: 'background 0.15s, border-color 0.15s, transform 0.2s', '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: 'rgba(184,134,11,0.5)', transform: 'translateY(-1px)' } }}>
                                Show answer
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function RevisionPage() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const getSession = useRevisionStore((s) => s.getSession)
    const updateSessionCard = useRevisionStore((s) => s.updateSessionCard)
    const clearSession = useRevisionStore((s) => s.clearSession)

    const [dueCards, setDueCards] = useState<RevisionCard[]>([])
    const [completedCards, setCompletedCards] = useState<RevisionCard[]>([])
    const [loading, setLoading] = useState(false)
    const [showDiacritics, setShowDiacritics] = useState(true)
    const [textScale, setTextScale] = useState(1.1)
    const [infoOpen, setInfoOpen] = useState(false)
    const [sessionStarted, setSessionStarted] = useState(false)
    const [sessionMode, setSessionMode] = useState<SessionMode | null>(null)
    const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([])
    const [progressOpen, setProgressOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [authDialogOpen, setAuthDialogOpen] = useState(false)
    const [sessionKey, setSessionKey] = useState(0)
    const pendingAnswersRef = useRef<{ vocabId: number; answer: Answer }[]>([])
    const hasUnsavedRef = useRef(false)

    const initialDeck = useMemo<SessionCard[]>(() => dueCards.map(card => ({
        data: card,
        queue: classifyCard(card),
        lapses: card.lapses ?? 0,
        dotId: makeDotId(),
        learningStep: card.learning_step ?? 0,
    })), [dueCards])

    const { seedAnsweredDots, seedDotOrder } = useMemo(() => {
        const dueIds = new Set(dueCards.map(c => c.id))
        const answeredDots = new Map<string, string>()
        const dotOrder: string[] = []
        completedCards.forEach(card => {
            if (dueIds.has(card.id)) return
            const dotId = `seed-${card.id}`
            if (card.lastRating) answeredDots.set(dotId, RATING_COLORS[card.lastRating])
            dotOrder.push(dotId)
        })
        return { seedAnsweredDots: answeredDots, seedDotOrder: dotOrder }
    }, [completedCards, dueCards])

    const { deck, currentCard, counts, doneCount, totalEver, isComplete, answer, dotOrder, answeredDots } =
        useAnkiQueue(initialDeck, seedAnsweredDots, seedDotOrder, sessionKey)

    const againPendingIds = useMemo<Set<string>>(() => {
        const set = new Set<string>()
        const deckMap = new Map(deck.map(c => [c.dotId, c]))
        dotOrder.forEach(id => {
            if (answeredDots.has(id)) return
            const card = deckMap.get(id)
            if (card && card.lapses > 0) set.add(id)
        })
        return set
    }, [dotOrder, answeredDots, deck])

    /* ── Flush pending answers to server ── */
    const flushPendingAnswers = useCallback(async () => {
        const pending = pendingAnswersRef.current
        if (pending.length === 0) return

        const answers = pending.splice(0)
        hasUnsavedRef.current = false

        try {
            await submitRevisionAnswersBatch(answers)
        } catch (err) {
            console.error('Batch flush failed:', err)
        }
    }, [])

    /* ── Flush pending answers when session completes ── */
    useEffect(() => {
        if (isComplete && user && sessionStarted && sessionMode === 'daily') {
            flushPendingAnswers()
        }
    }, [isComplete, user, flushPendingAnswers, sessionStarted, sessionMode])

    /* ── Load cards ── */
    const hasInitializedRef = useRef(false)

    const loadCards = useCallback(async () => {
        setLoading(true)

        // Flush any pending answers from the previous session
        await flushPendingAnswers()

        try {
            const { dueCards, completedCards } = await getSession()
            setDueCards(dueCards)
            setCompletedCards(completedCards)
            setSessionStarted(true)

            // Rebuild session logs from the cache so they survive navigation.
            // Cards in either due or completed with a lastRating get a log entry.
            const allRated = new Map<number, RevisionCard>()
            for (const c of dueCards) {
                if (c.lastRating) allRated.set(c.id, c)
            }
            for (const c of completedCards) {
                if (c.lastRating) allRated.set(c.id, c)
            }
            setSessionLogs(
                Array.from(allRated.values()).map(c => ({
                    cardId: c.id,
                    word: c.word,
                    rating: c.lastRating ?? 'good',
                    timeTaken: 0,
                    level: c.level,
                    theme: c.theme_name ?? '',
                    queue: classifyCard(c),
                }))
            )

            if (!hasInitializedRef.current) {
                hasInitializedRef.current = true
                setSessionKey(k => k + 1)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [flushPendingAnswers])



    const restartSession = useCallback(async () => {
        clearSession()
        setDueCards([])
        setCompletedCards([])
        hasInitializedRef.current = false
        setSessionLogs([])
        setSessionStarted(false)
        setSessionMode(null)
        setSessionKey(k => k + 1)
    }, [clearSession])

    /* ── Flush on tab hide / page leave / soft navigation ── */
    useEffect(() => {
        const flush = () => { flushPendingAnswers() }

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') flush()
        }

        const onPageHide = () => { flush() }

        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedRef.current) {
                e.preventDefault()
                e.returnValue = ''
            }
            flush()
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('pagehide', onPageHide)
        window.addEventListener('beforeunload', onBeforeUnload)

        return () => {
            // 🔥 CRITICAL: flush on soft navigation (Next.js Link / router.push)
            flush()
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('pagehide', onPageHide)
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    }, [flushPendingAnswers])

    /* ── Optimistic answer handler ── */
    const handleAnswer = useCallback((ans: Answer, timeTaken: number) => {
        if (!currentCard) return

        const vocabId = currentCard.data.progress_word_id
        const currentProgress: ProgressState = {
            repetitions: currentCard.data.repetitions,
            interval_days: currentCard.data.interval_days,
            ease_factor: currentCard.data.ease_factor,
            learning_step: currentCard.learningStep,
            lapses: currentCard.data.lapses ?? 0,
        }

        // Compute new state locally
        const result = computeAnswerResult(currentProgress, ans)

        const nowISO = new Date().toISOString()
        currentCard.data.last_review_at = nowISO

        // Keep the store cache in sync with the optimistic update
        updateSessionCard(vocabId, {
            repetitions: result.repetitions,
            interval_days: result.interval_days,
            ease_factor: result.ease_factor,
            learning_step: result.learning_step,
            lapses: currentCard.data.lapses ?? 0,
        }, ans)

        // Update card data in place so successive answers use fresh state
        currentCard.data.repetitions = result.repetitions
        currentCard.data.interval_days = result.interval_days
        currentCard.data.ease_factor = result.ease_factor
        currentCard.data.learning_step = result.learning_step

        // Update the deck immediately
        answer(ans, result.learning_step, result.graduated)

        // Accumulate every answer in order for the pending batch (daily only)
        if (sessionMode === 'daily') {
            pendingAnswersRef.current.push({ vocabId, answer: ans })
            hasUnsavedRef.current = true
        }

        // Log the answer for the session results screen
        setSessionLogs(prev => [...prev, {
            cardId: currentCard.data.id ?? vocabId,
            word: currentCard.data.word,
            rating: ans,
            timeTaken,
            level: currentCard.data.level,
            theme: currentCard.data.theme_name ?? '',
            queue: currentCard.queue,
        }])
    }, [currentCard, answer, sessionMode])

    if (loading || authLoading) {
        return (
            <>
                <Navbar />
                <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
                    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 3, md: 4 } }}>
                            <Skeleton variant="text" width={140} height={40} />
                            <Skeleton variant="rounded" width={180} height={36} />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
                            <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '1.5rem 1rem', md: '2rem 1.5rem' }, minHeight: 340, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Skeleton variant="rounded" height={4} sx={{ mb: 2, borderRadius: '999px' }} />
                                <Skeleton variant="rounded" height={24} width={220} />
                                <Skeleton variant="rounded" height={88} width="55%" sx={{ mx: 'auto', mt: 1 }} />
                                <Skeleton variant="rounded" height={32} width="30%" sx={{ mx: 'auto' }} />
                                <Skeleton variant="rounded" height={44} width="100%" sx={{ mt: 'auto' }} />
                            </Box>
                            <Box sx={{ display: { xs: 'none', lg: 'block' } }}><Skeleton variant="rounded" height={400} sx={{ borderRadius: '10px' }} /></Box>
                        </Box>
                    </Container>
                </Box>
            </>
        )
    }

    if (!user) {
        return (
            <>
                <Navbar />
                <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
                    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
                        <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '2.5rem 1.5rem', md: '3rem 2rem' }, textAlign: 'center' }}>
                            <MenuBook sx={{ fontSize: { xs: 52, md: 64 }, color: '#b8860b', mb: 2 }} />
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: '1.8rem', md: '2.2rem' }, fontWeight: 700, color: '#2c1a0e', mb: 1 }}>Word Bank</Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.95rem', md: '1.05rem' }, color: '#7a6e65', mb: 3 }}>
                                Log in to track your revision progress and review words with spaced repetition.
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                <Button variant="contained" onClick={() => setAuthDialogOpen(true)} sx={{ background: '#2c1a0e', color: '#f5ede0', fontFamily: 'Jost, sans-serif', fontWeight: 600, textTransform: 'none', borderRadius: '6px', px: 3, '&:hover': { background: '#1a0f08' } }}>Log in</Button>
                                <Button variant="outlined" startIcon={<ArrowBackSharp />} onClick={() => router.back()} sx={{ borderColor: 'rgba(122,110,101,0.3)', color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontWeight: 500, textTransform: 'none', borderRadius: '6px', px: 3, '&:hover': { borderColor: '#7a6e65', background: 'rgba(122,110,101,0.05)' } }}>Back</Button>
                            </Box>
                        </Box>
                    </Container>
                </Box>
                <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
            </>
        )
    }

    if (!sessionStarted && user) {
        return (
            <>
                <WelcomeScreen
                    onStartDaily={() => {
                        setSessionMode('daily')
                        loadCards()
                    }}
                    onStartCustom={(cards) => {
                        setSessionMode('custom')
                        setDueCards(cards)
                        setCompletedCards([])
                        setSessionStarted(true)
                        setSessionLogs([])
                        setSessionKey(k => k + 1)
                    }}
                />
                <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
            </>
        )
    }

    if (isComplete || (sessionStarted && dueCards.length === 0 && completedCards.length === 0)) {
        return (
            <>
                <Navbar />
                <SessionResults
                    logs={sessionLogs}
                    onRestart={restartSession}
                    onBack={() => router.back()}
                    isLoading={loading}
                />
            </>
        )
    }

    return (
        <>
            <Navbar />
            <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />

            <Dialog open={progressOpen} onClose={() => setProgressOpen(false)} fullScreen sx={{ display: { sm: 'none' } }} slotProps={{ paper: { sx: { background: '#faf7f2' } } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)', px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.25rem', fontWeight: 700, color: '#f5ede0' }}>Session Progress</Typography>
                        <IconButton onClick={() => setProgressOpen(false)} size="small" sx={{ color: '#f5ede0' }}><Close sx={{ fontSize: '1.5rem' }} /></IconButton>
                    </Box>
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        <SessionSidebar logs={sessionLogs} doneCount={doneCount} remainingCount={deck.length} />
                    </Box>
                </Box>
            </Dialog>

            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullScreen sx={{ display: { sm: 'none' } }} slotProps={{ paper: { sx: { background: '#faf7f2' } } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)', px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.25rem', fontWeight: 700, color: '#f5ede0' }}>Settings</Typography>
                        <IconButton onClick={() => setSettingsOpen(false)} size="small" sx={{ color: '#f5ede0' }}><Close sx={{ fontSize: '1.5rem' }} /></IconButton>
                    </Box>
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <PillToggle enabled={showDiacritics} onToggle={() => setShowDiacritics(p => !p)} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: '#7a6e65' }}>Text size</Typography>
                            <Slider value={textScale} min={1.0} max={1.4} step={0.1} onChange={(_, v) => setTextScale(v as number)} sx={{ color: '#b8860b', flex: 1 }} />
                        </Box>
                    </Box>
                </Box>
            </Dialog>

            <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
                <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { sm: '1.6rem', md: '2rem' }, fontWeight: 700, color: '#2c1a0e' }}>Word Bank</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <DesktopTextScaleSlider textScale={textScale} onChange={setTextScale} />
                            <PillToggle enabled={showDiacritics} onToggle={() => setShowDiacritics(p => !p)} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                            <IconButton onClick={() => setInfoOpen(true)} size="small" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}><HelpOutlineRounded sx={{ fontSize: '1rem' }} /></IconButton>
                        </Box>
                    </Box>

                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#2c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, mr: 1 }}>Word Bank</Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
                            <Button size="small" onClick={() => setProgressOpen(true)} variant="outlined" sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: '20px', px: 1.5, py: '4px', borderColor: 'rgba(14,46,31,0.35)', color: '#0e2e1f', '&:hover': { background: 'rgba(14,46,31,0.06)', borderColor: '#0e2e1f' } }}>Progress</Button>
                            <IconButton onClick={() => setSettingsOpen(true)} size="small" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}><Settings sx={{ fontSize: '1rem' }} /></IconButton>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
                        <Box>
                            {currentCard && (
                                <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
                                    <RevisionFlashcard
                                        sessionCard={currentCard}
                                        counts={counts}
                                        showDiacritics={showDiacritics}
                                        onAnswer={handleAnswer}
                                        textScale={textScale}
                                        dotOrder={dotOrder}
                                        answeredDots={answeredDots}
                                        againPendingIds={againPendingIds}
                                        totalEver={totalEver}
                                        doneCount={doneCount}
                                    />
                                </Box>
                            )}
                        </Box>
                        <Box sx={{ display: { xs: 'none', lg: 'block' }, position: 'sticky', top: 80, maxHeight: 'calc(100vh - 100px)' }}>
                            <SessionSidebar logs={sessionLogs} doneCount={doneCount} remainingCount={deck.length} />
                        </Box>
                    </Box>
                </Container>
            </Box>
            <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
        </>
    )
}