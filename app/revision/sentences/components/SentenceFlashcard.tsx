'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, Button, Collapse, TextField } from '@mui/material'
import { useMediaQuery } from '@mui/material'
import type { SessionCard, Queue } from '../types'
import { QUEUE_CONFIG } from '../types'
import type { Answer } from '@/app/actions/revision'
import { Replay, TrendingFlat, Check, TrendingUp, Visibility } from '@mui/icons-material'

const ANSWER_BUTTONS: { label: string; value: Answer; color: string; hoverBg: string; border: string; icon: React.ReactNode }[] = [
    { label: 'Again', value: 'again', color: '#c62828', hoverBg: 'rgba(198,40,40,0.06)', border: 'rgba(198,40,40,0.4)', icon: <Replay sx={{ fontSize: '1rem' }} /> },
    { label: 'Hard', value: 'hard', color: '#e65100', hoverBg: 'rgba(230,81,0,0.06)', border: 'rgba(230,81,0,0.4)', icon: <TrendingFlat sx={{ fontSize: '1rem' }} /> },
    { label: 'Good', value: 'good', color: '#2e7d32', hoverBg: 'rgba(46,125,50,0.06)', border: 'rgba(46,125,50,0.4)', icon: <Check sx={{ fontSize: '1rem' }} /> },
    { label: 'Easy', value: 'easy', color: '#1565c0', hoverBg: 'rgba(21,101,192,0.06)', border: 'rgba(21,101,192,0.4)', icon: <TrendingUp sx={{ fontSize: '1rem' }} /> },
]

function ProgressDots({
    dotOrder,
    answeredDots,
    currentDotId,
    isMobile,
}: {
    dotOrder: string[]
    answeredDots: Record<string, Queue>
    currentDotId: string | null
    isMobile: boolean
}) {
    const total = dotOrder.length
    if (total === 0) return null
    const maxDots = isMobile ? 10 : 20
    const half = isMobile ? 5 : 10

    let visible = dotOrder
    let start = 0
    if (total > maxDots) {
        const currentIdx = currentDotId ? dotOrder.indexOf(currentDotId) : 0
        start = Math.max(0, Math.min(currentIdx - half, total - maxDots))
        visible = dotOrder.slice(start, start + maxDots)
    }

    return (
        <Box sx={{ display: 'flex', gap: '5px', mb: 1.5, overflow: 'hidden', flexWrap: 'wrap' }}>
            {visible.map((dotId, i) => {
                const isCurrent = dotId === currentDotId
                const queue = answeredDots[dotId]
                const isAnswered = !!queue
                const color = isAnswered
                    ? QUEUE_CONFIG[queue].color
                    : isCurrent ? '#b8860b' : 'rgba(122,110,101,0.3)'
                return (
                    <Box
                        key={`${dotId}-${i}`}
                        sx={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: color,
                            transition: 'all 0.3s ease',
                            ...(isCurrent && !isAnswered ? {
                                boxShadow: '0 0 0 3px rgba(184,134,11,0.2)',
                                animation: 'pulseDot 1.5s ease-in-out infinite',
                            } : {}),
                        }}
                    />
                )
            })}
            <style>{`
                @keyframes pulseDot {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.7; }
                }
            `}</style>
        </Box>
    )
}

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

/* ── Reveal card: English shown, Arabic hidden ── */
function RevealCard({
    card,
    onReveal,
    revealed,
    showDiacritics,
    textScale,
    isMobile,
}: {
    card: SessionCard
    onReveal: () => void
    revealed: boolean
    showDiacritics: boolean
    textScale: number
    isMobile: boolean
}) {
    const data = card.data
    const arabicText = showDiacritics ? data.arabicDiacritic : data.arabicPlain

    return (
        <>
            {/* English prompt */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography
                    sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: `calc(${isMobile ? '1.1rem' : '1.3rem'} * ${textScale})`,
                        fontWeight: 500,
                        color: '#7a6e65',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                    }}
                >
                    &ldquo;{data.english}&rdquo;
                </Typography>
                {data.title && (
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.75rem',
                        color: '#9e8a7a',
                        mt: 1,
                    }}>
                        — {data.title}
                    </Typography>
                )}
            </Box>

            <Collapse in={revealed} timeout={{ enter: 300, exit: 0 }}>
                <Box sx={{
                    borderTop: '1px solid rgba(184,134,11,0.1)',
                    pt: '1.5rem',
                    mb: '1rem',
                    textAlign: 'center',
                }}>
                    {/* Arabic sentence */}
                    <Typography
                        dir="rtl"
                        sx={{
                            fontFamily: "'EB Garamond', serif",
                            fontSize: `calc(${isMobile ? '1.8rem' : '2.2rem'} * ${textScale})`,
                            fontWeight: 700,
                            color: '#2c1a0e',
                            lineHeight: 1.6,
                            mb: 1.5,
                        }}
                    >
                        {arabicText}
                    </Typography>

                    {/* Word-by-word breakdown */}
                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        justifyContent: 'center',
                        mt: 2,
                    }}>
                        {data.words.map((w, i) => (
                            <Box
                                key={i}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.3,
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: '8px',
                                    background: 'rgba(184,134,11,0.06)',
                                    border: '1px solid rgba(184,134,11,0.12)',
                                    minWidth: 60,
                                }}
                            >
                                <Typography
                                    dir="rtl"
                                    sx={{
                                        fontFamily: "'EB Garamond', serif",
                                        fontSize: `calc(1rem * ${textScale})`,
                                        fontWeight: 600,
                                        color: '#2c1a0e',
                                    }}
                                >
                                    {showDiacritics ? w.arabic : w.plain}
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: `calc(0.7rem * ${textScale})`,
                                    color: '#b8860b',
                                    letterSpacing: '0.03em',
                                }}>
                                    {w.transliteration}
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: `calc(0.68rem * ${textScale})`,
                                    color: '#7a6e65',
                                }}>
                                    {w.english}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Notes */}
                    {data.notes.length > 0 && (
                        <Box sx={{ mt: 2, textAlign: 'left' }}>
                            {data.notes.map((note, i) => (
                                <Typography key={i} sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.8rem',
                                    color: '#9e8a7a',
                                    fontStyle: 'italic',
                                    mb: 0.5,
                                }}>
                                    {note}
                                </Typography>
                            ))}
                        </Box>
                    )}
                </Box>
            </Collapse>

            {!revealed && (
                <Box sx={{ pt: { xs: 2, md: 3 } }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={onReveal}
                        startIcon={<Visibility />}
                        sx={{
                            py: { xs: '0.75rem', md: '0.8rem' },
                            border: '1px solid rgba(184,134,11,0.3)',
                            borderRadius: '6px',
                            color: '#2c1a0e',
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: '1rem', md: 'clamp(1rem, 1.6vw, 1.2rem)' },
                            fontWeight: 500,
                            letterSpacing: '0.04em',
                            textTransform: 'none',
                            transition: 'background 0.15s, border-color 0.15s, transform 0.2s',
                            '&:hover': {
                                background: 'rgba(184,134,11,0.05)',
                                borderColor: 'rgba(184,134,11,0.5)',
                                transform: 'translateY(-1px)',
                            },
                        }}
                    >
                        Show Arabic
                    </Button>
                </Box>
            )}
        </>
    )
}

/* ── Fill-in-the-blank card ── */
function FillBlankCard({
    card,
    onReveal,
    revealed,
    showDiacritics,
    textScale,
    isMobile,
}: {
    card: SessionCard
    onReveal: () => void
    revealed: boolean
    showDiacritics: boolean
    textScale: number
    isMobile: boolean
}) {
    const data = card.data

    // Pick a blank word deterministically based on card id hash
    const blankIndex = React.useMemo(() => {
        let hash = 0
        for (let i = 0; i < data.id.length; i++) hash = (hash * 31 + data.id.charCodeAt(i)) >>> 0
        return data.words.length > 0 ? hash % data.words.length : 0
    }, [data.id, data.words.length])

    const blankWord = data.words[blankIndex]
    const [userInput, setUserInput] = useState('')

    // Build sentence with blank
    const sentenceParts = React.useMemo(() => {
        const plainWords = data.arabicPlain.split(/\s+/)
        const blankPlain = blankWord?.plain ?? ''
        // Try to find the blank word position in the plain text
        const parts: { text: string; isBlank: boolean }[] = []
        let found = false
        for (const w of plainWords) {
            if (!found && w === blankPlain) {
                parts.push({ text: w, isBlank: true })
                found = true
            } else {
                parts.push({ text: w, isBlank: false })
            }
        }
        // Fallback: if not found, just blank the middle word by index
        if (!found && blankIndex < plainWords.length) {
            parts[blankIndex] = { text: plainWords[blankIndex], isBlank: true }
        }
        return parts
    }, [data.arabicPlain, blankWord, blankIndex])

    const arabicText = showDiacritics ? data.arabicDiacritic : data.arabicPlain

    return (
        <>
            {/* English hint */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography
                    sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: `calc(${isMobile ? '1rem' : '1.15rem'} * ${textScale})`,
                        fontWeight: 500,
                        color: '#7a6e65',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                    }}
                >
                    &ldquo;{data.english}&rdquo;
                </Typography>
            </Box>

            {/* Arabic sentence with blank */}
            <Box
                dir="rtl"
                sx={{
                    textAlign: 'center',
                    mb: 3,
                    fontFamily: "'EB Garamond', serif",
                    fontSize: `calc(${isMobile ? '1.5rem' : '1.9rem'} * ${textScale})`,
                    fontWeight: 700,
                    color: '#2c1a0e',
                    lineHeight: 1.8,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '0.35em',
                }}
            >
                {revealed ? (
                    <Typography
                        dir="rtl"
                        component="span"
                        sx={{
                            fontFamily: "'EB Garamond', serif",
                            fontSize: `calc(${isMobile ? '1.5rem' : '1.9rem'} * ${textScale})`,
                            fontWeight: 700,
                            color: '#2c1a0e',
                            lineHeight: 1.8,
                        }}
                    >
                        {arabicText}
                    </Typography>
                ) : (
                    sentenceParts.map((part, i) => (
                        <Box
                            key={i}
                            component="span"
                            dir="rtl"
                            sx={{
                                display: 'inline-block',
                                ...(part.isBlank && {
                                    borderBottom: '2px dashed #b8860b',
                                    minWidth: `${Math.max(3, (part.text?.length ?? 3) * 0.6)}em`,
                                    height: '1.4em',
                                    background: 'rgba(184,134,11,0.06)',
                                    borderRadius: '4px',
                                }),
                            }}
                        >
                            {!part.isBlank && part.text}
                        </Box>
                    ))
                )}
            </Box>

            {/* User input before reveal */}
            {!revealed && (
                <Box sx={{ mb: 2 }}>
                    <TextField
                        dir="rtl"
                        fullWidth
                        placeholder="Type the missing word..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onReveal()
                        }}
                        slotProps={{ htmlInput: { dir: 'rtl', style: { textAlign: 'center' } } }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                fontFamily: "'EB Garamond', serif",
                                fontSize: `calc(1.2rem * ${textScale})`,
                                borderRadius: '8px',
                                background: '#faf7f2',
                            },
                        }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={onReveal}
                            startIcon={<Visibility />}
                            sx={{
                                py: '0.65rem',
                                border: '1px solid rgba(184,134,11,0.3)',
                                borderRadius: '6px',
                                color: '#2c1a0e',
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                textTransform: 'none',
                                '&:hover': {
                                    background: 'rgba(184,134,11,0.05)',
                                    borderColor: 'rgba(184,134,11,0.5)',
                                },
                            }}
                        >
                            Show Answer
                        </Button>
                    </Box>
                </Box>
            )}

            <Collapse in={revealed} timeout={{ enter: 300, exit: 0 }}>
                <Box sx={{
                    borderTop: '1px solid rgba(184,134,11,0.1)',
                    pt: '1.5rem',
                    mb: '1rem',
                    textAlign: 'center',
                }}>
                    {/* Highlight the answer */}
                    {blankWord && (
                        <Box sx={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 3,
                            py: 1.5,
                            borderRadius: '10px',
                            background: 'rgba(46,125,50,0.08)',
                            border: '1.5px solid rgba(46,125,50,0.3)',
                            mb: 2,
                        }}>
                            <Typography
                                dir="rtl"
                                sx={{
                                    fontFamily: "'EB Garamond', serif",
                                    fontSize: `calc(1.4rem * ${textScale})`,
                                    fontWeight: 700,
                                    color: '#2e7d32',
                                }}
                            >
                                {showDiacritics ? blankWord.arabic : blankWord.plain}
                            </Typography>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: `calc(0.8rem * ${textScale})`,
                                color: '#b8860b',
                            }}>
                                {blankWord.transliteration}
                            </Typography>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: `calc(0.75rem * ${textScale})`,
                                color: '#7a6e65',
                            }}>
                                {blankWord.english}
                            </Typography>
                        </Box>
                    )}

                    {/* Word-by-word */}
                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.5,
                        justifyContent: 'center',
                        mt: 1,
                    }}>
                        {data.words.map((w, i) => (
                            <Box
                                key={i}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.3,
                                    px: 1.2,
                                    py: 0.8,
                                    borderRadius: '8px',
                                    background: i === blankIndex
                                        ? 'rgba(46,125,50,0.08)'
                                        : 'rgba(184,134,11,0.06)',
                                    border: i === blankIndex
                                        ? '1.5px solid rgba(46,125,50,0.3)'
                                        : '1px solid rgba(184,134,11,0.12)',
                                    minWidth: 50,
                                }}
                            >
                                <Typography
                                    dir="rtl"
                                    sx={{
                                        fontFamily: "'EB Garamond', serif",
                                        fontSize: `calc(0.9rem * ${textScale})`,
                                        fontWeight: 600,
                                        color: i === blankIndex ? '#2e7d32' : '#2c1a0e',
                                    }}
                                >
                                    {showDiacritics ? w.arabic : w.plain}
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: `calc(0.65rem * ${textScale})`,
                                    color: '#b8860b',
                                }}>
                                    {w.transliteration}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Collapse>
        </>
    )
}

/* ── Main Flashcard Component ── */
export default function SentenceFlashcard({
    sessionCard,
    counts,
    showDiacritics,
    onAnswer,
    textScale,
    dotOrder,
    answeredDots,
    uniqueDoneCount,
    uniqueTotal,
}: {
    sessionCard: SessionCard
    counts: Record<Queue, number>
    showDiacritics: boolean
    onAnswer: (ans: Answer) => void
    textScale: number
    dotOrder: string[]
    answeredDots: Record<string, Queue>
    uniqueDoneCount: number
    uniqueTotal: number
}) {
    const [revealed, setRevealed] = useState(false)
    const cardStartRef = useRef<number>(0)
    const revealTimeRef = useRef<number>(0)
    const isMobile = useMediaQuery('(max-width:600px)')

    const card = sessionCard.data
    const progress = uniqueTotal > 0 ? Math.round((uniqueDoneCount / uniqueTotal) * 100) : 0

    useEffect(() => {
        cardStartRef.current = Date.now()
    }, [])

    const handleReveal = () => {
        setRevealed(true)
        revealTimeRef.current = Math.round((Date.now() - cardStartRef.current) / 1000)
    }

    const handleAnswer = (ans: Answer) => {
        onAnswer(ans)
    }

    return (
        <Box sx={{
            background: '#fff',
            border: '1px solid rgba(184,134,11,0.2)',
            borderRadius: '10px',
            padding: { xs: '1.25rem 0.875rem 0.5rem', md: '2rem 1.5rem 0.75rem' },
            minHeight: { xs: '300px', md: '340px' },
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
        }}>
            {/* Progress dots */}
            <ProgressDots
                dotOrder={dotOrder}
                answeredDots={answeredDots}
                currentDotId={sessionCard.dotId}
                isMobile={isMobile}
            />

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1 }}>
                <BucketChips counts={counts} currentQueue={sessionCard.queue} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                    <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '11px',
                        fontWeight: 500,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: card.cardType === 'fillblank'
                            ? 'rgba(21,101,192,0.08)'
                            : 'rgba(122,110,101,0.08)',
                        color: card.cardType === 'fillblank' ? '#1565c0' : '#7a6e65',
                        border: card.cardType === 'fillblank'
                            ? '1px solid rgba(21,101,192,0.2)'
                            : '1px solid rgba(122,110,101,0.15)',
                    }}>
                        {card.cardType === 'fillblank' ? 'Fill in the Blank' : 'Self-Rate Reveal'}
                    </Box>
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#b8860b',
                        flexShrink: 0,
                    }}>{progress}%</Typography>
                </Box>
            </Box>

            {/* Source info */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                mb: 2,
            }}>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.72rem',
                    color: '#9e8a7a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                }}>
                    {card.show_slug} · Episode {card.episode_slug} · Block {card.block_index + 1}
                </Typography>
            </Box>

            {/* Card body */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {card.cardType === 'fillblank' ? (
                    <FillBlankCard
                        card={sessionCard}
                        onReveal={handleReveal}
                        revealed={revealed}
                        showDiacritics={showDiacritics}
                        textScale={textScale}
                        isMobile={isMobile}
                    />
                ) : (
                    <RevealCard
                        card={sessionCard}
                        onReveal={handleReveal}
                        revealed={revealed}
                        showDiacritics={showDiacritics}
                        textScale={textScale}
                        isMobile={isMobile}
                    />
                )}

                {/* Answer buttons (only when revealed) */}
                <Collapse in={revealed} timeout={{ enter: 200, exit: 0 }}>
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
                    </Box>
                </Collapse>
            </Box>
        </Box>
    )
}
