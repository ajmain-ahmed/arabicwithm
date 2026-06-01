'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
    Box, Button, Typography, Collapse, Fade,
    CircularProgress, IconButton, useTheme, useMediaQuery,
} from '@mui/material'
import {
    Bookmark, BookmarkAdded, Check, DoneAll,
    NavigateNext, NavigateBefore, Edit,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAuth } from '@/app/AuthContext'
import { useRevisionStore } from '@/store/revisionStore'
import { useVocabStore } from '@/store/vocabStore'
import { upsertWordProgressBatch } from '@/app/actions/vocab'
import type { VocabRow, ExampleRow } from '@/app/actions/vocab'
import AnimatedArabicWord from './AnimatedArabicWord'
import StatusChips from './StatusChips'
import DefinitionPanel from './DefinitionPanel'
import FormsPanel from './FormsPanel'
import { ExampleSentences } from './SentenceBuilder'
import AdminEditDialog from './AdminEditDialog'

type CardStatus = 'new' | 'revision' | 'completed'
type FilterType = 'all' | 'new' | 'revision' | 'completed'

type CardState = VocabRow & {
    status: CardStatus
}

function FlashcardQuiz({
    initialQueue, theme, allExamples, showDiacritics, onComplete, themeLabel,
    totalInTheme, alreadyCompletedCount, textScale, initialCardIndex, flushRef,
    levelCode,
    onThemeProgressUpdate,
    onOpenAuthDialog,
    isAdmin,
    onWordEdited,
    onWordDeleted,
}: {
    initialQueue: CardState[]
    theme: string
    allExamples: ExampleRow[]
    showDiacritics: boolean
    onComplete: () => void
    themeLabel: string
    totalInTheme: number
    alreadyCompletedCount: number
    textScale: number
    initialCardIndex?: number
    flushRef?: React.MutableRefObject<(() => Promise<void>) | null>
    levelCode: string
    onThemeProgressUpdate?: (theme: string, progress: { completedCount: number; revisionCount: number }) => void
    onOpenAuthDialog?: () => void
    isAdmin?: boolean
    onWordEdited?: () => void
    onWordDeleted?: () => void
}) {
    const { user } = useAuth()
    const updateLocalProgress = useVocabStore(s => s.updateLocalProgress)
    const updateUserProgressWord = useVocabStore(s => s.updateUserProgressWord)
    const clearSession = useRevisionStore((s) => s.clearSession)
    const invalidateRevisionId = useRevisionStore((s) => s._invalidateRevisionId)
    const [allCards, setAllCards] = useState<CardState[]>(initialQueue)
    const [filter, setFilter] = useState<FilterType>('all')
    const [revealed, setRevealed] = useState(true)
    const [cardKey, setCardKey] = useState(0)
    const [mobileTab, setMobileTab] = useState<'definition' | 'examples' | 'forms'>('definition')
    const [editOpen, setEditOpen] = useState(false)
    const themeObj = useTheme()
    const isMobile = useMediaQuery(themeObj.breakpoints.down('sm'))

    const pendingRef = useRef<Map<number, { status: number | null }>>(new Map())

    const flushPending = useCallback(async () => {
        if (pendingRef.current.size === 0) return
        const entries = Array.from(pendingRef.current.entries())
        pendingRef.current.clear()

        // Build a single batch array
        const batch = entries.map(([wordId, { status }]) => ({
            vocabId: wordId,
            status,
        }))

        try {
            await upsertWordProgressBatch(batch)   // one DB call
            // Sync revisionStore: status 0 = in revision, status 1/null = not in revision
            batch.forEach(({ vocabId, status }) => {
                invalidateRevisionId(vocabId, status === 0)
            })
        } catch (err) {
            console.error('Flashcard batch flush failed:', err)
            // Restore failed entries for next flush attempt
            entries.forEach(([wordId, data]) => {
                pendingRef.current.set(wordId, data)
            })
        }
    }, [])

    // Expose flushPending to parent via ref, and flush on unmount
    useEffect(() => {
        if (flushRef) flushRef.current = flushPending
        return () => {
            if (flushRef) flushRef.current = null
            // Fire-and-forget on unmount — covers Next.js client-side navigation
            if (pendingRef.current.size > 0) {
                flushPending()
            }
        }
    }, [flushRef, flushPending])


    const filteredCards = useMemo(
        () => (filter === 'all' ? allCards : allCards.filter(c => c.status === filter)),
        [allCards, filter]
    )

    useEffect(() => { if (filter !== 'all' && filteredCards.length === 0) setFilter('all') }, [filter, filteredCards.length])

    const startIndex = useMemo(() => {
        if (initialCardIndex !== undefined) return initialCardIndex
        const idx = filteredCards.findIndex(c => c.status === 'new')
        return idx === -1 ? 0 : idx
    }, [filteredCards, initialCardIndex])

    const [currentIndex, setCurrentIndex] = useState(startIndex)

    useEffect(() => {
        setCurrentIndex(startIndex)
    }, [startIndex])

    const current = filteredCards[currentIndex] ?? null
    const canGoBack = currentIndex > 0
    const isLastCard = currentIndex >= filteredCards.length - 1
    const isLastCardInTheme = current ? current.id === allCards[allCards.length - 1]?.id : false

    useEffect(() => {
        setMobileTab('definition')
    }, [current?.id])

    const hasForms = (current?.forms && current.forms.length > 0) || current?.theme_id?.toLowerCase().includes('verbs') || current?.pos === 'verb'

    const newCount = allCards.filter(c => c.status === 'new').length
    const revisionCount = allCards.filter(c => c.status === 'revision').length
    const completedCount = allCards.filter(c => c.status === 'completed').length
    // Both revision and completed count toward the progress percentage
    const progressPct = allCards.length > 0 ? Math.round(((revisionCount + completedCount) / allCards.length) * 100) : 0

    // Progress bump animation
    const prevProgressRef = useRef(progressPct)
    const [progressBump, setProgressBump] = useState<{ value: number; key: number } | null>(null)
    const bumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (progressPct > prevProgressRef.current) {
            const diff = progressPct - prevProgressRef.current
            if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current)
            setProgressBump({ value: diff, key: Date.now() })
            bumpTimerRef.current = setTimeout(() => setProgressBump(null), 1500)
        }
        prevProgressRef.current = progressPct
        return () => {
            if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current)
        }
    }, [progressPct])

    const currentCardExamples = useMemo(
        () => current ? allExamples.filter(e => e.vocab_id === current.id) : [],
        [current, allExamples]
    )

    // Sync theme-level counts back to parent
    useEffect(() => {
        if (allCards.length === 0) return
        onThemeProgressUpdate?.(theme, { completedCount, revisionCount })
    }, [allCards, theme, completedCount, revisionCount, onThemeProgressUpdate])

    // Auto-advance when theme fully completed
    const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
    const wasAlreadyCompleteOnMount = useRef(initialQueue.every(c => c.status === 'completed' || c.status === 'revision'))
    const hasTriggeredAdvance = useRef(false)
    useEffect(() => {
        const everyCompleted = allCards.length > 0 && allCards.every(c => c.status === 'completed' || c.status === 'revision')
        if (everyCompleted && !wasAlreadyCompleteOnMount.current && !hasTriggeredAdvance.current) {
            hasTriggeredAdvance.current = true
            setIsAutoAdvancing(true)
            const timer = setTimeout(() => {
                onComplete?.()
            }, 1200)
            return () => clearTimeout(timer)
        }
        if (!everyCompleted) {
            hasTriggeredAdvance.current = false
            setIsAutoAdvancing(false)
        }
    }, [allCards, onComplete, theme])

    const updateCardStatus = useCallback(
        (cardId: number, newStatus: CardStatus, opts?: { status?: number | null }) => {
            setAllCards(prev =>
                prev.map(c => {
                    if (c.id !== cardId) return c

                    if (opts && opts.status !== undefined) {
                        // Queue in the batch — do NOT flush here
                        pendingRef.current.set(cardId, { status: opts.status })
                        updateLocalProgress(theme, levelCode, cardId, {
                            status: opts.status,
                        })
                    }

                    return { ...c, status: newStatus }
                })
            )
        },
        [theme, levelCode, updateLocalProgress]
    )

    const goToIndex = useCallback(
        (newIndex: number) => {
            if (newIndex >= 0 && newIndex < filteredCards.length) {
                setCurrentIndex(newIndex)
                setCardKey(k => k + 1)
            }
        },
        [filteredCards.length]
    )

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) goToIndex(currentIndex - 1)
    }, [currentIndex, goToIndex])

    const handleNext = useCallback(() => {
        if (currentIndex < filteredCards.length - 1) {
            goToIndex(currentIndex + 1)
        } else if (filter === 'all') {
            onComplete?.()
        }
    }, [currentIndex, filteredCards.length, goToIndex, onComplete, filter])

    /* ── Swipe handlers ── */
    const handleDragEnd = (_: any, info: any) => {
        const threshold = 60
        const velocityThreshold = 300
        if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
            // Swipe left → revision
            if (current && current.status !== 'revision') {
                toggleRevision()
            } else {
                handleNext()
            }
        } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
            // Swipe right → complete
            if (current && current.status !== 'completed') {
                toggleComplete()
            } else {
                handleNext()
            }
        }
    }

    // Update local state + advance instantly — no DB call here
    const toggleRevision = useCallback(() => {
        if (!current) return
        const toRevision = current.status !== 'revision'
        if (toRevision) {
            // Adding to revision — also counts as "done" for progress %
            updateCardStatus(current.id, 'revision', { status: 0 })
            updateUserProgressWord(current.id, 'revision', {
                word_ar: current.word,
                word_di: current.word_diacritic,
                word_tr: current.transliteration,
                level: current.level,
                theme: current.theme_id,
                meaning: current.definition,
            })
            clearSession() // invalidate daily count cache
            if (currentIndex < filteredCards.length - 1) {
                goToIndex(currentIndex + 1)
            } else if (filter === 'all') {
                onComplete?.()
            }
        } else {
            // Removing from revision — delete from progress table
            updateCardStatus(current.id, 'new', { status: null })
            updateUserProgressWord(current.id, null)
            clearSession()
        }
    }, [current, currentIndex, filteredCards.length, updateCardStatus, updateUserProgressWord, goToIndex, onComplete, filter, clearSession])

    // Update local state + advance instantly — no DB call here
    const toggleComplete = useCallback(() => {
        if (!current) return
        const wasCompleted = current.status === 'completed'

        if (wasCompleted) {
            // Un-completing — goes back to new (not revision)
            updateCardStatus(current.id, 'new', { status: null })
            updateUserProgressWord(current.id, null)
        } else {
            updateCardStatus(current.id, 'completed', { status: 1 })
            updateUserProgressWord(current.id, 'completed', {
                word_ar: current.word,
                word_di: current.word_diacritic,
                word_tr: current.transliteration,
                level: current.level,
                theme: current.theme_id,
                meaning: current.definition,
            })
        }

        if (!wasCompleted) {
            if (currentIndex < filteredCards.length - 1) {
                goToIndex(currentIndex + 1)
            } else if (filter === 'all') {
                onComplete?.()
            }
        }
    }, [current, currentIndex, filteredCards.length, updateCardStatus, updateUserProgressWord, goToIndex, onComplete, filter])

    const handleFilterChange = useCallback(
        (newFilter: FilterType) => {
            setFilter(newFilter)
            const next = newFilter === 'all' ? allCards : allCards.filter(c => c.status === newFilter)
            const idx = next.findIndex(c => c.status === 'new')
            setCurrentIndex(idx === -1 ? 0 : idx)
            setCardKey(k => k + 1)
        },
        [allCards]
    )

    if (!current) return null

    const transliterationFontSize = `calc(1.45rem * ${textScale})`
    const definitionFontSize = `calc(2.8rem * ${textScale})`

    const mobileActionBtnSx = {
        textTransform: 'none' as const,
        fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.82rem',
        px: '12px', py: '6px', borderRadius: '20px', whiteSpace: 'nowrap' as const,
        flexShrink: 0, minWidth: 0, lineHeight: 1.4,
        '& .MuiButton-startIcon': { mr: '4px', ml: 0 },
        '& .MuiButton-startIcon svg': { fontSize: '0.9rem !important' },
    }

    const cardInner = (
        <Box
            sx={{
                background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px',
                padding: { xs: '1.25rem 0.875rem', md: '2rem 1.5rem 1.75rem' },
                minHeight: { xs: '300px', md: '340px' }, display: 'flex', flexDirection: 'column',
                position: 'relative',
            }}
        >

                    {/* Progress bar */}
                    <Box sx={{ position: 'relative', mb: '1.25rem' }}>
                        <Box sx={{ height: '2px', background: 'rgba(184,134,11,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', background: 'linear-gradient(90deg, #b8860b, #d4a843)', borderRadius: '999px', transition: 'width 0.4s ease', width: `${progressPct}%` }} />
                        </Box>
                        {progressBump && (
                            <Fade in key={progressBump.key} timeout={{ enter: 300, exit: 500 }}>
                                <Typography sx={{
                                    position: 'absolute',
                                    left: `calc(${progressPct}% - 14px)`,
                                    top: -20,
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#2e7d32',
                                    background: 'rgba(46,125,50,0.1)',
                                    px: 0.6,
                                    py: 0.2,
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                    lineHeight: 1,
                                }}>
                                    +{progressBump.value}%
                                </Typography>
                            </Fade>
                        )}
                    </Box>

                    {/* Status chips + progress % */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: filter !== 'all' ? 0.5 : 1.5 }}>
                        <StatusChips newCount={newCount} revisionCount={revisionCount} completedCount={completedCount} filter={filter} currentStatus={current?.status ?? null} onFilterChange={handleFilterChange} />
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: '#b8860b', flexShrink: 0, ml: 1 }}>{progressPct}%</Typography>
                    </Box>
                    {filter !== 'all' && (
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            color: '#b8860b',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            mb: 1.5,
                        }}>
                            Filtered · {filteredCards.length} {filter} card{filteredCards.length !== 1 ? 's' : ''}
                        </Typography>
                    )}

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

                            {!user && (
                                <Box sx={{ mt: 1.5, mb: 0.5, textAlign: 'center' }}>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: '#b8860b' }}>
                                        <Box component="span" onClick={onOpenAuthDialog} sx={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
                                            Log in
                                        </Box>
                                        {' '}to track your progress
                                    </Typography>
                                </Box>
                            )}

                            {/* Desktop action buttons */}
                            <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', mt: '1.25rem' }}>
                                <Button variant="outlined" size="small" onClick={handlePrevious} disabled={!canGoBack} startIcon={<NavigateBefore sx={{ fontSize: '1.1rem !important' }} />}
                                    sx={{ borderColor: '#7a6e65', color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px', textTransform: 'none', '&:hover': { background: 'rgba(122,110,101,0.08)' }, '&:disabled': { opacity: 0.4 } }}>Back</Button>
                                <Button variant={current.status === 'revision' ? 'contained' : 'outlined'} color="primary" size="small" onClick={toggleRevision} disabled={!user} startIcon={current.status === 'revision' ? <BookmarkAdded sx={{ fontSize: '1.1rem !important' }} /> : <Bookmark sx={{ fontSize: '1.1rem !important' }} />}
                                    sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px' }}>Revision</Button>
                                <Button variant={current.status === 'completed' ? 'contained' : 'outlined'} color="success" size="small" onClick={toggleComplete} disabled={!user} startIcon={current.status === 'completed' ? <DoneAll sx={{ fontSize: '1.1rem !important' }} /> : <Check sx={{ fontSize: '1.1rem !important' }} />}
                                    sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px' }}>{current.status === 'completed' ? 'Completed' : 'Complete'}</Button>
                                <Button variant="outlined" color="warning" size="small" onClick={handleNext} disabled={isLastCard && filter !== 'all'} endIcon={<NavigateNext sx={{ fontSize: '1.1rem !important' }} />}
                                    sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px', '&:disabled': { opacity: 0.4 } }}>
                                    {isLastCardInTheme && filter === 'all' ? 'Next Theme' : 'Skip'}
                                </Button>
                            </Box>

                            {/* Mobile action buttons */}
                            <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'center', gap: '10px', mt: '1rem' }}>
                                <Button variant="outlined" size="small" onClick={handlePrevious} disabled={!canGoBack} startIcon={<NavigateBefore sx={{ fontSize: '0.85rem !important' }} />}
                                    sx={{ ...mobileActionBtnSx, borderColor: canGoBack ? 'rgba(122,110,101,0.4)' : 'rgba(122,110,101,0.15)', color: canGoBack ? '#7a6e65' : 'rgba(122,110,101,0.3)', '&:hover': { background: 'rgba(122,110,101,0.08)' }, '&.Mui-disabled': { opacity: 0.35, border: '1px solid rgba(122,110,101,0.15)' } }}>
                                    Back
                                </Button>
                                <Button variant={current.status === 'revision' ? 'contained' : 'outlined'} color="primary" size="small" onClick={toggleRevision} disabled={!user} startIcon={current.status === 'revision' ? <BookmarkAdded /> : <Bookmark />} sx={mobileActionBtnSx}>Revision</Button>
                                <Button variant={current.status === 'completed' ? 'contained' : 'outlined'} color="success" size="small" onClick={toggleComplete} disabled={!user} startIcon={current.status === 'completed' ? <DoneAll /> : <Check />} sx={mobileActionBtnSx}>{current.status === 'completed' ? 'Completed' : 'Complete'}</Button>
                                <Button variant="outlined" size="small" onClick={handleNext} disabled={isLastCard && filter !== 'all'} endIcon={<NavigateNext sx={{ fontSize: '0.85rem !important' }} />}
                                    sx={{ ...mobileActionBtnSx, borderColor: isLastCard && filter !== 'all' ? 'rgba(184,134,11,0.15)' : 'rgba(184,134,11,0.45)', color: isLastCard && filter !== 'all' ? 'rgba(184,134,11,0.3)' : '#b8860b', '&:hover': { background: 'rgba(184,134,11,0.06)' }, '&.Mui-disabled': { opacity: 0.35, border: '1px solid rgba(184,134,11,0.15)' } }}>
                                    Skip
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

                    {/* Auto-advance loading overlay */}
                    <Fade in={isAutoAdvancing} timeout={300} unmountOnExit>
                        <Box sx={{
                            position: 'absolute', inset: 0, borderRadius: '10px',
                            background: 'rgba(255,255,255,0.92)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 2.5,
                        }}>
                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                <CircularProgress size={90} thickness={2.5} sx={{ color: '#b8860b' }} />
                            </Box>
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#2c1a0e' }}>
                                Loading next theme…
                            </Typography>
                        </Box>
                    </Fade>
            {isMobile && (
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', color: '#6b5f55', textAlign: 'center', mt: 1 }}>
                    Swipe left → Revision · Swipe right → Complete
                </Typography>
            )}
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
                        onDragEnd={handleDragEnd}
                        style={{ touchAction: 'pan-y' }}
                    >
                        {cardInner}
                    </motion.div>
                ) : cardInner}
            </Fade>
        </Box>
    )
}

export default FlashcardQuiz
