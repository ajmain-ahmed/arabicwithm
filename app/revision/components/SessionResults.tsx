'use client'

import { Box, Container, Typography, Button, Chip } from '@mui/material'
import { CheckCircle, Star, Timer } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { type ExtendedSessionLog, type SessionMode, type Queue, QUEUE_CONFIG, classifyCard } from '../types'
import type { RevisionCard } from '@/app/actions/revision'

interface SessionResultsProps {
    logs: ExtendedSessionLog[]
    priorCompleted: RevisionCard[]
    onRestart: () => void
    isLoading?: boolean
    sessionMode?: SessionMode | null
}

export default function SessionResults({
    logs,
    priorCompleted,
    onRestart,
    isLoading = false,
    sessionMode,
}: SessionResultsProps) {
    const router = useRouter()
    const isDaily = sessionMode === 'daily'

    /* ── Merge data ── */
    const totalCards = isDaily ? priorCompleted.length + logs.length : logs.length
    const totalPoints = logs.reduce((sum, l) => sum + (l.cardPoints ?? 0), 0)

    // Rating counts
    const ratingCounts = { again: 0, hard: 0, good: 0, easy: 0 }
    if (isDaily) priorCompleted.forEach(c => { if (c.lastRating) ratingCounts[c.lastRating]++ })
    logs.forEach(l => ratingCounts[l.rating]++)

    const correct = ratingCounts.hard + ratingCounts.good + ratingCounts.easy
    const accuracy = totalCards > 0 ? Math.round((correct / totalCards) * 100) : 0

    // Queue counts (daily only)
    const queueCounts: Record<Queue, number> = { new: 0, learning: 0, review: 0 }
    if (isDaily) {
        priorCompleted.forEach(c => { queueCounts[classifyCard(c)]++ })
        logs.forEach(l => { if (l.queue) queueCounts[l.queue as Queue]++ })
    }

    // Themes
    const themes = new Set<string>()
    if (isDaily) priorCompleted.forEach(c => { if (c.theme_name) themes.add(c.theme_name) })
    logs.forEach(l => { if (l.theme) themes.add(l.theme) })

    // Time distribution (custom only)
    const timeBuckets = { fast: 0, normal: 0, slow: 0, verySlow: 0 }
    logs.forEach(l => {
        if (l.timeTaken <= 2) timeBuckets.fast++
        else if (l.timeTaken <= 5) timeBuckets.normal++
        else if (l.timeTaken <= 10) timeBuckets.slow++
        else timeBuckets.verySlow++
    })

    // Rating label
    let ratingLabel = 'Keep Practicing'
    let ratingColor = '#c62828'
    let ratingBg = 'rgba(198,40,40,0.08)'
    if (accuracy >= 90) { ratingLabel = 'Outstanding!'; ratingColor = '#1565c0'; ratingBg = 'rgba(21,101,192,0.08)' }
    else if (accuracy >= 75) { ratingLabel = 'Great Work'; ratingColor = '#2e7d32'; ratingBg = 'rgba(46,125,50,0.08)' }
    else if (accuracy >= 60) { ratingLabel = 'Good Progress'; ratingColor = '#b8860b'; ratingBg = 'rgba(184,134,11,0.08)' }
    else if (accuracy >= 40) { ratingLabel = 'Keep Practicing'; ratingColor = '#e65100'; ratingBg = 'rgba(230,81,0,0.08)' }

    const circumference = 2 * Math.PI * 52
    const strokeDashoffset = circumference - (accuracy / 100) * circumference
    const maxRatingCount = Math.max(1, ...Object.values(ratingCounts))
    const totalQueue = queueCounts.new + queueCounts.learning + queueCounts.review

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
                    {/* Title */}
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: { xs: '1.8rem', md: '2.4rem' },
                        fontWeight: 700,
                        color: '#2c1a0e',
                        mb: 0.5,
                    }}>
                        {isDaily ? 'Session Complete!' : 'Practice Complete!'}
                    </Typography>

                    {/* Badge */}
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

                    {/* Hero row: accuracy ring + points */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: { xs: 4, md: 6 },
                        mb: 4,
                        flexWrap: 'wrap',
                    }}>
                        {/* Accuracy ring */}
                        <Box sx={{ position: 'relative', width: 140, height: 140 }}>
                            <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(184,134,11,0.12)" strokeWidth="8" />
                                <circle
                                    cx="60" cy="60" r="52" fill="none" stroke="url(#accuracyGrad)"
                                    strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
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
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '2rem', fontWeight: 800,
                                    color: '#2c1a0e', lineHeight: 1,
                                }}>
                                    {accuracy}%
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.72rem', fontWeight: 600,
                                    color: '#9e8a7a', textTransform: 'uppercase',
                                    letterSpacing: '0.06em', mt: 0.5,
                                }}>
                                    accuracy
                                </Typography>
                            </Box>
                        </Box>

                        {/* Points */}
                        <Box sx={{ textAlign: 'left' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Star sx={{ fontSize: 32, color: '#b8860b' }} />
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '2.5rem', fontWeight: 800,
                                    color: '#2c1a0e', lineHeight: 1,
                                }}>
                                    {totalPoints}
                                </Typography>
                            </Box>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.72rem', fontWeight: 600,
                                color: '#9e8a7a', textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}>
                                Total Points
                            </Typography>
                        </Box>
                    </Box>

                    {/* Hero card count */}
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: { xs: '2rem', md: '2.6rem' },
                        fontWeight: 700,
                        color: '#2c1a0e',
                        mb: 0.5,
                    }}>
                        {totalCards}
                    </Typography>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.85rem',
                        color: '#9e8a7a',
                        mb: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                    }}>
                        {isDaily ? 'cards completed today' : 'cards practiced'}
                    </Typography>

                    {/* ── Rating distribution bars ── */}
                    <Box sx={{ textAlign: 'left', mb: 4 }}>
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.72rem', fontWeight: 600,
                            color: '#9e8a7a', textTransform: 'uppercase',
                            letterSpacing: '0.1em', mb: 2,
                        }}>
                            Rating Breakdown
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            {([
                                { key: 'again' as const, label: 'Again', color: '#c62828' },
                                { key: 'hard' as const, label: 'Hard', color: '#e65100' },
                                { key: 'good' as const, label: 'Good', color: '#2e7d32' },
                                { key: 'easy' as const, label: 'Easy', color: '#1565c0' },
                            ]).map(({ key, label, color }) => {
                                const count = ratingCounts[key]
                                const pct = (count / maxRatingCount) * 100
                                return (
                                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '0.8rem', fontWeight: 600,
                                            color, width: 48, flexShrink: 0, textAlign: 'right',
                                        }}>
                                            {label}
                                        </Typography>
                                        <Box sx={{ flex: 1, height: 8, background: 'rgba(122,110,101,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                                                style={{ height: '100%', background: color, borderRadius: '999px' }}
                                            />
                                        </Box>
                                        <Typography sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '0.85rem', fontWeight: 700,
                                            color: '#2c1a0e', width: 28, flexShrink: 0, textAlign: 'left',
                                        }}>
                                            {count}
                                        </Typography>
                                    </Box>
                                )
                            })}
                        </Box>
                    </Box>

                    {/* ── DAILY: Queue composition strip ── */}
                    {isDaily && totalQueue > 0 && (
                        <Box sx={{ textAlign: 'left', mb: 4 }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.72rem', fontWeight: 600,
                                color: '#9e8a7a', textTransform: 'uppercase',
                                letterSpacing: '0.1em', mb: 1.5,
                            }}>
                                Queue Mix
                            </Typography>
                            <Box sx={{
                                display: 'flex',
                                height: 10,
                                borderRadius: '999px',
                                overflow: 'hidden',
                                background: 'rgba(122,110,101,0.06)',
                                mb: 1,
                            }}>
                                {(['new', 'learning', 'review'] as Queue[]).map(q => {
                                    const count = queueCounts[q]
                                    if (count === 0) return null
                                    const pct = (count / totalQueue) * 100
                                    const cfg = QUEUE_CONFIG[q]
                                    return (
                                        <motion.div
                                            key={q}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                                            style={{ height: '100%', background: cfg.color, opacity: 0.85 }}
                                        />
                                    )
                                })}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {(['new', 'learning', 'review'] as Queue[]).map(q => {
                                    const count = queueCounts[q]
                                    if (count === 0) return null
                                    const cfg = QUEUE_CONFIG[q]
                                    return (
                                        <Box key={q} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                                            <Typography sx={{
                                                fontFamily: 'Jost, sans-serif',
                                                fontSize: '0.78rem',
                                                color: '#7a6e65',
                                            }}>
                                                {count} {cfg.label}
                                            </Typography>
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* ── CUSTOM: Speed breakdown ── */}
                    {!isDaily && logs.length > 0 && (
                        <Box sx={{ textAlign: 'left', mb: 4 }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.72rem', fontWeight: 600,
                                color: '#9e8a7a', textTransform: 'uppercase',
                                letterSpacing: '0.1em', mb: 1.5,
                            }}>
                                Speed
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                {([
                                    { key: 'fast' as const, label: 'Fast ≤2s', color: '#2e7d32', count: timeBuckets.fast },
                                    { key: 'normal' as const, label: 'Normal 3-5s', color: '#b8860b', count: timeBuckets.normal },
                                    { key: 'slow' as const, label: 'Slow 6-10s', color: '#e65100', count: timeBuckets.slow },
                                    { key: 'verySlow' as const, label: 'Very Slow >10s', color: '#c62828', count: timeBuckets.verySlow },
                                ]).map(({ label, color, count }) => {
                                    const pct = logs.length > 0 ? (count / logs.length) * 100 : 0
                                    return (
                                        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Timer sx={{ fontSize: 16, color, flexShrink: 0 }} />
                                            <Typography sx={{
                                                fontFamily: 'Jost, sans-serif',
                                                fontSize: '0.8rem', fontWeight: 500,
                                                color: '#7a6e65', width: 90, flexShrink: 0, textAlign: 'right',
                                            }}>
                                                {label}
                                            </Typography>
                                            <Box sx={{ flex: 1, height: 8, background: 'rgba(122,110,101,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                                                    style={{ height: '100%', background: color, borderRadius: '999px', opacity: 0.8 }}
                                                />
                                            </Box>
                                            <Typography sx={{
                                                fontFamily: 'Jost, sans-serif',
                                                fontSize: '0.85rem', fontWeight: 700,
                                                color: '#2c1a0e', width: 28, flexShrink: 0, textAlign: 'left',
                                            }}>
                                                {count}
                                            </Typography>
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* ── Themes ── */}
                    {themes.size > 0 && (
                        <Box sx={{ textAlign: 'left', mb: 4 }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.72rem', fontWeight: 600,
                                color: '#9e8a7a', textTransform: 'uppercase',
                                letterSpacing: '0.08em', mb: 1.5,
                            }}>
                                {isDaily ? 'Studied Today' : 'Themes Practiced'}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {Array.from(themes).map(t => (
                                    <Chip key={t} label={t} size="small" sx={{
                                        background: 'rgba(184,134,11,0.08)',
                                        border: '1px solid rgba(184,134,11,0.2)',
                                        color: '#7a6e65',
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.8rem',
                                    }} />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* ── Actions ── */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            onClick={onRestart}
                            disabled={isLoading}
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
                            {isLoading ? 'Loading…' : isDaily ? 'Back to Revision' : 'Practice Again'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => router.push('/flashcards')}
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
                            To Flashcards
                        </Button>
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}