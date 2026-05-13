'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
    Box, Typography, Button, Collapse,
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { type SessionCard, type Queue, parseExamples } from '../types'
import IntegratedProgressDots from './IntegratedProgressDots'
import BucketChips from './BucketChips'
import AnimatedArabicWord from './AnimatedArabicWord'
import DefinitionPanel from './DefinitionPanel'
import ExampleSentences from './ExampleSentences'
import type { Answer } from '@/app/actions/revision'
import { Replay, TrendingFlat, Check, TrendingUp } from '@mui/icons-material'

const ANSWER_BUTTONS: { label: string; value: Answer; color: string; hoverBg: string; border: string; icon: React.ReactNode }[] = [
    { label: 'Again', value: 'again', color: '#c62828', hoverBg: 'rgba(198,40,40,0.06)', border: 'rgba(198,40,40,0.4)', icon: <Replay sx={{ fontSize: '1rem' }} /> },
    { label: 'Hard', value: 'hard', color: '#e65100', hoverBg: 'rgba(230,81,0,0.06)', border: 'rgba(230,81,0,0.4)', icon: <TrendingFlat sx={{ fontSize: '1rem' }} /> },
    { label: 'Good', value: 'good', color: '#2e7d32', hoverBg: 'rgba(46,125,50,0.06)', border: 'rgba(46,125,50,0.4)', icon: <Check sx={{ fontSize: '1rem' }} /> },
    { label: 'Easy', value: 'easy', color: '#1565c0', hoverBg: 'rgba(21,101,192,0.06)', border: 'rgba(21,101,192,0.4)', icon: <TrendingUp sx={{ fontSize: '1rem' }} /> },
]

const tabButtonSx = {
    fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', fontWeight: 500,
    textTransform: 'none', borderRadius: '20px', px: 2, py: 0.5, minWidth: 80, border: '1px solid',
}

export default function RevisionFlashcard({
    sessionCard, counts, showDiacritics, onAnswer, textScale,
    dotOrder, answeredDots, againPendingIds, totalEver, doneCount,
    lastAnswerPoints, pointsAnimKey, uniqueDoneCount, uniqueTotal,
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
    lastAnswerPoints?: number | null
    pointsAnimKey?: number
    uniqueDoneCount: number
    uniqueTotal: number
}) {
    const [revealed, setRevealed] = useState(false)
    const [activeTab, setActiveTab] = useState<'definition' | 'examples'>('definition')
    const [elapsed, setElapsed] = useState(0)
    const [timerRunning, setTimerRunning] = useState(false)

    const cardStartRef = useRef<number>(Date.now())
    const revealTimeRef = useRef<number>(0)

    const card = sessionCard.data
    const examples = parseExamples(card)
    const progress = uniqueTotal > 0 ? Math.round((uniqueDoneCount / uniqueTotal) * 100) : 0

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

                        <Box sx={{ mt: { xs: '1.25rem', md: '1.5rem' }, position: 'relative' }}>
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
                            <AnimatePresence>
                                {lastAnswerPoints !== null && pointsAnimKey !== undefined && (
                                    <motion.div
                                        key={pointsAnimKey}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: -20 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6 }}
                                        style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', fontWeight: 700, color: '#b8860b', fontFamily: 'Jost, sans-serif', fontSize: '1.2rem', pointerEvents: 'none' }}
                                    >
                                        +{lastAnswerPoints}
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
