// app/flashcards/[slug]/page.tsx

'use client'

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Box, Button, Container, Typography, Collapse, Fade,
    Card, CardContent, CardMedia, CardActionArea, LinearProgress, Skeleton,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    ToggleButton, ToggleButtonGroup, useMediaQuery,
} from '@mui/material'
import {
    ArrowBackSharp,
    Bookmark, BookmarkAdded, Check, DoneAll, NavigateNext, NavigateBefore,
    Settings, Close, MenuBook, TouchApp,
} from '@mui/icons-material'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Navbar from '@/app/components/navbar'
import { useVocabStore } from '@/store/vocabStore'
import type { VocabRow, WordProgress, ThemeProgress } from '@/app/actions/vocab'
import {
    fetchThemesWithProgress,
    upsertWordProgress,
} from '@/app/actions/vocab'

/* ─────────────────────────────────────────────
   Slug → level mapping
───────────────────────────────────────────── */
const SLUG_TO_LEVEL: Record<string, string> = {
    beginner: 'A0',
    elementary: 'A1',
    intermediate: 'A2',
    'upper-intermediate': 'B1',
}
const SLUG_LABELS: Record<string, string> = {
    beginner: 'Beginner',
    elementary: 'Elementary',
    intermediate: 'Intermediate',
    'upper-intermediate': 'Upper Intermediate',
}

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type CardStatus = 'new' | 'revision' | 'completed'
type FilterType = 'all' | 'new' | 'revision' | 'completed'

type CardState = VocabRow & {
    status: CardStatus
    isCompleted: boolean
    isInRevision: boolean
}

type ExampleItem = { arabic: string; diacritic: string; english: string }

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function parseExamples(card: VocabRow): ExampleItem[] {
    if (!card.ex_ar || !card.ex_en) return []
    const ar = card.ex_ar.split(';').map(s => s.trim())
    const di = card.ex_di ? card.ex_di.split(';').map(s => s.trim()) : ar
    const en = card.ex_en.split(';').map(s => s.trim())
    const count = Math.min(ar.length, en.length)
    const items: ExampleItem[] = []
    for (let i = 0; i < count; i++) {
        items.push({ arabic: ar[i] || '', diacritic: di[i] || ar[i] || '', english: en[i] || '' })
    }
    return items
}

function buildQueue(vocab: VocabRow[], progress: WordProgress[]): CardState[] {
    const progressMap = new Map(progress.map(p => [p.word_id, p]))
    const cards: CardState[] = []
    for (const v of vocab) {
        const p = progressMap.get(v.id)
        const isCompleted = p?.is_completed ?? false
        const isInRevision = p?.is_in_revision ?? false

        let status: CardStatus = 'new'
        if (isCompleted) {
            status = 'completed'
        } else if (isInRevision) {
            status = 'revision'
        }

        cards.push({ ...v, status, isCompleted, isInRevision })
    }
    return cards
}

/* ─────────────────────────────────────────────
   PillToggle
───────────────────────────────────────────── */
function PillToggle({
    enabled, onToggle, label, activeColor = '#b8860b',
}: {
    enabled: boolean; onToggle: () => void; label: string; activeColor?: string
}) {
    return (
        <Box
            onClick={onToggle}
            sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                cursor: 'pointer', userSelect: 'none',
                padding: '5px 12px 5px 6px', borderRadius: '999px',
                border: '1px solid',
                borderColor: enabled ? activeColor : 'rgba(122,110,101,0.25)',
                background: enabled ? `${activeColor}14` : 'transparent',
                transition: 'all 0.15s',
                '&:hover': { borderColor: activeColor, background: `${activeColor}0d` },
            }}
        >
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
   SettingsDialog (mobile only)
───────────────────────────────────────────── */
function SettingsDialog({
    open, onClose,
    showDiacritics, onToggleDiacritics,
    alwaysShow, onToggleAlwaysShow,
}: {
    open: boolean; onClose: () => void
    showDiacritics: boolean; onToggleDiacritics: () => void
    alwaysShow: boolean; onToggleAlwaysShow: () => void
}) {
    const ToggleRow = ({
        label, description, enabled, onToggle, activeColor,
    }: {
        label: string; description: string; enabled: boolean; onToggle: () => void; activeColor: string
    }) => (
        <Box
            onClick={onToggle}
            sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', py: 1.25, px: 1.5, borderRadius: '10px',
                border: '1px solid',
                borderColor: enabled ? `${activeColor}55` : 'rgba(122,110,101,0.15)',
                background: enabled ? `${activeColor}08` : 'rgba(122,110,101,0.03)',
                transition: 'all 0.15s', userSelect: 'none',
                '&:hover': { borderColor: `${activeColor}88`, background: `${activeColor}0d` },
            }}
        >
            <Box sx={{ pr: 2 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e', lineHeight: 1.2 }}>
                    {label}
                </Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65', mt: 0.3, lineHeight: 1.4 }}>
                    {description}
                </Typography>
            </Box>
            <Box sx={{
                width: 38, height: 22, borderRadius: '999px', flexShrink: 0,
                background: enabled ? activeColor : 'rgba(122,110,101,0.22)',
                position: 'relative', transition: 'background 0.2s',
            }}>
                <Box sx={{
                    position: 'absolute', top: '3px',
                    left: enabled ? '19px' : '3px',
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
                    transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </Box>
        </Box>
    )

    return (
        <Dialog
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: 340,
                        m: 2,
                        overflow: 'hidden',
                        boxShadow: '0 24px 64px rgba(44,26,14,0.2)',
                    },
                },
            }}
        >
            <DialogTitle sx={{
                fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700,
                color: '#2c1a0e', pb: 0.5, pt: 2.5, px: 2.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                Settings
                <IconButton onClick={onClose} size="small" sx={{ color: '#7a6e65', mr: -0.5 }}>
                    <Close sx={{ fontSize: '1.2rem' }} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 2.5, pt: 1.5, pb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <ToggleRow
                        label="Show Diacritics"
                        description="Display vowel marks on Arabic words"
                        enabled={showDiacritics}
                        onToggle={onToggleDiacritics}
                        activeColor="#b8860b"
                    />
                    <ToggleRow
                        label="Always Show Card"
                        description="Never hide the answer side"
                        enabled={alwaysShow}
                        onToggle={onToggleAlwaysShow}
                        activeColor="#0e2e1f"
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5 }}>
                <Button
                    fullWidth variant="contained" onClick={onClose} disableElevation
                    sx={{
                        background: '#2c1a0e', color: '#f5ede0',
                        fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.95rem',
                        textTransform: 'none', borderRadius: '10px', py: 1.1,
                        '&:hover': { background: '#1a0f08' },
                    }}
                >
                    Done
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
            <Fade in={!showDiacritics} timeout={300} unmountOnExit>
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: { xs: 'clamp(2.4rem, 13vw, 3.8rem)', md: 'clamp(3.3rem, 11vw, 6rem)' },
                    fontWeight: 700, direction: 'rtl', textAlign: 'center',
                    color: '#2c1a0e', lineHeight: 1.2,
                    position: 'absolute', top: 0, left: 0, right: 0,
                }}>
                    {word}
                </Typography>
            </Fade>
            <Fade in={showDiacritics} timeout={300} unmountOnExit>
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: { xs: 'clamp(2.4rem, 13vw, 3.8rem)', md: 'clamp(3.3rem, 11vw, 6rem)' },
                    fontWeight: 700, direction: 'rtl', textAlign: 'center',
                    color: '#0e2e1f', lineHeight: 1.2,
                    position: 'absolute', top: 0, left: 0, right: 0,
                }}>
                    {wordDiacritic}
                </Typography>
            </Fade>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Draggable Word (for the row)
───────────────────────────────────────────── */
function DraggableWord({ word, id }: { word: string; id: string }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        touchAction: 'none',
        zIndex: isDragging ? 1000 : 1,
    }

    return (
        <Button
            ref={setNodeRef}
            variant="outlined"
            {...attributes}
            {...listeners}
            sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                fontWeight: 600,
                color: '#2c1a0e',
                borderColor: 'rgba(184,134,11,0.4)',
                borderRadius: '30px',
                padding: { xs: '4px 12px', sm: '6px 16px' },
                textTransform: 'none',
                '&:hover': {
                    background: 'rgba(184,134,11,0.08)',
                    borderColor: '#b8860b',
                },
                ...style,
            }}
        >
            {word}
        </Button>
    )
}

/* ─────────────────────────────────────────────
   InteractiveSentenceBuilder (preserves order when toggling diacritics)
───────────────────────────────────────────────── */
function InteractiveSentenceBuilder({
    plainWords,
    diacriticWords,
    englishTranslation,
    showDiacritics,
    resetKey,
}: {
    plainWords: string[]
    diacriticWords: string[]
    englishTranslation: string
    showDiacritics: boolean
    resetKey: string | number // changes only when card changes, not on diacritics toggle
}) {
    const [order, setOrder] = useState<number[]>([])
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
    const [checking, setChecking] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // The actual words to display, derived from order and current showDiacritics
    const displayedWords = useMemo(() => {
        const source = showDiacritics ? diacriticWords : plainWords
        return order.map(idx => source[idx])
    }, [order, plainWords, diacriticWords, showDiacritics])

    const correctDisplayedWords = useMemo(() => {
        const source = showDiacritics ? diacriticWords : plainWords
        return source
    }, [plainWords, diacriticWords, showDiacritics])

    const wordIds = useMemo(() => displayedWords.map((_, idx) => `word-${idx}`), [displayedWords])

    // Reset order only when resetKey changes (i.e., new card)
    useEffect(() => {
        const initialOrder = plainWords.map((_, idx) => idx)
        // Shuffle
        for (let i = initialOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[initialOrder[i], initialOrder[j]] = [initialOrder[j], initialOrder[i]]
        }
        setOrder(initialOrder)
        setFeedback(null)
        setChecking(false)
    }, [resetKey, plainWords.length])

    const handleDragEnd = (event: DragEndEvent) => {
        if (feedback === 'correct' || checking) return
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = wordIds.indexOf(active.id as string)
        const newIndex = wordIds.indexOf(over.id as string)
        setOrder(arrayMove(order, oldIndex, newIndex))
        setFeedback(null)
    }

    const checkOrder = () => {
        const isCorrect = displayedWords.join(' ') === correctDisplayedWords.join(' ')
        if (isCorrect) {
            setFeedback('correct')
        } else {
            setFeedback('incorrect')
            setChecking(true)
            setTimeout(() => setChecking(false), 500)
        }
    }

    const resetGame = () => {
        const newOrder = [...order]
        for (let i = newOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]]
        }
        setOrder(newOrder)
        setFeedback(null)
        setChecking(false)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <Box sx={{ mt: 2 }}>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: { xs: '0.8rem', sm: '0.85rem' },
                    fontWeight: 500,
                    color: '#7a6e65',
                    textAlign: 'center',
                    mb: 1.5,
                }}>
                    Drag and drop the words in the correct order
                </Typography>

                <SortableContext items={wordIds} strategy={horizontalListSortingStrategy}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'row-reverse',
                        flexWrap: 'wrap',
                        gap: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        p: 1.5,
                        mb: 2,
                        border: '2px solid',
                        borderColor: feedback === 'correct' ? '#2e7d32' : feedback === 'incorrect' ? '#d32f2f' : 'rgba(184,134,11,0.3)',
                        borderRadius: '12px',
                        background: feedback === 'correct' ? 'rgba(46,125,50,0.04)' : feedback === 'incorrect' ? 'rgba(211,47,47,0.04)' : 'rgba(184,134,11,0.02)',
                        transition: 'border-color 0.3s, background 0.3s',
                    }}>
                        {displayedWords.map((word, idx) => (
                            <DraggableWord key={idx} word={word} id={`word-${idx}`} />
                        ))}
                    </Box>
                </SortableContext>

                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    fontWeight: 500,
                    color: '#2c1a0e',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    mb: 2,
                }}>
                    {englishTranslation}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
                    <Button
                        variant="contained"
                        onClick={checkOrder}
                        disabled={feedback === 'correct' || checking}
                        sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            borderRadius: '20px',
                            px: 3,
                            background: '#b8860b',
                            '&:hover': { background: '#9a6e09' },
                            '&:disabled': { opacity: 0.5 },
                        }}
                    >
                        Check
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={resetGame}
                        sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            textTransform: 'none',
                            borderRadius: '20px',
                            px: 3,
                            borderColor: 'rgba(184,134,11,0.5)',
                            color: '#2c1a0e',
                            '&:hover': { borderColor: '#b8860b', background: 'rgba(184,134,11,0.05)' },
                        }}
                    >
                        Reset
                    </Button>
                </Box>

                {feedback === 'incorrect' && (
                    <Typography sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.8rem',
                        color: '#d32f2f',
                        mt: 1.5,
                        textAlign: 'center',
                        fontWeight: 500,
                    }}>
                        Not quite right – try again!
                    </Typography>
                )}
                {feedback === 'correct' && (
                    <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.9rem',
                            color: '#2e7d32',
                            fontWeight: 600,
                        }}>
                            Perfect! ✓
                        </Typography>
                    </Box>
                )}
            </Box>
        </DndContext>
    )
}

/* ─────────────────────────────────────────────
   ExampleSentences (passes stable resetKey)
───────────────────────────────────────────── */
function ExampleSentences({ card, revealed, showDiacritics }: {
    card: VocabRow; revealed: boolean; showDiacritics: boolean
}) {
    const examples = useMemo(() => parseExamples(card), [card])
    const [viewMode, setViewMode] = useState<'example' | 'try'>('example')
    const isMobile = useMediaQuery('(max-width:600px)')

    if (!revealed || examples.length === 0) return null

    const firstExample = examples[0]
    const secondExample = examples[1]

    // Extract plain and diacritic word arrays for the second example
    const plainSecondWords = secondExample
        ? secondExample.arabic.split(' ').filter(w => w.trim() !== '')
        : []
    const diacriticSecondWords = secondExample
        ? secondExample.diacritic.split(' ').filter(w => w.trim() !== '')
        : []

    // Stable resetKey based on card id – only changes when the card changes
    const resetKey = card.id

    const toggleButtonGroup = (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, val) => val && setViewMode(val)}
                size="small"
                sx={{
                    display: 'flex',
                    gap: 2,
                    pb: 2,
                    '& .MuiToggleButton-root': {
                        fontFamily: 'Jost, sans-serif',
                        fontWeight: 500,
                        fontSize: { xs: '0.8rem', sm: '0.85rem' },
                        textTransform: 'none',
                        borderRadius: '20px',
                        px: 2,
                        border: '1px solid rgba(184,134,11,0.3)',
                        color: '#2c1a0e',
                        '&.Mui-selected': {
                            background: 'rgba(184,134,11,0.15)',
                            color: '#b8860b',
                            borderColor: '#b8860b',
                        },
                    },
                }}
            >
                <ToggleButton value="example">
                    <MenuBook sx={{ fontSize: 16, mr: 0.5 }} />
                    Example
                </ToggleButton>
                <ToggleButton value="try">
                    <TouchApp sx={{ fontSize: 16, mr: 0.5 }} />
                    You Try
                </ToggleButton>
            </ToggleButtonGroup>
        </Box>
    )

    return (
        <Collapse in={revealed} timeout={300}>
            <Box sx={{
                background: 'rgba(245,237,224,0.5)', borderRadius: '8px',
                padding: { xs: '1rem', sm: '1.25rem' }, margin: '1.25rem 0',
                borderLeft: '3px solid #b8860b',
            }}>
                {toggleButtonGroup}

                {viewMode === 'example' ? (
                    firstExample ? (
                        <Box>
                            <Typography sx={{
                                fontFamily: "'EB Garamond', serif",
                                fontSize: { xs: 'clamp(1.25rem, 3vw, 1.6rem)', sm: 'clamp(1.35rem, 3vw, 1.85rem)' },
                                color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.5, mb: 0.35,
                            }}>
                                {showDiacritics ? firstExample.diacritic : firstExample.arabic}
                            </Typography>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: { xs: 'clamp(0.95rem, 2vw, 1.15rem)', sm: 'clamp(1.05rem, 2vw, 1.3rem)' },
                                color: '#7a6e65', fontStyle: 'italic', textAlign: 'left', lineHeight: 1.5,
                            }}>
                                {firstExample.english}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', textAlign: 'center', color: '#7a6e65' }}>
                            No example available.
                        </Typography>
                    )
                ) : secondExample ? (
                    <InteractiveSentenceBuilder
                        plainWords={plainSecondWords}
                        diacriticWords={diacriticSecondWords}
                        englishTranslation={secondExample.english}
                        showDiacritics={showDiacritics}
                        resetKey={resetKey}
                    />
                ) : (
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', textAlign: 'center', color: '#7a6e65' }}>
                        No interactive example available.
                    </Typography>
                )}
            </Box>
        </Collapse>
    )
}

/* ─────────────────────────────────────────────
   StatusChips
───────────────────────────────────────────── */
const STATUS_CHIP_COLORS: Record<CardStatus, { activeBg: string; activeColor: string; border: string }> = {
    new: { activeBg: 'rgba(122,110,101,0.12)', activeColor: '#4a3d35', border: 'rgba(122,110,101,0.35)' },
    revision: { activeBg: 'rgba(21,101,192,0.1)', activeColor: '#0d47a1', border: 'rgba(21,101,192,0.35)' },
    completed: { activeBg: 'rgba(46,125,50,0.1)', activeColor: '#1b5e20', border: 'rgba(46,125,50,0.35)' },
}

function StatusChips({
    newCount, revisionCount, completedCount, filter, currentStatus, onFilterChange,
}: {
    newCount: number; revisionCount: number; completedCount: number
    filter: FilterType; currentStatus: CardStatus | null
    onFilterChange: (f: FilterType) => void
}) {
    const chips: { type: CardStatus; count: number }[] = [
        { type: 'new', count: newCount },
        { type: 'revision', count: revisionCount },
        { type: 'completed', count: completedCount },
    ]
    return (
        <Box sx={{ display: 'flex', gap: { xs: 0.75, sm: 1.5 }, flexWrap: 'wrap' }}>
            {chips.map(({ type, count }) => {
                const colors = STATUS_CHIP_COLORS[type]
                const isFilterActive = filter === type
                const isCurrentCard = currentStatus === type
                const isHighlighted = isFilterActive || isCurrentCard
                return (
                    <Box
                        key={type}
                        onClick={() => onFilterChange(filter === type ? 'all' : type)}
                        sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: '12px', sm: '13px', md: '14px' },
                            fontWeight: isHighlighted ? 700 : 500,
                            padding: { xs: '4px 10px', sm: '5px 14px' },
                            borderRadius: '999px',
                            border: `${isHighlighted ? 2 : 1}px solid`,
                            borderColor: isHighlighted ? colors.border : 'rgba(122,110,101,0.18)',
                            color: isHighlighted ? colors.activeColor : '#7a6e65',
                            background: isHighlighted ? colors.activeBg : 'transparent',
                            cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
                            outline: isCurrentCard && !isFilterActive ? `2px solid ${colors.border}` : 'none',
                            outlineOffset: '1px',
                            '&:hover': { background: colors.activeBg, borderColor: colors.border, color: colors.activeColor },
                        }}
                    >
                        {count} {type}
                    </Box>
                )
            })}
        </Box>
    )
}

/* ─────────────────────────────────────────────
   FlashcardQuiz (fixed counts: revision + completed independent)
───────────────────────────────────────────── */
function FlashcardQuiz({
    initialQueue,
    themeId,
    showDiacritics,
    alwaysShow,
    onComplete,
    themeLabel,
}: {
    initialQueue: CardState[]
    themeId: number
    showDiacritics: boolean
    alwaysShow: boolean
    onComplete: () => void
    themeLabel: string
    totalInTheme: number
    alreadyCompletedCount: number
}) {
    const updateLocalProgress = useVocabStore(s => s.updateLocalProgress)
    const [, startTransition] = useTransition()

    const [allCards, setAllCards] = useState<CardState[]>(initialQueue)
    const [filter, setFilter] = useState<FilterType>('all')
    const [revealed, setRevealed] = useState(alwaysShow)
    const [cardKey, setCardKey] = useState(0)

    useEffect(() => {
        if (alwaysShow) setRevealed(true)
    }, [alwaysShow])

    // Derived filtered cards based on the current filter.
    const filteredCards = useMemo(
        () => (filter === 'all' ? allCards : allCards.filter(c => c.status === filter)),
        [allCards, filter]
    )

    // If the current filter yields no cards, reset the filter to 'all'.
    useEffect(() => {
        if (filter !== 'all' && filteredCards.length === 0) {
            setFilter('all')
        }
    }, [filter, filteredCards.length])

    // Start index: first 'new' card if available, otherwise 0.
    const startIndex = useMemo(() => {
        const idx = filteredCards.findIndex(c => c.status === 'new')
        return idx === -1 ? 0 : idx
    }, [filteredCards])

    const [currentIndex, setCurrentIndex] = useState<number>(startIndex)
    const current = filteredCards[currentIndex] ?? null
    const canGoBack = currentIndex > 0
    const canGoForward = currentIndex < filteredCards.length - 1

    // Counts based on boolean flags (independent)
    const newCount = allCards.filter(c => !c.isCompleted && !c.isInRevision).length
    const revisionCount = allCards.filter(c => c.isInRevision).length
    const completedCount = allCards.filter(c => c.isCompleted).length
    const progressPct = allCards.length > 0 ? Math.round((completedCount / allCards.length) * 100) : 0

    const persist = useCallback(
        (card: CardState, isCompleted: boolean, isInRevision: boolean) => {
            updateLocalProgress(themeId, card.id, {
                is_completed: isCompleted,
                is_in_revision: isInRevision,
            })
            startTransition(() => {
                upsertWordProgress({ wordId: card.id, isCompleted, isInRevision }).catch(
                    console.error
                )
            })
        },
        [themeId, updateLocalProgress]
    )

    const updateCardStatus = useCallback(
        (
            cardId: number,
            newStatus: CardStatus,
            opts?: { isCompleted?: boolean; isInRevision?: boolean }
        ) => {
            setAllCards(prev =>
                prev.map(c => {
                    if (c.id !== cardId) return c
                    const isCompleted = opts?.isCompleted ?? c.isCompleted
                    const isInRevision = opts?.isInRevision ?? c.isInRevision
                    let status: CardStatus = 'new'
                    if (isCompleted) status = 'completed'
                    else if (isInRevision) status = 'revision'
                    return { ...c, status, isCompleted, isInRevision }
                })
            )
            if (opts) {
                const card = allCards.find(c => c.id === cardId)
                if (card) {
                    const isCompleted = opts.isCompleted ?? card.isCompleted
                    const isInRevision = opts.isInRevision ?? card.isInRevision
                    persist(card, isCompleted, isInRevision)
                }
            }
        },
        [allCards, persist]
    )

    const goToIndex = useCallback(
        (newIndex: number) => {
            if (newIndex >= 0 && newIndex < filteredCards.length) {
                setCurrentIndex(newIndex)
                if (!alwaysShow) setRevealed(false)
                setCardKey(k => k + 1)
            }
        },
        [filteredCards.length, alwaysShow]
    )

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) goToIndex(currentIndex - 1)
    }, [currentIndex, goToIndex])

    const handleNext = useCallback(() => {
        if (canGoForward) goToIndex(currentIndex + 1)
    }, [canGoForward, currentIndex, goToIndex])

    const toggleRevision = useCallback(() => {
        if (!current) return
        const toRevision = !current.isInRevision
        updateCardStatus(current.id, toRevision ? 'revision' : 'new', {
            isInRevision: toRevision,
        })
        // Filter remains completely unchanged – only the card's status changes.
    }, [current, updateCardStatus])

    const toggleComplete = useCallback(() => {
        if (!current) return
        if (current.isCompleted) {
            updateCardStatus(current.id, current.isInRevision ? 'revision' : 'new', {
                isCompleted: false,
            })
        } else {
            updateCardStatus(current.id, 'completed', { isCompleted: true })
            if (canGoForward) {
                goToIndex(currentIndex + 1)
            }
        }
        // Filter remains unchanged.
    }, [current, currentIndex, canGoForward, updateCardStatus, goToIndex])

    const handleFilterChange = useCallback(
        (newFilter: FilterType) => {
            // This is the ONLY place the filter changes.
            setFilter(newFilter)
            const next = newFilter === 'all' ? allCards : allCards.filter(c => c.status === newFilter)
            const idx = next.findIndex(c => c.status === 'new')
            setCurrentIndex(idx === -1 ? 0 : idx)
            if (!alwaysShow) setRevealed(false)
            setCardKey(k => k + 1)
        },
        [allCards, alwaysShow]
    )

    if (!current) return null

    const mobileActionBtnSx = {
        textTransform: 'none' as const,
        fontFamily: 'Jost, sans-serif',
        fontWeight: 500,
        fontSize: '0.82rem',
        px: '12px',
        py: '6px',
        borderRadius: '20px',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
        minWidth: 0,
        lineHeight: 1.4,
        '& .MuiButton-startIcon': { mr: '4px', ml: 0 },
        '& .MuiButton-startIcon svg': { fontSize: '0.9rem !important' },
    }

    return (
        <Fade in key={`${cardKey}-${current.id}`} timeout={400}>
            <Box
                sx={{
                    background: '#fff',
                    border: '1px solid rgba(184,134,11,0.2)',
                    borderRadius: '10px',
                    padding: { xs: '1.25rem 0.875rem', md: '2rem 1.5rem 1.75rem' },
                    minHeight: { xs: '300px', md: '340px' },
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box
                    sx={{
                        height: '2px',
                        background: 'rgba(184,134,11,0.1)',
                        borderRadius: '999px',
                        mb: '1.25rem',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #b8860b, #d4a843)',
                            borderRadius: '999px',
                            transition: 'width 0.4s ease',
                            width: `${progressPct}%`,
                        }}
                    />
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1.5,
                    }}
                >
                    <StatusChips
                        newCount={newCount}
                        revisionCount={revisionCount}
                        completedCount={completedCount}
                        filter={filter}
                        currentStatus={current?.status ?? null}
                        onFilterChange={handleFilterChange}
                    />
                    <Typography
                        sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: '#b8860b',
                            flexShrink: 0,
                            ml: 1,
                        }}
                    >
                        {progressPct}%
                    </Typography>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ pt: { xs: 3 } }}>
                        <AnimatedArabicWord
                            word={current.word}
                            wordDiacritic={current.word_diacritic}
                            showDiacritics={showDiacritics}
                        />
                    </Box>

                    <Collapse in={revealed} timeout={300}>
                        <Box sx={{ borderTop: '1px solid rgba(184,134,11,0.1)', margin: '1rem 0' }} />

                        <Box sx={{ textAlign: 'center', mb: { xs: 0.5, md: 1 } }}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    padding: '3px 10px',
                                    borderRadius: '999px',
                                    background: 'rgba(122,110,101,0.08)',
                                    color: '#7a6e65',
                                }}
                            >
                                {current.type}
                            </Box>
                        </Box>

                        <Typography
                            sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: { xs: 'clamp(1.1rem, 2.2vw, 1.45rem)' },
                                fontStyle: 'italic',
                                color: '#b8860b',
                                textAlign: 'center',
                                letterSpacing: '0.05em',
                                mt: { xs: 1, md: 1.5 },
                            }}
                        >
                            {current.transliteration}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: "'EB Garamond', serif",
                                fontSize: { xs: 'clamp(1.8rem, 4.5vw, 2.8rem)' },
                                fontWeight: 700,
                                color: '#2c1a0e',
                                textAlign: 'center',
                                margin: '0.25rem 0',
                            }}
                        >
                            {current.definition}
                        </Typography>
                        {current.root && current.root !== '-' && (
                            <Typography
                                sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: { xs: 'clamp(0.9rem, 1.6vw, 1.2rem)' },
                                    color: '#7a6e65',
                                    textAlign: 'center',
                                    direction: 'rtl',
                                    opacity: 0.75,
                                    mb: 0.5,
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {current.root}
                            </Typography>
                        )}

                        <ExampleSentences
                            card={current}
                            revealed={revealed}
                            showDiacritics={showDiacritics}
                        />

                        {/* Desktop buttons */}
                        <Box
                            sx={{
                                display: { xs: 'none', sm: 'grid' },
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '8px',
                                mt: '1.25rem',
                            }}
                        >
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handlePrevious}
                                disabled={!canGoBack}
                                startIcon={<NavigateBefore sx={{ fontSize: '1.1rem !important' }} />}
                                sx={{
                                    borderColor: '#7a6e65',
                                    color: '#7a6e65',
                                    fontFamily: 'Jost, sans-serif',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    padding: '0.6rem 0.5rem',
                                    borderRadius: '6px',
                                    textTransform: 'none',
                                    '&:hover': { background: 'rgba(122,110,101,0.08)' },
                                    '&:disabled': { opacity: 0.4 },
                                }}
                            >
                                Back
                            </Button>
                            <Button
                                variant={current.isInRevision ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={toggleRevision}
                                startIcon={
                                    current.isInRevision ? (
                                        <BookmarkAdded sx={{ fontSize: '1.1rem !important' }} />
                                    ) : (
                                        <Bookmark sx={{ fontSize: '1.1rem !important' }} />
                                    )
                                }
                                sx={{
                                    textTransform: 'none',
                                    fontFamily: 'Jost, sans-serif',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    padding: '0.6rem 0.5rem',
                                    borderRadius: '6px',
                                }}
                            >
                                Revision
                            </Button>
                            <Button
                                variant={current.isCompleted ? 'contained' : 'outlined'}
                                color="success"
                                size="small"
                                onClick={toggleComplete}
                                startIcon={
                                    current.isCompleted ? (
                                        <DoneAll sx={{ fontSize: '1.1rem !important' }} />
                                    ) : (
                                        <Check sx={{ fontSize: '1.1rem !important' }} />
                                    )
                                }
                                sx={{
                                    textTransform: 'none',
                                    fontFamily: 'Jost, sans-serif',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    padding: '0.6rem 0.5rem',
                                    borderRadius: '6px',
                                }}
                            >
                                {current.isCompleted ? 'Completed' : 'Complete'}
                            </Button>
                            <Button
                                variant="outlined"
                                color="warning"
                                size="small"
                                onClick={handleNext}
                                disabled={!canGoForward}
                                endIcon={<NavigateNext sx={{ fontSize: '1.1rem !important' }} />}
                                sx={{
                                    textTransform: 'none',
                                    fontFamily: 'Jost, sans-serif',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    padding: '0.6rem 0.5rem',
                                    borderRadius: '6px',
                                    opacity: canGoForward ? 1 : 0.5,
                                }}
                            >
                                Next
                            </Button>
                        </Box>

                        {/* Mobile buttons */}
                        <Box
                            sx={{
                                display: { xs: 'flex', sm: 'none' },
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                mt: '1rem',
                            }}
                        >
                            <IconButton
                                onClick={handlePrevious}
                                disabled={!canGoBack}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    border: '1px solid',
                                    borderColor: canGoBack
                                        ? 'rgba(122,110,101,0.4)'
                                        : 'rgba(122,110,101,0.15)',
                                    color: canGoBack ? '#7a6e65' : 'rgba(122,110,101,0.3)',
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    transition: 'all 0.15s',
                                    '&:hover': { background: 'rgba(122,110,101,0.08)' },
                                    '&.Mui-disabled': {
                                        opacity: 0.35,
                                        border: '1px solid rgba(122,110,101,0.15)',
                                    },
                                }}
                            >
                                <NavigateBefore sx={{ fontSize: '1.35rem' }} />
                            </IconButton>
                            <Button
                                variant={current.isInRevision ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={toggleRevision}
                                startIcon={current.isInRevision ? <BookmarkAdded /> : <Bookmark />}
                                sx={mobileActionBtnSx}
                            >
                                Revision
                            </Button>
                            <Button
                                variant={current.isCompleted ? 'contained' : 'outlined'}
                                color="success"
                                size="small"
                                onClick={toggleComplete}
                                startIcon={current.isCompleted ? <DoneAll /> : <Check />}
                                sx={mobileActionBtnSx}
                            >
                                {current.isCompleted ? 'Completed' : 'Complete'}
                            </Button>
                            <IconButton
                                onClick={handleNext}
                                disabled={!canGoForward}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    border: '1px solid',
                                    borderColor: canGoForward
                                        ? 'rgba(184,134,11,0.45)'
                                        : 'rgba(184,134,11,0.15)',
                                    color: canGoForward ? '#b8860b' : 'rgba(184,134,11,0.3)',
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    transition: 'all 0.15s',
                                    '&:hover': { background: 'rgba(184,134,11,0.06)' },
                                    '&.Mui-disabled': {
                                        opacity: 0.35,
                                        border: '1px solid rgba(184,134,11,0.15)',
                                    },
                                }}
                            >
                                <NavigateNext sx={{ fontSize: '1.35rem' }} />
                            </IconButton>
                        </Box>
                    </Collapse>

                    {!revealed && (
                        <Box sx={{ mt: 'auto', pt: { xs: 0, sm: 0, md: 4 }, width: '100%' }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setRevealed(true)}
                                sx={{
                                    padding: '0.875rem',
                                    border: '1px solid rgba(184,134,11,0.3)',
                                    borderRadius: '6px',
                                    color: '#2c1a0e',
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: { xs: 'clamp(1rem, 1.6vw, 1.2rem)' },
                                    fontWeight: 500,
                                    letterSpacing: '0.04em',
                                    textTransform: 'none',
                                    transition:
                                        'background 0.15s, border-color 0.15s, transform 0.2s',
                                    '&:hover': {
                                        background: 'rgba(184,134,11,0.05)',
                                        borderColor: 'rgba(184,134,11,0.5)',
                                        transform: 'translateY(-1px)',
                                    },
                                }}
                            >
                                Show answer
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
        </Fade>
    )
}

/* ─────────────────────────────────────────────
   ThemeCard
───────────────────────────────────────────── */
function ThemeCard({ theme, isActive, onClick }: {
    theme: ThemeProgress; isActive: boolean; onClick: () => void
}) {
    const progress = theme.total_words > 0 ? Math.round((theme.completed_count / theme.total_words) * 100) : 0
    return (
        <Card sx={{
            width: '100%', border: '1px solid rgba(184,134,11,0.15)',
            borderRadius: '8px', overflow: 'hidden', background: '#fff',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            ...(isActive && { borderColor: '#b8860b', boxShadow: '0 0 0 2px rgba(184,134,11,0.12)' }),
            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 30px rgba(44,26,14,0.08)' },
        }}>
            <CardActionArea onClick={onClick}>
                <CardMedia component="img" image="/awm1.png" alt={theme.display_name} sx={{ objectFit: 'cover', borderBottom: '1px solid rgba(184,134,11,0.1)' }} />
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                    <Typography gutterBottom sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.5rem' }, fontWeight: 700, color: '#2c1a0e', lineHeight: 1.2 }}>
                        {theme.display_name}
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.95rem' }, color: '#7a6e65', mb: 1.5 }}>
                        {theme.total_words} words
                        {theme.revision_count > 0 && <Box component="span" sx={{ ml: 1.5, color: '#1565c0' }}>· {theme.revision_count} in revision</Box>}
                    </Typography>
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b8860b' }}>Progress</Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#2c1a0e' }}>{progress}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(184,134,11,0.1)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #b8860b 0%, #d4a843 100%)', borderRadius: 3 } }} />
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
    )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function FlashcardSlugPage() {
    const params = useParams()
    const router = useRouter()
    const slug = (params?.slug as string) ?? 'beginner'
    const level = SLUG_TO_LEVEL[slug] ?? 'A0'
    const label = SLUG_LABELS[slug] ?? slug

    const fetchTheme = useVocabStore(s => s.fetchTheme)
    const loadingThemeId = useVocabStore(s => s.loadingThemeId)

    const [themes, setThemes] = useState<any[]>([])
    const [themesLoading, setThemesLoading] = useState(true)
    const [selectedTheme, setSelectedTheme] = useState<any>(null)
    const [activeQueue, setActiveQueue] = useState<CardState[]>([])
    const [showDiacritics, setShowDiacritics] = useState(true)
    const [alwaysShow, setAlwaysShow] = useState(false)
    const [quizKey, setQuizKey] = useState(0)
    const [settingsOpen, setSettingsOpen] = useState(false)

    useEffect(() => {
        let cancelled = false
        setThemesLoading(true)
        setSelectedTheme(null)
        fetchThemesWithProgress(level)
            .then(data => { if (!cancelled) setThemes(data) })
            .catch(err => { console.error(err); if (!cancelled) setThemes([]) })
            .finally(() => { if (!cancelled) setThemesLoading(false) })
        return () => { cancelled = true }
    }, [slug, level])

    const handleThemeSelect = useCallback(async (theme: ThemeProgress) => {
        if (!theme?.theme_id || Number.isNaN(theme.theme_id)) return
        setSelectedTheme(theme)
        try {
            const { vocab, progress } = await fetchTheme(theme.theme_id)
            setActiveQueue(buildQueue(vocab, progress))
            setQuizKey(k => k + 1)
        } catch (err) {
            console.error(err)
            setActiveQueue([])
        }
    }, [fetchTheme])

    const handleBackToThemes = useCallback(() => {
        fetchThemesWithProgress(level).then(setThemes).catch(console.error)
        setSelectedTheme(null)
        setActiveQueue([])
    }, [level])

    const overallProgress = useMemo(() => {
        const total = themes.reduce((s, t) => s + t.total_words, 0)
        if (total === 0) return 0
        return Math.round(themes.reduce((s, t) => s + t.completed_count, 0) / total * 100)
    }, [themes])

    const isLoadingVocab = selectedTheme != null && loadingThemeId === selectedTheme.theme_id
    const validThemes = themes.filter((t): t is ThemeProgress => t.theme_id != null && !Number.isNaN(t.theme_id))

    return (
        <>
            <Navbar />
            <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} showDiacritics={showDiacritics} onToggleDiacritics={() => setShowDiacritics(p => !p)} alwaysShow={alwaysShow} onToggleAlwaysShow={() => setAlwaysShow(p => !p)} />

            <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh' }}>
                <Box sx={{ display: { xs: selectedTheme ? 'none' : 'block', sm: 'block' }, background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)', pt: { xs: 10, sm: 12, md: 12 }, pb: { xs: 3, sm: 4, md: 4 }, position: 'relative', overflow: 'hidden' }}>
                    <Typography aria-hidden="true" sx={{ position: 'absolute', top: -30, right: -10, fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: { xs: '6.5rem', sm: '11rem', md: '15rem' }, color: 'rgba(255,255,255,0.03)', userSelect: 'none', lineHeight: 1 }}>أ</Typography>
                    <Container maxWidth="xl">
                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: '2rem', sm: '2.6rem', md: '3.8rem' }, fontWeight: 700, color: '#f5ede0', lineHeight: 1.1, mb: 2 }}>{label}</Typography>
                        <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: 400 }, mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1.1rem' }, color: 'rgba(245,237,224,0.7)', fontWeight: 500 }}>Overall Progress</Typography>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1.1rem' }, color: '#d4a843', fontWeight: 600 }}>{themesLoading ? '—' : `${overallProgress}%`}</Typography>
                            </Box>
                            <LinearProgress variant={themesLoading ? 'indeterminate' : 'determinate'} value={overallProgress} sx={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #b8860b 0%, #d4a843 100%)', borderRadius: 4 } }} />
                        </Box>
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '0.9rem', sm: '1rem', md: '1.2rem' }, color: 'rgba(245,237,224,0.55)', lineHeight: 1.7, maxWidth: 500 }}>{themesLoading ? '…' : `${themes.reduce((s, t) => s + t.total_words, 0)} words across ${themes.length} themes`}</Typography>
                    </Container>
                </Box>

                <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4, md: 6 }, pt: { xs: selectedTheme ? 10 : 4, sm: 4, md: 6 } }}>
                    {selectedTheme ? (
                        <Box>
                            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: { sm: 3, md: 4 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                                    <Button variant="outlined" size="small" startIcon={<ArrowBackSharp sx={{ fontSize: { sm: 15, md: 19 } }} />} onClick={handleBackToThemes} sx={{ borderColor: 'rgba(184,134,11,0.3)', color: '#2c1a0e', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: { sm: '0.85rem', md: '0.95rem' }, textTransform: 'none', borderRadius: '6px', px: { sm: 1.5, md: 2 }, flexShrink: 0, '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: '#b8860b' } }}>Themes</Button>
                                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { sm: '1.6rem', md: '2.2rem' }, fontWeight: 700, color: '#2c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTheme.display_name}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                                    <PillToggle enabled={alwaysShow} onToggle={() => setAlwaysShow(p => !p)} label="Always show card" activeColor="#0e2e1f" />
                                    <PillToggle enabled={showDiacritics} onToggle={() => setShowDiacritics(p => !p)} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                                </Box>
                            </Box>

                            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', alignItems: 'center', gap: 1.25, mb: 2 }}>
                                <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.4rem', fontWeight: 700, color: '#2c1a0e', textAlign: 'center' }}>{selectedTheme.display_name}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <Button variant="outlined" size="small" startIcon={<ArrowBackSharp sx={{ fontSize: 14 }} />} onClick={handleBackToThemes} sx={{ borderColor: 'rgba(184,134,11,0.3)', color: '#2c1a0e', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.78rem', textTransform: 'none', borderRadius: '20px', px: 1.5, py: '4px', '&:hover': { background: 'rgba(184,134,11,0.05)', borderColor: '#b8860b' } }}>Back to Themes</Button>
                                    <IconButton onClick={() => setSettingsOpen(true)} size="small" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', '&:hover': { background: 'rgba(122,110,101,0.08)', borderColor: 'rgba(122,110,101,0.5)' } }}><Settings sx={{ fontSize: '1rem' }} /></IconButton>
                                </Box>
                            </Box>

                            {isLoadingVocab ? (
                                <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '1.5rem 1rem', md: '2rem 1.5rem 1.75rem' }, minHeight: { xs: '300px', md: '340px' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Skeleton variant="rounded" height={2} sx={{ mb: 2 }} />
                                    <Skeleton variant="text" width={80} sx={{ mx: 'auto' }} />
                                    <Skeleton variant="rounded" height={88} width="55%" sx={{ mx: 'auto', mt: 1 }} />
                                    <Skeleton variant="rounded" height={32} width="30%" sx={{ mx: 'auto' }} />
                                    <Skeleton variant="rounded" height={44} width="100%" sx={{ mt: 'auto' }} />
                                </Box>
                            ) : (
                                <FlashcardQuiz key={quizKey} initialQueue={activeQueue} themeId={selectedTheme.theme_id} showDiacritics={showDiacritics} alwaysShow={alwaysShow} onComplete={handleBackToThemes} themeLabel={selectedTheme.display_name} totalInTheme={selectedTheme.total_words} alreadyCompletedCount={selectedTheme.completed_count} />
                            )}
                        </Box>
                    ) : (
                        <Box>
                            {themesLoading ? (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' }, gap: { xs: 2, sm: 3, md: 4 }, placeItems: 'center' }}>
                                    {[...Array(6)].map((_, i) => (
                                        <Box key={i} sx={{ width: '100%', maxWidth: 345, height: 280, borderRadius: '8px', overflow: 'hidden' }}>
                                            <Skeleton variant="rounded" height={140} width="100%" />
                                            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                <Skeleton variant="text" width="70%" height={22} />
                                                <Skeleton variant="text" width="40%" height={14} />
                                                <Skeleton variant="rounded" height={6} width="100%" sx={{ borderRadius: 3, mt: 1 }} />
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' }, gap: { xs: 2, sm: 3, md: 4 }, placeItems: 'center', width: '100%' }}>
                                    {validThemes.map((theme: ThemeProgress) => (
                                        <ThemeCard key={theme.theme_id} theme={theme} isActive={selectedTheme?.theme_id === theme.theme_id} onClick={() => handleThemeSelect(theme)} />
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}
                </Container>
            </Box>
        </>
    )
}