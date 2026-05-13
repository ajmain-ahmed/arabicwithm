'use client'

import { Box, Container, Typography, Button, Chip, Grid } from '@mui/material'
import { CheckCircle, Star } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { type ExtendedSessionLog, type SessionMode } from '../types'

export default function SessionResults({
    logs,
    onRestart,
    isLoading = false,
    sessionMode,
}: {
    logs: ExtendedSessionLog[]
    onRestart: () => void
    isLoading?: boolean
    sessionMode?: SessionMode | null
}) {
    const router = useRouter()
    const totalPoints = logs.reduce((sum, l) => sum + (l.cardPoints ?? 0), 0)
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

    const themes = [...new Set(logs.map(l => l.theme).filter(Boolean))]
    const levels = [...new Set(logs.map(l => l.level).filter(Boolean))]

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

    const statItems = [
        { label: 'Total Cards', value: total, color: '#2c1a0e' },
        { label: 'Avg Time', value: `${avgTime}s`, color: '#7a6e65' },
        { label: 'Themes', value: themes.length, color: '#b8860b' },
        { label: 'Levels', value: levels.length, color: '#b8860b' },
        ...(sessionMode === 'daily' ? [
            { label: 'New Cards', value: newCards, color: '#1565c0' },
            { label: 'Reviewed', value: reviewCards, color: '#2e7d32' },
        ] : []),
    ]

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
                        Session Complete!
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
                        mb: 3,
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

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                        <Star sx={{ fontSize: 28, color: '#b8860b' }} />
                        <Box sx={{ textAlign: 'left' }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: '#2c1a0e', lineHeight: 1 }}>
                                {totalPoints}
                            </Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: '#9e8a7a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Total Points
                            </Typography>
                        </Box>
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {statItems.map((stat) => (
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

                    {themes.length > 0 && (
                        <Box sx={{ textAlign: 'left', mb: 3 }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: '#9e8a7a',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                mb: 1.5,
                            }}>
                                Themes
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {themes.map(t => (
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

                    {levels.length > 0 && (
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
                                Levels
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {levels.map(l => (
                                    <Chip key={l} label={l} size="small" sx={{
                                        background: 'rgba(21,101,192,0.08)',
                                        border: '1px solid rgba(21,101,192,0.2)',
                                        color: '#1565c0',
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.8rem',
                                    }} />
                                ))}
                            </Box>
                        </Box>
                    )}

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
                            {isLoading ? 'Loading…' : 'Back to Revision'}
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
