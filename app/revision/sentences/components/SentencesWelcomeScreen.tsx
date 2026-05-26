'use client'

import { useState, useEffect, useMemo } from 'react'
import { Box, Typography, Button, Skeleton, CircularProgress } from '@mui/material'
import { motion } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import { fetchSentenceRevisionSession } from '@/app/actions/revision'
import type { SentenceRevisionCard } from '@/app/actions/revision'
import { PlayArrow, Visibility, EditNote } from '@mui/icons-material'

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,700;1,700&family=Jost:wght@300;400;500;600;700&display=swap');
`

interface WelcomeScreenProps {
    onStartDaily: () => void
}

function classifyForCount(card: SentenceRevisionCard): 'new' | 'learning' | 'review' {
    const lastReview = card.last_review_at
    const interval = card.interval_days ?? 0
    const reps = card.repetitions ?? 0
    if (!lastReview && reps === 0) return 'new'
    if (interval === 0) return 'learning'
    return 'review'
}

export default function SentencesWelcomeScreen({ onStartDaily }: WelcomeScreenProps) {
    const { user } = useAuth()
    const [dueCards, setDueCards] = useState<SentenceRevisionCard[]>([])
    const [completedCards, setCompletedCards] = useState<SentenceRevisionCard[]>([])
    const [loading, setLoading] = useState(true)
    const [starting, setStarting] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetchSentenceRevisionSession().then(({ dueCards, completedCards }) => {
            if (!cancelled) {
                setDueCards(dueCards)
                setCompletedCards(completedCards)
                setLoading(false)
            }
        }).catch(() => {
            if (!cancelled) setLoading(false)
        })
        return () => { cancelled = true }
    }, [])

    const counts = useMemo(() => {
        const c = { newCount: 0, learningCount: 0, reviewCount: 0 }
        dueCards.forEach(card => {
            const q = classifyForCount(card)
            if (q === 'new') c.newCount++
            else if (q === 'learning') c.learningCount++
            else c.reviewCount++
        })
        return c
    }, [dueCards])

    const totalDue = dueCards.length
    const totalCompletedToday = completedCards.length

    const handleStart = () => {
        setStarting(true)
        setTimeout(() => onStartDaily(), 500)
    }

    return (
        <>
            <style>{PAGE_CSS}</style>
            <Box sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
                <Box sx={{
                    maxWidth: 720,
                    mx: 'auto',
                    px: { xs: 2, sm: 3 },
                    py: { xs: 4, md: 6 },
                    textAlign: 'center',
                }}>
                    {/* Title */}
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: { xs: '2.2rem', md: '3rem' },
                        fontWeight: 700,
                        color: '#2c1a0e',
                        mb: 1,
                    }}>
                        Sentence Revision
                    </Typography>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: { xs: '1rem', md: '1.15rem' },
                        color: '#7a6e65',
                        maxWidth: 480,
                        mx: 'auto',
                        mb: 4,
                        lineHeight: 1.6,
                    }}>
                        Review sentences from your favourite cartoons. Recall the Arabic from English prompts, or fill in the missing word.
                    </Typography>

                    {/* Stats card */}
                    <Box sx={{
                        background: '#fff',
                        border: '1px solid rgba(184,134,11,0.2)',
                        borderRadius: '16px',
                        p: { xs: '1.5rem', md: '2rem' },
                        mb: 3,
                        textAlign: 'left',
                    }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Skeleton variant="text" width="60%" height={32} />
                                <Skeleton variant="text" width="40%" height={24} />
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Skeleton variant="rounded" width={80} height={32} />
                                    <Skeleton variant="rounded" width={80} height={32} />
                                    <Skeleton variant="rounded" width={80} height={32} />
                                </Box>
                            </Box>
                        ) : !user ? (
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '1rem',
                                    color: '#7a6e65',
                                    mb: 2,
                                }}>
                                    Sign in to track your sentence progress and start spaced-repetition review.
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                                    <Typography sx={{
                                        fontFamily: "'EB Garamond', serif",
                                        fontSize: { xs: '2rem', md: '2.5rem' },
                                        fontWeight: 700,
                                        color: '#2c1a0e',
                                    }}>
                                        {totalDue}
                                    </Typography>
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '1rem',
                                        color: '#7a6e65',
                                    }}>
                                        sentences due today
                                    </Typography>
                                </Box>

                                {totalCompletedToday > 0 && (
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.85rem',
                                        color: '#2e7d32',
                                        mb: 1.5,
                                    }}>
                                        {totalCompletedToday} already completed today
                                    </Typography>
                                )}

                                {/* Queue chips */}
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                                    {counts.newCount > 0 && (
                                        <Box sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            px: '12px',
                                            py: '5px',
                                            borderRadius: '999px',
                                            border: '1.5px solid rgba(21,101,192,0.25)',
                                            color: '#1565c0',
                                            background: 'rgba(21,101,192,0.08)',
                                        }}>
                                            {counts.newCount} New
                                        </Box>
                                    )}
                                    {counts.learningCount > 0 && (
                                        <Box sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            px: '12px',
                                            py: '5px',
                                            borderRadius: '999px',
                                            border: '1.5px solid rgba(193,58,0,0.25)',
                                            color: '#c13a00',
                                            background: 'rgba(193,58,0,0.08)',
                                        }}>
                                            {counts.learningCount} Learning
                                        </Box>
                                    )}
                                    {counts.reviewCount > 0 && (
                                        <Box sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            px: '12px',
                                            py: '5px',
                                            borderRadius: '999px',
                                            border: '1.5px solid rgba(46,125,50,0.25)',
                                            color: '#2e7d32',
                                            background: 'rgba(46,125,50,0.08)',
                                        }}>
                                            {counts.reviewCount} Review
                                        </Box>
                                    )}
                                    {totalDue === 0 && (
                                        <Typography sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '0.9rem',
                                            color: '#9e8a7a',
                                        }}>
                                            No sentences due. Add some from the cartoons page!
                                        </Typography>
                                    )}
                                </Box>
                            </>
                        )}
                    </Box>

                    {/* Start button */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Button
                            variant="contained"
                            onClick={handleStart}
                            disabled={starting || loading || totalDue === 0}
                            startIcon={starting ? <CircularProgress size={18} sx={{ color: '#1a0e00' }} /> : <PlayArrow />}
                            sx={{
                                background: 'linear-gradient(135deg, #b8860b 0%, #d4a843 100%)',
                                color: '#1a0e00',
                                fontFamily: 'Jost, sans-serif',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                textTransform: 'none',
                                borderRadius: '12px',
                                px: 5,
                                py: 1.5,
                                boxShadow: '0 6px 20px rgba(184,134,11,0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #d4a843 0%, #e6c060 100%)',
                                    boxShadow: '0 8px 28px rgba(184,134,11,0.4)',
                                },
                                '&.Mui-disabled': {
                                    background: 'rgba(184,134,11,0.2)',
                                    color: 'rgba(26,14,0,0.4)',
                                },
                            }}
                        >
                            {starting ? 'Starting…' : totalDue === 0 ? 'No Sentences Due' : 'Start Daily Review'}
                        </Button>
                    </motion.div>

                    {/* How it works */}
                    <Box sx={{
                        mt: 5,
                        pt: 3,
                        borderTop: '1px solid rgba(184,134,11,0.15)',
                    }}>
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#9e8a7a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            mb: 2,
                        }}>
                            How it works
                        </Typography>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                            gap: 2,
                            textAlign: 'left',
                        }}>
                            {[
                                {
                                    title: 'Self-Rate Reveal',
                                    desc: 'Read the English translation, try to recall the Arabic sentence, then reveal and rate how well you remembered it.',
                                    icon: <Visibility sx={{ fontSize: 24, color: '#b8860b' }} />,
                                },
                                {
                                    title: 'Fill in the Blank',
                                    desc: 'See the Arabic sentence with one word missing. Type what you think the word is, then check and self-rate.',
                                    icon: <EditNote sx={{ fontSize: 24, color: '#b8860b' }} />,
                                },
                            ].map((item) => (
                                <Box key={item.title} sx={{
                                    p: 2,
                                    borderRadius: '10px',
                                    background: 'rgba(184,134,11,0.04)',
                                    border: '1px solid rgba(184,134,11,0.1)',
                                }}>
                                    <Box sx={{ mb: 0.5 }}>
                                        {item.icon}
                                    </Box>
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        color: '#2c1a0e',
                                        mb: 0.5,
                                    }}>
                                        {item.title}
                                    </Typography>
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.82rem',
                                        color: '#7a6e65',
                                        lineHeight: 1.5,
                                    }}>
                                        {item.desc}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </>
    )
}
