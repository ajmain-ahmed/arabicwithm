// app/revision/page.tsx
'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
    Box, Container, Typography, Button, Collapse,
    LinearProgress, Skeleton, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import {
    ArrowBackSharp, CheckCircle, Refresh, InfoOutlined, Close,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/navbar'
import {
    fetchDueRevisionCards,
    submitRevisionAnswer,
    type RevisionCard,
    type Answer,
} from '@/app/actions/revision'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Queue = 'new' | 'learning' | 'review'

interface SessionCard {
    data: RevisionCard
    queue: Queue
    lapses: number
}

/* ─────────────────────────────────────────────
   Classify a raw DB card into its initial queue
   new:      repetitions=0 and never reviewed
   review:   graduated (interval_days >= 1)
   learning: anything in between
───────────────────────────────────────────── */
function classifyCard(card: RevisionCard): Queue {
    const rep = (card as any).repetitions as number | null | undefined
    const lastReview = (card as any).last_review_at as string | null | undefined
    const intervalDays = (card as any).interval_days as number | null | undefined
    if ((rep == null || rep === 0) && !lastReview) return 'new'
    if ((intervalDays ?? 0) >= 1) return 'review'
    return 'learning'
}

function parseExamples(card: RevisionCard) {
    const exAr = (card as any).ex_ar as string | undefined
    const exEn = (card as any).ex_en as string | undefined
    const exDi = (card as any).ex_di as string | undefined
    if (!exAr || !exEn) return []
    const ar = exAr.split(';').map((s: string) => s.trim())
    const di = exDi ? exDi.split(';').map((s: string) => s.trim()) : ar
    const en = exEn.split(';').map((s: string) => s.trim())
    const count = Math.min(ar.length, en.length)
    return Array.from({ length: count }, (_, i) => ({
        arabic: ar[i] || '',
        diacritic: di[i] || ar[i] || '',
        english: en[i] || '',
    }))
}

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */
const QUEUE_CONFIG: Record<Queue, { label: string; color: string; activeBg: string; border: string }> = {
    new: { label: 'New', color: '#1565c0', activeBg: 'rgba(21,101,192,0.12)', border: 'rgba(21,101,192,0.5)' },
    learning: { label: 'Learning', color: '#c13a00', activeBg: 'rgba(193,58,0,0.10)', border: 'rgba(193,58,0,0.45)' },
    review: { label: 'To Review', color: '#2e7d32', activeBg: 'rgba(46,125,50,0.10)', border: 'rgba(46,125,50,0.45)' },
}

const ANSWER_BUTTONS: { label: string; value: Answer; color: string; hoverBg: string; border: string }[] = [
    { label: 'Again', value: 'again', color: '#c62828', hoverBg: 'rgba(198,40,40,0.06)', border: 'rgba(198,40,40,0.4)' },
    { label: 'Hard', value: 'hard', color: '#e65100', hoverBg: 'rgba(230,81,0,0.06)', border: 'rgba(230,81,0,0.4)' },
    { label: 'Good', value: 'good', color: '#2e7d32', hoverBg: 'rgba(46,125,50,0.06)', border: 'rgba(46,125,50,0.4)' },
    { label: 'Easy', value: 'easy', color: '#1565c0', hoverBg: 'rgba(21,101,192,0.06)', border: 'rgba(21,101,192,0.4)' },
]

/* ─────────────────────────────────────────────
   useAnkiQueue
   ─────────────────────────────────────────────
   The deck is an ordered list. deck[0] is always shown.

   On "again":  card moves ~3 positions ahead in the deck,
                queue flips to 'learning'. It will come back.

   On any other answer: card is removed (done for this session).

   Counts = cards remaining in deck right now (countdown like Anki).
   Progress bar uses (totalEver - remaining) / totalEver.
───────────────────────────────────────────── */
function useAnkiQueue(initial: SessionCard[]) {
    const [deck, setDeck] = useState<SessionCard[]>(initial)
    const totalEver = useRef(initial.length)

    // When new cards are loaded (initial changes), reset the queue
    useEffect(() => {
        setDeck(initial)
        totalEver.current = initial.length
    }, [initial])

    const currentCard = deck[0] ?? null
    const remaining = deck.length
    const doneCount = totalEver.current - remaining
    const isComplete = deck.length === 0

    const counts: Record<Queue, number> = useMemo(() => {
        const c: Record<Queue, number> = { new: 0, learning: 0, review: 0 }
        deck.forEach(sc => { c[sc.queue]++ })
        return c
    }, [deck])

    const answer = useCallback((ans: Answer) => {
        setDeck(prev => {
            if (prev.length === 0) return prev
            const [current, ...rest] = prev

            if (ans === 'again') {
                const updated: SessionCard = {
                    ...current,
                    queue: 'learning',
                    lapses: current.lapses + 1,
                }
                const insertAt = Math.min(3, rest.length)
                return [
                    ...rest.slice(0, insertAt),
                    updated,
                    ...rest.slice(insertAt),
                ]
            }

            return rest
        })
    }, [])

    return { deck, currentCard, counts, doneCount, totalEver: totalEver.current, isComplete, answer }
}

/* ─────────────────────────────────────────────
   BucketChips
───────────────────────────────────────────── */
function BucketChips({ counts, currentQueue }: { counts: Record<Queue, number>; currentQueue: Queue }) {
    return (
        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1 }, alignItems: 'center' }}>
            {(['new', 'learning', 'review'] as Queue[]).map(q => {
                const cfg = QUEUE_CONFIG[q]
                const isActive = currentQueue === q
                const count = counts[q]
                return (
                    <Box key={q} sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: '12px', sm: '13px' },
                        fontWeight: isActive ? 700 : 500,
                        px: { xs: '9px', sm: '12px' },
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
                fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.95rem' },
                fontWeight: 500, color: enabled ? activeColor : '#7a6e65',
                whiteSpace: 'nowrap', lineHeight: 1, transition: 'color 0.15s',
            }}>
                {label}
            </Typography>
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
                How Revision Works
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
                        { queue: 'new' as Queue, icon: '🟦', body: 'Cards you have added to revision but never studied yet. They enter the session for the first time today.' },
                        { queue: 'learning' as Queue, icon: '🟥', body: 'Cards you answered "Again" — they failed and need to be relearned. They cycle back until you get them right.' },
                        { queue: 'review' as Queue, icon: '🟩', body: 'Cards you learned in a previous session. The algorithm scheduled them today because your memory is starting to fade. Answer correctly and the interval doubles or triples. Fail and the card lapses back to Learning.' },
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
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: cfg.color, mb: 0.25 }}>
                                        {cfg.label}
                                    </Typography>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.83rem', color: '#5a4e47', lineHeight: 1.55 }}>
                                        {body}
                                    </Typography>
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
                        { label: 'Again', color: '#c62828', desc: 'You forgot. Card goes back to Learning and returns within a few cards.' },
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
                }}>
                    Got it
                </Button>
            </DialogActions>
        </Dialog>
    )
}

/* ─────────────────────────────────────────────
   AnimatedArabicWord
───────────────────────────────────────────── */
function AnimatedArabicWord({ word, wordDiacritic, showDiacritics }: {
    word: string; wordDiacritic: string; showDiacritics: boolean
}) {
    return (
        <Box sx={{
            position: 'relative', textAlign: 'center',
            margin: '0.5rem 0 1.5rem',
            height: { xs: 'clamp(3.2rem, 13vw, 4.5rem)', md: 'clamp(3.8rem, 11vw, 7.5rem)' },
        }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: showDiacritics ? 0 : 1, transition: 'opacity 0.25s', pointerEvents: showDiacritics ? 'none' : 'auto' }}>
                <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: 'clamp(2.4rem, 13vw, 3.8rem)', md: 'clamp(3.3rem, 11vw, 6rem)' }, fontWeight: 700, direction: 'rtl', textAlign: 'center', color: '#2c1a0e', lineHeight: 1.2 }}>
                    {word}
                </Typography>
            </Box>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: showDiacritics ? 1 : 0, transition: 'opacity 0.25s', pointerEvents: showDiacritics ? 'auto' : 'none' }}>
                <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: 'clamp(2.4rem, 13vw, 3.8rem)', md: 'clamp(3.3rem, 11vw, 6rem)' }, fontWeight: 700, direction: 'rtl', textAlign: 'center', color: '#0e2e1f', lineHeight: 1.2 }}>
                    {wordDiacritic}
                </Typography>
            </Box>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   CardFace
───────────────────────────────────────────── */
function CardFace({
    sessionCard, counts, doneCount, totalCount,
    showDiacritics, onAnswer, submitting,
}: {
    sessionCard: SessionCard
    counts: Record<Queue, number>
    doneCount: number
    totalCount: number
    showDiacritics: boolean
    onAnswer: (a: Answer) => void
    submitting: boolean
}) {
    const [revealed, setRevealed] = useState(false)
    const card = sessionCard.data
    const examples = parseExamples(card)
    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

    return (
        <Box sx={{
            background: '#fff', border: '1px solid rgba(184,134,11,0.2)',
            borderRadius: '10px', padding: { xs: '1.25rem 0.875rem', md: '2rem 1.5rem 1.75rem' },
            minHeight: { xs: '300px', md: '340px' }, display: 'flex', flexDirection: 'column',
        }}>
            {/* Progress bar */}
            <Box sx={{ height: '2px', background: 'rgba(184,134,11,0.1)', borderRadius: '999px', mb: '1.25rem', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', background: 'linear-gradient(90deg, #b8860b, #d4a843)', borderRadius: '999px', transition: 'width 0.4s ease', width: `${progress}%` }} />
            </Box>

            {/* Chips + % */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <BucketChips counts={counts} currentQueue={sessionCard.queue} />
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: '#b8860b', flexShrink: 0, ml: 1 }}>
                    {progress}%
                </Typography>
            </Box>

            {/* Card body */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ pt: { xs: 2, md: 3 } }}>
                    <AnimatedArabicWord word={card.word} wordDiacritic={card.word_diacritic} showDiacritics={showDiacritics} />
                </Box>

                <Collapse in={revealed} timeout={300}>
                    <Box sx={{ borderTop: '1px solid rgba(184,134,11,0.1)', margin: '1rem 0' }} />

                    <Box sx={{ textAlign: 'center', mb: { xs: 0.5, md: 1 } }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Jost, sans-serif', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', background: 'rgba(122,110,101,0.08)', color: '#7a6e65' }}>
                            {card.type}
                        </Box>
                    </Box>

                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: 'clamp(1.1rem, 2.2vw, 1.45rem)' }, fontStyle: 'italic', color: '#b8860b', textAlign: 'center', letterSpacing: '0.05em', mt: { xs: 1, md: 1.5 } }}>
                        {card.transliteration}
                    </Typography>

                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: 'clamp(1.8rem, 4.5vw, 2.8rem)' }, fontWeight: 700, color: '#2c1a0e', textAlign: 'center', margin: '0.25rem 0' }}>
                        {card.definition}
                    </Typography>

                    {card.root && card.root !== '-' && (
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: 'clamp(0.9rem, 1.6vw, 1.2rem)' }, color: '#7a6e65', textAlign: 'center', direction: 'rtl', opacity: 0.75, mb: 0.5, letterSpacing: '0.04em' }}>
                            {card.root}
                        </Typography>
                    )}

                    {examples.length > 0 && (
                        <Box sx={{ background: 'rgba(245,237,224,0.5)', borderRadius: '8px', padding: { xs: '1rem', sm: '1.25rem' }, margin: '1.25rem 0 0.5rem', borderLeft: '3px solid #b8860b', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {examples.slice(0, 2).map((ex, i) => (
                                <Box key={i} sx={{ ...(i > 0 && { borderTop: '1px solid rgba(184,134,11,0.12)', pt: 1.5 }) }}>
                                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: 'clamp(1.2rem, 3vw, 1.6rem)', sm: 'clamp(1.35rem, 3vw, 1.85rem)' }, color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.5, mb: 0.35 }}>
                                        {showDiacritics ? ex.diacritic : ex.arabic}
                                    </Typography>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: 'clamp(0.9rem, 2vw, 1.1rem)', sm: 'clamp(1rem, 2vw, 1.25rem)' }, color: '#7a6e65', fontStyle: 'italic', textAlign: 'left', lineHeight: 1.5 }}>
                                        {ex.english}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* Answer buttons */}
                    <Box sx={{ mt: { xs: '1.25rem', md: '1.5rem' } }}>
                        {/* Desktop */}
                        <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            {ANSWER_BUTTONS.map(btn => (
                                <Button key={btn.value} variant="outlined" disabled={submitting} onClick={() => onAnswer(btn.value)} sx={{ color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', textTransform: 'none', borderRadius: '6px', padding: '0.6rem 0.5rem', border: `1.5px solid ${btn.border}`, background: 'transparent', '&:hover': { background: btn.hoverBg, borderColor: btn.color }, '&:disabled': { opacity: 0.45 } }}>
                                    {btn.label}
                                </Button>
                            ))}
                        </Box>
                        {/* Mobile */}
                        <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: '7px', justifyContent: 'center' }}>
                            {ANSWER_BUTTONS.map(btn => (
                                <Button key={btn.value} variant="outlined" disabled={submitting} onClick={() => onAnswer(btn.value)} sx={{ color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.78rem', textTransform: 'none', borderRadius: '20px', padding: '4px 10px', minWidth: 0, lineHeight: 1.4, border: `1.5px solid ${btn.border}`, background: 'transparent', flexShrink: 1, '&:hover': { background: btn.hoverBg, borderColor: btn.color }, '&:disabled': { opacity: 0.45 } }}>
                                    {btn.label}
                                </Button>
                            ))}
                        </Box>
                    </Box>
                </Collapse>

                {/* Show answer */}
                {!revealed && (
                    <Box sx={{ mt: 'auto', pt: { xs: 0, md: 4 }, width: '100%' }}>
                        <Button fullWidth variant="outlined" onClick={() => setRevealed(true)} sx={{ padding: '0.875rem', border: '1px solid rgba(184,134,11,0.3)', borderRadius: '6px', color: '#2c1a0e', fontFamily: 'Jost, sans-serif', fontSize: { xs: 'clamp(1rem, 1.6vw, 1.2rem)' }, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'none', transition: 'background 0.15s, border-color 0.15s, transform 0.2s', '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: 'rgba(184,134,11,0.5)', transform: 'translateY(-1px)' } }}>
                            Show answer
                        </Button>
                    </Box>
                )}
            </Box>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function RevisionPage() {
    const router = useRouter()
    const [rawCards, setRawCards] = useState<RevisionCard[]>([])
    const [loading, setLoading] = useState(true)
    const [showDiacritics, setShowDiacritics] = useState(true)
    const [infoOpen, setInfoOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [sessionStarted, setSessionStarted] = useState(false)

    const initialDeck = useMemo<SessionCard[]>(() => rawCards.map(card => ({
        data: card, queue: classifyCard(card), lapses: 0,
    })), [rawCards])

    const { deck, currentCard, counts, doneCount, totalEver, isComplete, answer } = useAnkiQueue(initialDeck)

    // Remount CardFace whenever the card at the top of the deck changes
    const cardKeyRef = useRef(0)
    const prevCardId = useRef<string | number | null>(null)
    const currentId = currentCard ? ((currentCard.data as any).id ?? currentCard.data.word) : null
    if (currentId !== prevCardId.current) {
        cardKeyRef.current++
        prevCardId.current = currentId
    }

    const loadCards = useCallback(async () => {
        setLoading(true)
        try {
            const due = await fetchDueRevisionCards()
            setRawCards(due)
            setSessionStarted(true)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadCards() }, [loadCards])

    const handleAnswer = useCallback(async (ans: Answer) => {
        if (!currentCard || submitting) return
        setSubmitting(true)
        try {
            await submitRevisionAnswer(currentCard.data.progress_word_id, ans, 0)
            answer(ans)
        } catch (err) {
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }, [currentCard, submitting, answer])

    /* ── Loading ── */
    if (loading) {
        return (
            <>
                <Navbar />
                <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh' }}>
                    <Box sx={{ display: { xs: 'none', sm: 'block' }, background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)', pt: { sm: 12 }, pb: { sm: 4 } }}>
                        <Container maxWidth="lg">
                            <Skeleton variant="text" width={200} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
                            <Skeleton variant="rounded" height={8} width={320} sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 4, mt: 1.5 }} />
                        </Container>
                    </Box>
                    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4, md: 6 }, pt: { xs: 10, sm: 4 } }}>
                        <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '1.25rem 0.875rem', md: '2rem 1.5rem 1.75rem' }, minHeight: { xs: '300px', md: '340px' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Skeleton variant="rounded" height={2} sx={{ mb: 2 }} />
                            <Skeleton variant="rounded" height={24} width={220} />
                            <Skeleton variant="rounded" height={88} width="55%" sx={{ mx: 'auto', mt: 1 }} />
                            <Skeleton variant="rounded" height={32} width="30%" sx={{ mx: 'auto' }} />
                            <Skeleton variant="rounded" height={44} width="100%" sx={{ mt: 'auto' }} />
                        </Box>
                    </Container>
                </Box>
            </>
        )
    }

    /* ── Session complete ── */
    if (isComplete || (sessionStarted && rawCards.length === 0)) {
        return (
            <>
                <Navbar />
                <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh' }}>
                    <Box sx={{ display: { xs: 'none', sm: 'block' }, background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)', pt: { sm: 12 }, pb: { sm: 4 }, position: 'relative', overflow: 'hidden' }}>
                        <Typography aria-hidden="true" sx={{ position: 'absolute', top: -30, right: -10, fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: { sm: '11rem', md: '15rem' }, color: 'rgba(255,255,255,0.03)', userSelect: 'none', lineHeight: 1 }}>م</Typography>
                        <Container maxWidth="lg">
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { sm: '2.6rem', md: '3.8rem' }, fontWeight: 700, color: '#f5ede0', lineHeight: 1.1, mb: 1.5 }}>Revision</Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { sm: '1rem', md: '1.1rem' }, color: 'rgba(245,237,224,0.55)' }}>Spaced repetition review</Typography>
                        </Container>
                    </Box>
                    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 }, pt: { xs: 12, sm: 6 } }}>
                        <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '2.5rem 1.5rem', md: '3rem 2rem' }, textAlign: 'center' }}>
                            <CheckCircle sx={{ fontSize: { xs: 52, md: 64 }, color: '#2e7d32', mb: 2 }} />
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: '1.8rem', md: '2.2rem' }, fontWeight: 700, color: '#2c1a0e', mb: 1 }}>Session Complete</Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.95rem', md: '1.05rem' }, color: '#7a6e65', mb: 3 }}>
                                {rawCards.length === 0 ? 'No cards are due for review today. Check back tomorrow!' : 'You have reviewed all due cards for today. Great work!'}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                <Button variant="outlined" onClick={loadCards} startIcon={<Refresh />} sx={{ borderColor: 'rgba(184,134,11,0.3)', color: '#2c1a0e', fontFamily: 'Jost, sans-serif', fontWeight: 500, textTransform: 'none', borderRadius: '6px', px: 3, '&:hover': { borderColor: '#b8860b', background: 'rgba(184,134,11,0.05)' } }}>Check again</Button>
                                <Button variant="outlined" startIcon={<ArrowBackSharp />} onClick={() => router.back()} sx={{ borderColor: 'rgba(122,110,101,0.3)', color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontWeight: 500, textTransform: 'none', borderRadius: '6px', px: 3, '&:hover': { borderColor: '#7a6e65', background: 'rgba(122,110,101,0.05)' } }}>Back</Button>
                            </Box>
                        </Box>
                    </Container>
                </Box>
            </>
        )
    }

    /* ── Quiz ── */
    return (
        <>
            <Navbar />
            <InfoDialog open={infoOpen} onClose={() => setInfoOpen(false)} />

            <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh' }}>

                {/* Banner — desktop only */}
                <Box sx={{ display: { xs: 'none', sm: 'block' }, background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)', pt: { sm: 12 }, pb: { sm: 4 }, position: 'relative', overflow: 'hidden' }}>
                    <Typography aria-hidden="true" sx={{ position: 'absolute', top: -30, right: -10, fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: { sm: '11rem', md: '15rem' }, color: 'rgba(255,255,255,0.03)', userSelect: 'none', lineHeight: 1 }}>م</Typography>
                    <Container maxWidth="lg">
                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { sm: '2.6rem', md: '3.8rem' }, fontWeight: 700, color: '#f5ede0', lineHeight: 1.1, mb: 2 }}>Revision</Typography>
                        <Box sx={{ width: '100%', maxWidth: { sm: 400 }, mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { sm: '0.95rem', md: '1.1rem' }, color: 'rgba(245,237,224,0.7)', fontWeight: 500 }}>Session progress</Typography>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { sm: '0.95rem', md: '1.1rem' }, color: '#d4a843', fontWeight: 600 }}>{doneCount} / {totalEver}</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={totalEver > 0 ? Math.round((doneCount / totalEver) * 100) : 0} sx={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #b8860b 0%, #d4a843 100%)', borderRadius: 4 } }} />
                        </Box>
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { sm: '1rem', md: '1.2rem' }, color: 'rgba(245,237,224,0.55)', lineHeight: 1.7 }}>
                            {totalEver} card{totalEver !== 1 ? 's' : ''} due for review today
                        </Typography>
                    </Container>
                </Box>

                {/* Content */}
                <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 6 }, pt: { xs: 10, sm: 4, md: 6 } }}>

                    {/* Toolbar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 3, md: 4 } }}>
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, color: '#2c1a0e', fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Revision</Box>
                            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Spaced repetition</Box>
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                            <IconButton onClick={() => setInfoOpen(true)} size="small" sx={{ color: '#7a6e65', border: '1px solid rgba(122,110,101,0.25)', borderRadius: '50%', width: { xs: 30, sm: 34 }, height: { xs: 30, sm: 34 }, transition: 'all 0.15s', '&:hover': { color: '#b8860b', borderColor: 'rgba(184,134,11,0.4)', background: 'rgba(184,134,11,0.06)' } }}>
                                <InfoOutlined sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }} />
                            </IconButton>
                            <PillToggle enabled={showDiacritics} onToggle={() => setShowDiacritics(p => !p)} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                        </Box>
                    </Box>

                    {/* Card */}
                    {currentCard && (
                        <CardFace
                            key={cardKeyRef.current}
                            sessionCard={currentCard}
                            counts={counts}
                            doneCount={doneCount}
                            totalCount={totalEver}
                            showDiacritics={showDiacritics}
                            onAnswer={handleAnswer}
                            submitting={submitting}
                        />
                    )}
                </Container>
            </Box>
        </>
    )
}