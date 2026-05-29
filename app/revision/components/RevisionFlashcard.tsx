'use client'

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import {
    Box, Typography, Button, Collapse, Tooltip,
} from '@mui/material'
import { useMediaQuery } from '@mui/material'
import { motion } from 'framer-motion'
import { type SessionCard, type Queue, type ModeConfig, parseExamples } from '../types'
import IntegratedProgressDots from './IntegratedProgressDots'
import BucketChips from './BucketChips'
import AnimatedArabicWord from './AnimatedArabicWord'
import DefinitionPanel from './DefinitionPanel'
import ExampleSentences from './ExampleSentences'
import MorphologyPanel from './MorphologyPanel'
import CartoonContextPanel from './CartoonContextPanel'
import type { Answer } from '@/app/actions/revision'
import { computeAnswerResult } from '@/app/lib/sm2'
import { stripDiacritics } from '@/app/lib/arabic'
import { Replay, TrendingFlat, Check, TrendingUp } from '@mui/icons-material'

const ANSWER_BUTTONS: { label: string; value: Answer; color: string; hoverBg: string; border: string; icon: React.ReactNode }[] = [
    { label: 'Again', value: 'again', color: '#c62828', hoverBg: 'rgba(198,40,40,0.06)', border: 'rgba(198,40,40,0.4)', icon: <Replay sx={{ fontSize: '1rem' }} /> },
    { label: 'Hard', value: 'hard', color: '#e65100', hoverBg: 'rgba(230,81,0,0.06)', border: 'rgba(230,81,0,0.4)', icon: <TrendingFlat sx={{ fontSize: '1rem' }} /> },
    { label: 'Good', value: 'good', color: '#2e7d32', hoverBg: 'rgba(46,125,50,0.06)', border: 'rgba(46,125,50,0.4)', icon: <Check sx={{ fontSize: '1rem' }} /> },
    { label: 'Easy', value: 'easy', color: '#1565c0', hoverBg: 'rgba(21,101,192,0.06)', border: 'rgba(21,101,192,0.4)', icon: <TrendingUp sx={{ fontSize: '1rem' }} /> },
]

const tabButtonSx = {
    fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', fontWeight: 500,
    textTransform: 'none', borderRadius: '20px', px: 2, py: 0.5, minWidth: 70, border: '1px solid',
}

function formatInterval(days: number): string {
    if (days === 0) return '< 1 day'
    if (days === 1) return '1 day'
    if (days < 30) return `${days} days`
    const months = Math.round(days / 30)
    if (months === 1) return '1 month'
    if (months < 12) return `${months} months`
    const years = Math.round(days / 365)
    return years === 1 ? '1 year' : `${years} years`
}

function getIntervalLabel(card: SessionCard, answer: Answer): string {
    const result = computeAnswerResult({
        repetitions: card.data.repetitions,
        interval_days: card.data.interval_days,
        ease_factor: card.data.ease_factor,
        lapses: card.data.lapses ?? 0,
    }, answer)
    if (!result.nextReview) {
        if (answer === 'again') return '< 15m'
        return '< 15m'
    }
    const diffMs = result.nextReview.getTime() - Date.now()
    const diffMins = diffMs / (1000 * 60)
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    if (diffMins < 60) return `< ${Math.ceil(diffMins)}m`
    if (diffHours < 24) return `< ${Math.ceil(diffHours)}h`
    return formatInterval(Math.round(diffDays))
}

export default function RevisionFlashcard({
    sessionCard, counts, showDiacritics, onAnswer, textScale,
    dotOrder, answeredDots, againPendingIds, totalEver, doneCount,
    uniqueDoneCount, uniqueTotal,
    dialogsOpen = false,
    modeConfig,
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
    uniqueDoneCount: number
    uniqueTotal: number
    dialogsOpen?: boolean
    modeConfig: ModeConfig
}) {
    const [revealed, setRevealed] = useState(false)
    const [activeTab, setActiveTab] = useState<'definition' | 'examples' | 'forms' | 'cartoon'>('definition')
    const [elapsed, setElapsed] = useState(0)
    const [timerRunning, setTimerRunning] = useState(false)
    const [rapidFireCountdown, setRapidFireCountdown] = useState(5)

    const cardStartRef = useRef<number>(Date.now())
    const revealTimeRef = useRef<number>(0)
    const wasPausedByDialog = useRef(false)
    const accumulatedRef = useRef(0)
    const rapidFireIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const card = sessionCard.data
    const examples = parseExamples(card)
    const progress = uniqueTotal > 0 ? Math.round((uniqueDoneCount / uniqueTotal) * 100) : 0
    const isMobile = useMediaQuery('(max-width:600px)')

    const hasForms = card.type === 'verb' && !!(card as any).forms
    const [cartoonContexts, setCartoonContexts] = useState<null | any[]>(null)

    useEffect(() => {
        let cancelled = false
        fetch('/cartoon-word-context.json')
            .then(r => r.json())
            .then(map => {
                if (!cancelled) setCartoonContexts(map[stripDiacritics(card.word)] ?? [])
            })
            .catch(() => {
                if (!cancelled) setCartoonContexts([])
            })
        return () => { cancelled = true }
    }, [card.word])

    /* ── Card change: reset everything ── */
    useLayoutEffect(() => {
        setRevealed(false)
        setActiveTab('definition')
        cardStartRef.current = Date.now()
        accumulatedRef.current = 0
        setElapsed(0)
        setRapidFireCountdown(5)
        wasPausedByDialog.current = false
        setTimerRunning(true)
    }, [card.id ?? card.word])

    /* ── Pause/resume when dialogs open/close ── */
    useEffect(() => {
        if (dialogsOpen) {
            if (timerRunning) {
                wasPausedByDialog.current = true
                accumulatedRef.current += Date.now() - cardStartRef.current
                setTimerRunning(false)
            }
        } else {
            if (wasPausedByDialog.current && !revealed) {
                cardStartRef.current = Date.now()
                setTimerRunning(true)
            }
            wasPausedByDialog.current = false
        }
    }, [dialogsOpen, revealed, timerRunning])

    /* ── Tick timer ── */
    useEffect(() => {
        if (!timerRunning) return
        const interval = setInterval(() => {
            const currentRun = Date.now() - cardStartRef.current
            setElapsed(Math.round((accumulatedRef.current + currentRun) / 1000))
        }, 1000)
        return () => clearInterval(interval)
    }, [timerRunning])

    const handleReveal = () => {
        setRevealed(true)
        setTimerRunning(false)
        const currentRun = Date.now() - cardStartRef.current
        revealTimeRef.current = Math.round((accumulatedRef.current + currentRun) / 1000)
    }

    const handleAnswer = (ans: Answer) => {
        const timeTaken = revealTimeRef.current || elapsed
        onAnswer(ans, timeTaken)
    }

    const handleAnswerRef = useRef(handleAnswer)
    useEffect(() => { handleAnswerRef.current = handleAnswer }, [handleAnswer])

    /* ── Rapid Fire countdown ── */
    useEffect(() => {
        if (!modeConfig.rapidFire || revealed) return
        if (dialogsOpen) return
        setRapidFireCountdown(5)
        const interval = setInterval(() => {
            setRapidFireCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    handleAnswerRef.current('again')
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        rapidFireIntervalRef.current = interval
        return () => {
            if (rapidFireIntervalRef.current) clearInterval(rapidFireIntervalRef.current)
        }
    }, [modeConfig.rapidFire, sessionCard.dotId, revealed, dialogsOpen])

    /* ── Keyboard shortcuts ── */
    useEffect(() => {
        if (!revealed || dialogsOpen) return
        const keyMap: Record<string, Answer> = {
            '1': 'again', 'a': 'again',
            '2': 'hard', 'h': 'hard',
            '3': 'good', 'g': 'good',
            '4': 'easy', 'e': 'easy',
        }
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            const answer = keyMap[e.key.toLowerCase()]
            if (answer) {
                e.preventDefault()
                handleAnswer(answer)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [revealed, dialogsOpen, handleAnswer])

    /* ── Swipe handlers ── */
    const handleDragEnd = (_: any, info: any) => {
        if (!revealed) return
        const threshold = 60
        const velocityThreshold = 300
        if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
            handleAnswer('good')
        } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
            handleAnswer('again')
        }
    }

    const answerTextSize = `calc(1.5rem * ${textScale})`
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    const easePercent = useMemo(() => {
        const ef = card.ease_factor
        // Map 1.3 (hardest) → 0%, 2.5 (default) → 50%, 3.5+ → 100%
        const pct = Math.min(100, Math.max(0, ((ef - 1.3) / (2.5 - 1.3)) * 50 + 50))
        return Math.round(pct)
    }, [card.ease_factor])

    const cardContent = (
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

                {/* Rapid Fire countdown */}
                {modeConfig.rapidFire && !revealed && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                        <Typography
                            aria-live="polite"
                            aria-atomic="true"
                            sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: rapidFireCountdown <= 2 ? '#c62828' : '#e65100',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                px: 1.5,
                                py: 0.4,
                                borderRadius: '999px',
                                border: '1.5px solid',
                                borderColor: rapidFireCountdown <= 2 ? 'rgba(198,40,40,0.3)' : 'rgba(230,81,0,0.3)',
                                background: rapidFireCountdown <= 2 ? 'rgba(198,40,40,0.06)' : 'rgba(230,81,0,0.06)',
                            }}
                        >
                            {rapidFireCountdown}s
                        </Typography>
                    </Box>
                )}

                <Box sx={{
                    flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: { xs: `${(3.2 * textScale * 1.2).toFixed(1)}rem`, md: `${(3.8 * textScale * 1.2).toFixed(1)}rem` },
                    mb: { xs: '1.5rem', md: '2rem' },
                }}>
                    {modeConfig.reverse && !revealed ? (
                        <Typography sx={{
                            fontFamily: "'EB Garamond', serif",
                            fontSize: `calc(1.8rem * ${textScale})`,
                            fontWeight: 700,
                            color: '#2c1a0e',
                            textAlign: 'center',
                            lineHeight: 1.3,
                            px: 2,
                        }}>
                            {card.definition}
                        </Typography>
                    ) : (
                        <AnimatedArabicWord word={card.word} wordDiacritic={card.word_diacritic} showDiacritics={showDiacritics} textScale={textScale} />
                    )}
                </Box>

                <Box sx={{ mt: 'auto', width: '100%' }}>
                    <Collapse in={revealed} timeout={{ enter: 300, exit: 0 }}>
                        <Box sx={{ borderTop: '1px solid rgba(184,134,11,0.1)', pt: '1rem', mb: '1rem' }} />

                        {/* Ease Factor Meter */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: '#9e8a7a', fontWeight: 500 }}>
                                Difficulty
                            </Typography>
                            <Box sx={{ width: 80, height: 6, background: 'rgba(122,110,101,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                                <Box sx={{
                                    width: `${easePercent}%`, height: '100%',
                                    background: easePercent > 70 ? '#2e7d32' : easePercent > 40 ? '#b8860b' : '#c62828',
                                    borderRadius: '999px', transition: 'width 0.4s ease',
                                }} />
                            </Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: '#7a6e65', fontWeight: 600, minWidth: 28 }}>
                                {card.ease_factor.toFixed(2)}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 0.5, md: 0.75 } }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Jost, sans-serif', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: '999px', background: 'rgba(122,110,101,0.08)', color: '#7a6e65' }}>
                                {card.type}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', py: 1, mb: { xs: 1, md: 1.5 } }}>
                            {modeConfig.reverse && (
                                <Typography component="span" sx={{ fontFamily: "'EB Garamond', serif", fontSize: answerTextSize, fontWeight: 700, color: '#b8860b', lineHeight: 1 }}>{card.word}</Typography>
                            )}
                            {card.transliteration && (
                                <Typography component="span" sx={{ fontFamily: 'Jost, sans-serif', fontSize: answerTextSize, color: '#b8860b', letterSpacing: '0.05em', lineHeight: 1 }}>{card.transliteration}</Typography>
                            )}
                            <Typography component="span" sx={{ fontFamily: "'EB Garamond', serif", fontSize: answerTextSize, fontWeight: 700, color: '#2c1a0e', lineHeight: 1 }}>{card.definition}</Typography>
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                <Button onClick={() => setActiveTab('definition')} sx={{ ...tabButtonSx, background: activeTab === 'definition' ? 'rgba(184,134,11,0.12)' : 'transparent', color: activeTab === 'definition' ? '#b8860b' : '#7a6e65', borderColor: activeTab === 'definition' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)' }}>Definition</Button>
                                <Button onClick={() => setActiveTab('examples')} sx={{ ...tabButtonSx, background: activeTab === 'examples' ? 'rgba(184,134,11,0.12)' : 'transparent', color: activeTab === 'examples' ? '#b8860b' : '#7a6e65', borderColor: activeTab === 'examples' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)' }}>Examples</Button>
                                {hasForms && (
                                    <Button onClick={() => setActiveTab('forms')} sx={{ ...tabButtonSx, background: activeTab === 'forms' ? 'rgba(184,134,11,0.12)' : 'transparent', color: activeTab === 'forms' ? '#b8860b' : '#7a6e65', borderColor: activeTab === 'forms' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)' }}>Forms</Button>
                                )}
                                {cartoonContexts && cartoonContexts.length > 0 && (
                                    <Button onClick={() => setActiveTab('cartoon')} sx={{ ...tabButtonSx, background: activeTab === 'cartoon' ? 'rgba(184,134,11,0.12)' : 'transparent', color: activeTab === 'cartoon' ? '#b8860b' : '#7a6e65', borderColor: activeTab === 'cartoon' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)' }}>Cartoon</Button>
                                )}
                            </Box>
                            {activeTab === 'definition' && <DefinitionPanel card={card} showDiacritics={showDiacritics} textScale={textScale} />}
                            {activeTab === 'examples' && <ExampleSentences examples={examples} showDiacritics={showDiacritics} textScale={textScale} />}
                            {activeTab === 'forms' && <MorphologyPanel card={card} textScale={textScale} />}
                            {activeTab === 'cartoon' && <CartoonContextPanel plainWord={stripDiacritics(card.word)} textScale={textScale} />}
                        </Box>

                        <Box sx={{ mt: { xs: '1.25rem', md: '1.5rem' }, position: 'relative' }}>
                            <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {ANSWER_BUTTONS.map((btn, i) => (
                                    <Button key={btn.value} variant="outlined" onClick={() => handleAnswer(btn.value)} aria-label={`${btn.label} (press ${i + 1})`}
                                        sx={{ color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', textTransform: 'none', borderRadius: '6px', py: '0.4rem', border: `1.5px solid ${btn.border}`, background: 'transparent', '&:hover': { background: btn.hoverBg, borderColor: btn.color }, lineHeight: 1.2 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {btn.icon}
                                                <span>{btn.label}</span>
                                            </Box>
                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.85, lineHeight: 1 }}>
                                                {getIntervalLabel(sessionCard, btn.value)}
                                            </Typography>
                                        </Box>
                                    </Button>
                                ))}
                            </Box>
                            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: '8px' }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {ANSWER_BUTTONS.slice(0, 2).map((btn, i) => (
                                        <Button key={btn.value} variant="outlined" onClick={() => handleAnswer(btn.value)} aria-label={`${btn.label} (press ${i + 1})`}
                                            sx={{ color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', borderRadius: '8px', py: '0.4rem', border: `1.5px solid ${btn.border}`, background: 'transparent', '&:hover': { background: btn.hoverBg, borderColor: btn.color }, lineHeight: 1.2 }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {btn.icon}
                                                    <span>{btn.label}</span>
                                                </Box>
                                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.85, lineHeight: 1 }}>
                                                    {getIntervalLabel(sessionCard, btn.value)}
                                                </Typography>
                                            </Box>
                                        </Button>
                                    ))}
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {ANSWER_BUTTONS.slice(2, 4).map((btn, i) => (
                                        <Button key={btn.value} variant="outlined" onClick={() => handleAnswer(btn.value)} aria-label={`${btn.label} (press ${i + 3})`}
                                            sx={{ color: btn.color, fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', borderRadius: '8px', py: '0.4rem', border: `1.5px solid ${btn.border}`, background: 'transparent', '&:hover': { background: btn.hoverBg, borderColor: btn.color }, lineHeight: 1.2 }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {btn.icon}
                                                    <span>{btn.label}</span>
                                                </Box>
                                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.85, lineHeight: 1 }}>
                                                    {getIntervalLabel(sessionCard, btn.value)}
                                                </Typography>
                                            </Box>
                                        </Button>
                                    ))}
                                </Box>
                            </Box>
                            {isMobile && (
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: '#9e8a7a', textAlign: 'center', mt: 1 }}>
                                    Swipe left → Again · Swipe right → Good
                                </Typography>
                            )}
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

    if (!isMobile) return cardContent

    return (
        <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            style={{ touchAction: 'pan-y' }}
        >
            {cardContent}
        </motion.div>
    )
}
