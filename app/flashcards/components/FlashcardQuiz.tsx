'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
    Box, Button, Typography, Collapse, Fade,
    IconButton, useTheme, useMediaQuery,
} from '@mui/material'
import {
    NavigateNext, NavigateBefore, Edit,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import type { VocabRow, ExampleRow } from '@/app/actions/vocab'
import AnimatedArabicWord from './AnimatedArabicWord'
import DefinitionPanel from './DefinitionPanel'
import FormsPanel from './FormsPanel'
import { ExampleSentences } from './SentenceBuilder'
import AdminEditDialog from './AdminEditDialog'

type CardState = VocabRow

function FlashcardQuiz({
    initialQueue,
    allExamples,
    showDiacritics,
    onComplete,
    textScale,
    initialCardIndex,
    isAdmin,
    onWordEdited,
    onWordDeleted,
}: {
    initialQueue: CardState[]
    allExamples: ExampleRow[]
    showDiacritics: boolean
    onComplete: () => void
    textScale: number
    initialCardIndex?: number
    isAdmin?: boolean
    onWordEdited?: () => void
    onWordDeleted?: () => void
}) {
    const [allCards] = useState<CardState[]>(initialQueue)
    const [currentIndex, setCurrentIndex] = useState(initialCardIndex ?? 0)
    const [revealed, setRevealed] = useState(true)
    const [cardKey, setCardKey] = useState(0)
    const [mobileTab, setMobileTab] = useState<'definition' | 'examples' | 'forms'>('definition')
    const [editOpen, setEditOpen] = useState(false)
    const themeObj = useTheme()
    const isMobile = useMediaQuery(themeObj.breakpoints.down('sm'))

    const totalCards = allCards.length
    const current = allCards[currentIndex] ?? null
    const canGoBack = currentIndex > 0
    const isLastCard = currentIndex >= totalCards - 1

    const currentCardExamples = useMemo(
        () => current ? allExamples.filter(e => e.vocab_id === current.id) : [],
        [current, allExamples]
    )

    const hasForms = (current?.forms && current.forms.length > 0) || current?.theme_id?.toLowerCase().includes('verbs') || current?.pos === 'verb'

    const goToIndex = useCallback(
        (newIndex: number) => {
            if (newIndex >= 0 && newIndex < totalCards) {
                setCurrentIndex(newIndex)
                setCardKey(k => k + 1)
                setMobileTab('definition')
            }
        },
        [totalCards]
    )

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) goToIndex(currentIndex - 1)
    }, [currentIndex, goToIndex])

    const handleNext = useCallback(() => {
        if (currentIndex < totalCards - 1) {
            goToIndex(currentIndex + 1)
        } else {
            onComplete?.()
        }
    }, [currentIndex, totalCards, goToIndex, onComplete])

    if (!current) return null

    const transliterationFontSize = `calc(1.45rem * ${textScale})`

    const cardInner = (
        <Box
            sx={{
                background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px',
                padding: { xs: '1.25rem 0.875rem', md: '2rem 1.5rem 1.75rem' },
                minHeight: { xs: '300px', md: '340px' }, display: 'flex', flexDirection: 'column',
                position: 'relative',
            }}
        >
            {/* Progress indicator */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '1.25rem' }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: '#9e8a7a' }}>
                    Card {currentIndex + 1} of {totalCards}
                </Typography>
                <Box sx={{ height: '2px', background: 'rgba(184,134,11,0.1)', borderRadius: '999px', overflow: 'hidden', flex: 1, ml: 2 }}>
                    <Box sx={{ height: '100%', background: 'linear-gradient(90deg, #b8860b, #d4a843)', borderRadius: '999px', transition: 'width 0.4s ease', width: `${totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0}%` }} />
                </Box>
            </Box>

            {isAdmin && (
                <AdminEditDialog
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    wordId={current.id}
                    onSaved={() => onWordEdited?.()}
                    onDeleted={() => onWordDeleted?.()}
                />
            )}

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Admin edit button */}
                {isAdmin && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                        <IconButton onClick={() => setEditOpen(true)} size="small" aria-label="Edit word"
                            sx={{ width: 32, height: 32, border: '1px solid rgba(184,134,11,0.3)', borderRadius: '50%', color: '#b8860b' }}>
                            <Edit sx={{ fontSize: '0.95rem' }} />
                        </IconButton>
                    </Box>
                )}
                {/* Arabic word */}
                <Box sx={{ pt: { xs: 3 } }}>
                    <AnimatedArabicWord
                        word={current.word}
                        wordDiacritic={current.word_diacritic}
                        showDiacritics={showDiacritics}
                        textScale={textScale}
                    />
                </Box>

                <Collapse in={revealed} timeout={300}>
                    <Box sx={{ borderTop: '1px solid rgba(184,134,11,0.1)', margin: '1rem 0' }} />

                    {/* POS chip */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 0.5, md: 0.75 } }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Jost, sans-serif', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: '999px', background: 'rgba(122,110,101,0.08)', color: '#7a6e65' }}>
                            {current.pos}
                        </Box>
                    </Box>

                    {/* Transliteration + definition */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', py: 1, mb: { xs: 1, md: 1.5 } }}>
                        <Typography component="span" sx={{ fontFamily: 'Jost, sans-serif', fontSize: transliterationFontSize, color: '#b8860b', letterSpacing: '0.05em', lineHeight: 1 }}>
                            {current.transliteration}
                        </Typography>
                        <Typography component="span" sx={{ fontFamily: "'EB Garamond', serif", fontSize: `calc(1.5rem * ${textScale})`, fontWeight: 700, color: '#2c1a0e', lineHeight: 1 }}>
                            {current.definition}
                        </Typography>
                    </Box>

                    {/* Tabs */}
                    <Box sx={{ display: 'block' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                            <Button
                                onClick={() => setMobileTab('definition')}
                                sx={{
                                    fontFamily: 'Jost, sans-serif', fontSize: '0.8rem',
                                    fontWeight: mobileTab === 'definition' ? 600 : 500,
                                    textTransform: 'none', borderRadius: '20px', px: 2, py: 0.5, minWidth: 80,
                                    background: mobileTab === 'definition' ? 'rgba(184,134,11,0.12)' : 'transparent',
                                    color: mobileTab === 'definition' ? '#b8860b' : '#7a6e65',
                                    border: '1px solid',
                                    borderColor: mobileTab === 'definition' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)',
                                }}
                            >
                                Definition
                            </Button>
                            <Button
                                onClick={() => setMobileTab('examples')}
                                sx={{
                                    fontFamily: 'Jost, sans-serif', fontSize: '0.8rem',
                                    fontWeight: mobileTab === 'examples' ? 600 : 500,
                                    textTransform: 'none', borderRadius: '20px', px: 2, py: 0.5, minWidth: 80,
                                    background: mobileTab === 'examples' ? 'rgba(184,134,11,0.12)' : 'transparent',
                                    color: mobileTab === 'examples' ? '#b8860b' : '#7a6e65',
                                    border: '1px solid',
                                    borderColor: mobileTab === 'examples' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)',
                                }}
                            >
                                Examples
                            </Button>
                            {hasForms && (
                                <Button
                                    onClick={() => setMobileTab('forms')}
                                    sx={{
                                        fontFamily: 'Jost, sans-serif', fontSize: '0.8rem',
                                        fontWeight: mobileTab === 'forms' ? 600 : 500,
                                        textTransform: 'none', borderRadius: '20px', px: 2, py: 0.5, minWidth: 80,
                                        background: mobileTab === 'forms' ? 'rgba(184,134,11,0.12)' : 'transparent',
                                        color: mobileTab === 'forms' ? '#b8860b' : '#7a6e65',
                                        border: '1px solid',
                                        borderColor: mobileTab === 'forms' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)',
                                    }}
                                >
                                    Forms
                                </Button>
                            )}
                        </Box>
                        {mobileTab === 'definition' && (
                            <DefinitionPanel card={current} showDiacritics={showDiacritics} textScale={textScale} />
                        )}
                        {mobileTab === 'examples' && (
                            <ExampleSentences
                                examplesForCard={currentCardExamples}
                                revealed={revealed}
                                showDiacritics={showDiacritics}
                                textScale={textScale}
                            />
                        )}
                        {mobileTab === 'forms' && hasForms && (
                            <FormsPanel
                                forms={current.forms!}
                                showDiacritics={showDiacritics}
                                textScale={textScale}
                            />
                        )}
                    </Box>

                    {/* Desktop action buttons */}
                    <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', mt: '1.25rem' }}>
                        <Button variant="outlined" size="small" onClick={handlePrevious} disabled={!canGoBack} startIcon={<NavigateBefore sx={{ fontSize: '1.1rem !important' }} />}
                            sx={{ borderColor: '#7a6e65', color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px', textTransform: 'none', '&:hover': { background: 'rgba(122,110,101,0.08)' }, '&:disabled': { opacity: 0.4 } }}>Back</Button>
                        <Button variant="outlined" color="warning" size="small" onClick={handleNext} endIcon={<NavigateNext sx={{ fontSize: '1.1rem !important' }} />}
                            sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px', '&:disabled': { opacity: 0.4 } }}>
                            {isLastCard ? 'Finish' : 'Next'}
                        </Button>
                        <Button variant="outlined" size="small" onClick={() => setRevealed(false)} disabled={!revealed}
                            sx={{ borderColor: '#b8860b', color: '#b8860b', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px', textTransform: 'none', '&:hover': { background: 'rgba(184,134,11,0.08)' }, '&:disabled': { opacity: 0.4 } }}>Hide</Button>
                    </Box>

                    {/* Mobile action buttons */}
                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'center', gap: '10px', mt: '1rem' }}>
                        <Button variant="outlined" size="small" onClick={handlePrevious} disabled={!canGoBack} startIcon={<NavigateBefore sx={{ fontSize: '0.85rem !important' }} />}
                            sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.82rem', px: '12px', py: '6px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 0, lineHeight: 1.4, borderColor: canGoBack ? 'rgba(122,110,101,0.4)' : 'rgba(122,110,101,0.15)', color: canGoBack ? '#7a6e65' : 'rgba(122,110,101,0.3)', '&:hover': { background: 'rgba(122,110,101,0.08)' }, '&.Mui-disabled': { opacity: 0.35, border: '1px solid rgba(122,110,101,0.15)' } }}>
                            Back
                        </Button>
                        <Button variant="outlined" color="warning" size="small" onClick={handleNext} endIcon={<NavigateNext sx={{ fontSize: '0.85rem !important' }} />}
                            sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.82rem', px: '12px', py: '6px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 0, lineHeight: 1.4, borderColor: 'rgba(184,134,11,0.45)', color: '#b8860b', '&:hover': { background: 'rgba(184,134,11,0.06)' } }}>
                            {isLastCard ? 'Finish' : 'Next'}
                        </Button>
                        <Button variant="outlined" size="small" onClick={() => setRevealed(false)} disabled={!revealed}
                            sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.82rem', px: '12px', py: '6px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 0, lineHeight: 1.4, borderColor: revealed ? 'rgba(184,134,11,0.45)' : 'rgba(184,134,11,0.15)', color: revealed ? '#b8860b' : 'rgba(184,134,11,0.3)', '&:hover': { background: 'rgba(184,134,11,0.06)' }, '&.Mui-disabled': { opacity: 0.35, border: '1px solid rgba(184,134,11,0.15)' } }}>
                            Hide
                        </Button>
                    </Box>
                </Collapse>

                {!revealed && (
                    <Box sx={{ mt: 'auto', pt: { xs: 0, sm: 0, md: 4 }, width: '100%' }}>
                        <Button fullWidth variant="outlined" onClick={() => setRevealed(true)}
                            sx={{ padding: '0.875rem', border: '1px solid rgba(184,134,11,0.3)', borderRadius: '6px', color: '#2c1a0e', fontFamily: 'Jost, sans-serif', fontSize: { xs: 'clamp(1rem, 1.6vw, 1.2rem)' }, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'none', transition: 'background 0.15s, border-color 0.15s, transform 0.2s', '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: 'rgba(184,134,11,0.5)', transform: 'translateY(-1px)' } }}>
                            Show answer
                        </Button>
                    </Box>
                )}
            </Box>
        </Box>
    )

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
            <Fade in key={`${cardKey}-${current.id}`} timeout={400}>
                {isMobile ? (
                    <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.15}
                        onDragEnd={(_, info) => {
                            const threshold = 60
                            const velocityThreshold = 300
                            if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
                                handleNext()
                            } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
                                handlePrevious()
                            }
                        }}
                        style={{ touchAction: 'pan-y' }}
                    >
                        {cardInner}
                    </motion.div>
                ) : cardInner}
            </Fade>
            {isMobile && (
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: '#6b5f55', textAlign: 'center', mt: 1 }}>
                    Swipe left → Next · Swipe right → Back
                </Typography>
            )}
        </Box>
    )
}

export default FlashcardQuiz
