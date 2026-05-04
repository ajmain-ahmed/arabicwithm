'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Box, Button, Container, Typography, Collapse, Fade,
    LinearProgress, Skeleton,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    ToggleButton, ToggleButtonGroup,
    Slider, Badge,
    useMediaQuery, useTheme,
} from '@mui/material'
import {
    Bookmark, BookmarkAdded, Check, DoneAll, NavigateNext, NavigateBefore,
    Settings, Close, MenuBook, TouchApp, CheckCircle, HelpOutlineRounded,
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
import { stripDiacritics } from '@/app/lib/arabic'
import Navbar from '@/app/components/navbar'
import { useVocabStore } from '@/store/vocabStore'
import { useXpStore } from '@/store/xpStore'
import TutorialDialog, { useTutorialSeen } from '../components/TutorialDialog'
import type { VocabRow, WordProgress, ThemeProgress, ExampleRow } from '@/app/actions/vocab'
import {
    fetchThemesWithProgress,
    upsertWordProgress,
} from '@/app/actions/vocab'

/* ─────────────────────────────────────────────
   Slug → DB level mapping
───────────────────────────────────────────── */
const SLUG_TO_LEVEL: Record<string, string> = {
    Beginner: 'A0',
    Apprentice: 'A1',
    Competent: 'A2',
    Proficient: 'B1',
    'Highly-Proficient': 'B2',
    Expert: 'C1',
    Native: 'C2',
}

const SLUG_LABELS: Record<string, string> = {
    Beginner: 'Beginner | A0',
    Apprentice: 'Apprentice | A1',
    Competent: 'Competent | A2',
    Proficient: 'Proficient | B1',
    'Highly-Proficient': 'Highly Proficient | B2',
    Expert: 'Expert | C1',
    Native: 'Native | C2',
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

function buildQueue(vocab: VocabRow[], progress: WordProgress[]): CardState[] {
    const progressMap = new Map(progress.map(p => [p.vocab_id, p]))
    return vocab.map(v => {
        const p = progressMap.get(v.id)
        const isCompleted = p?.is_completed ?? false
        const isInRevision = p?.is_in_revision ?? false

        let status: CardStatus = 'new'
        if (isCompleted) status = 'completed'
        else if (isInRevision) status = 'revision'

        return { ...v, status, isCompleted, isInRevision }
    })
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
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                cursor: 'pointer', userSelect: 'none',
                padding: '5px 10px', borderRadius: '999px',
                border: '1px solid',
                borderColor: enabled ? activeColor : 'rgba(122,110,101,0.25)',
                background: enabled ? `${activeColor}14` : 'transparent',
                transition: 'border-color 0.15s, background 0.15s',
                width: 200,
                '&:hover': { borderColor: activeColor, background: `${activeColor}0d` },
            }}
        >
            <Box sx={{
                width: 24, height: 14, borderRadius: '999px',
                background: enabled ? activeColor : 'rgba(122,110,101,0.2)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}>
                <Box sx={{
                    position: 'absolute', top: '2px',
                    left: enabled ? '12px' : '2px',
                    width: 10, height: 10, borderRadius: '50%',
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
   Desktop Text Scale Slider
───────────────────────────────────────────── */
function DesktopTextScaleSlider({ textScale, onChange }: { textScale: number; onChange: (v: number) => void }) {
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 0.5, borderRadius: '999px',
            border: '1px solid rgba(122,110,101,0.2)',
            background: 'rgba(122,110,101,0.02)', minWidth: 160,
        }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
            <Slider
                value={textScale} min={1.0} max={1.4} step={0.1} size="small"
                onChange={(_, v) => onChange(v as number)}
                sx={{ color: '#b8860b', flex: 1, '& .MuiSlider-thumb': { width: 14, height: 14 } }}
            />
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   SettingsDialog
───────────────────────────────────────────── */
function SettingsDialog({
    open, onClose,
    showDiacritics, onToggleDiacritics,
    alwaysShow, onToggleAlwaysShow,
    textScale, onTextScaleChange,
    onOpenTutorial,
}: {
    open: boolean; onClose: () => void
    showDiacritics: boolean; onToggleDiacritics: () => void
    alwaysShow: boolean; onToggleAlwaysShow: () => void
    textScale: number; onTextScaleChange: (v: number) => void
    onOpenTutorial: () => void
}) {
    const ToggleRow = ({ label, description, enabled, onToggle, activeColor }: {
        label: string; description: string; enabled: boolean; onToggle: () => void; activeColor: string
    }) => (
        <Box onClick={onToggle} sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', py: 1.25, px: 1.5, borderRadius: '10px', border: '1px solid',
            borderColor: enabled ? `${activeColor}55` : 'rgba(122,110,101,0.15)',
            background: enabled ? `${activeColor}08` : 'rgba(122,110,101,0.03)',
            transition: 'all 0.15s', userSelect: 'none',
            '&:hover': { borderColor: `${activeColor}88`, background: `${activeColor}0d` },
        }}>
            <Box sx={{ pr: 2 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e', lineHeight: 1.2 }}>{label}</Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65', mt: 0.3, lineHeight: 1.4 }}>{description}</Typography>
            </Box>
            <Box sx={{
                width: 38, height: 22, borderRadius: '999px', flexShrink: 0,
                background: enabled ? activeColor : 'rgba(122,110,101,0.22)',
                position: 'relative', transition: 'background 0.2s',
            }}>
                <Box sx={{
                    position: 'absolute', top: '3px', left: enabled ? '19px' : '3px',
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
                    transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </Box>
        </Box>
    )

    return (
        <Dialog open={open} onClose={onClose} slotProps={{ paper: { sx: { borderRadius: '16px', width: '100%', maxWidth: 360, m: 2, overflow: 'hidden', boxShadow: '0 24px 64px rgba(44,26,14,0.2)' } } }}>
            <DialogTitle sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e', pb: 2, pt: 2.5, px: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Settings
                <IconButton onClick={onClose} size="small" sx={{ color: '#7a6e65', mr: -0.5 }}><Close sx={{ fontSize: '1.2rem' }} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 2.5, pt: 1.5, pb: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <ToggleRow label="Show Diacritics" description="Display vowel marks on Arabic words" enabled={showDiacritics} onToggle={onToggleDiacritics} activeColor="#b8860b" />
                    <ToggleRow label="Always Show Card" description="Never hide the answer side" enabled={alwaysShow} onToggle={onToggleAlwaysShow} activeColor="#0e2e1f" />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, px: 1.5, borderRadius: '10px', border: '1px solid rgba(122,110,101,0.15)', background: 'rgba(122,110,101,0.03)', gap: 2 }}>
                        <Box sx={{ pr: 2, flex: '0 0 auto' }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: '#2c1a0e' }}>Text Size</Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#7a6e65', mt: 0.3 }}>Adjust flashcard content size</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Slider value={textScale} min={1.0} max={1.4} step={0.1} size="small" onChange={(_, v) => onTextScaleChange(v as number)} sx={{ color: '#b8860b', width: '100%', '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
                            </Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#7a6e65', flexShrink: 0 }}>A</Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5, flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="outlined" onClick={() => { onClose(); onOpenTutorial(); }} sx={{ borderColor: 'rgba(122,110,101,0.3)', color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', borderRadius: '10px', py: 1, '&:hover': { borderColor: '#b8860b', color: '#b8860b', background: 'rgba(184,134,11,0.04)' } }}>
                    <HelpOutlineRounded sx={{ fontSize: '1rem', mr: 1 }} />
                    View Tutorial
                </Button>
                <Button fullWidth variant="contained" onClick={onClose} disableElevation sx={{ background: '#2c1a0e', color: '#f5ede0', fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.95rem', textTransform: 'none', borderRadius: '10px', py: 1.1, '&:hover': { background: '#1a0f08' } }}>Done</Button>
            </DialogActions>
        </Dialog>
    )
}

/* ─────────────────────────────────────────────
   AnimatedArabicWord
───────────────────────────────────────────── */
function AnimatedArabicWord({ word, wordDiacritic, showDiacritics, textScale }: {
    word: string; wordDiacritic: string; showDiacritics: boolean; textScale: number
}) {
    const scaledSize = (size: number) => `${size * textScale}rem`
    return (
        <Box sx={{
            position: 'relative', textAlign: 'center', margin: '0.5rem 0 1.5rem',
            height: { xs: `calc(3.2rem * ${textScale})`, md: `calc(4.5rem * ${textScale})` },
        }}>
            <Fade in={!showDiacritics} timeout={300} unmountOnExit>
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: { xs: scaledSize(2.4), md: scaledSize(3.8) },
                    fontWeight: 700, direction: 'rtl', textAlign: 'center',
                    color: '#2c1a0e', lineHeight: 1.2,
                    position: 'absolute', top: 0, left: 0, right: 0,
                }}>{word}</Typography>
            </Fade>
            <Fade in={showDiacritics} timeout={300} unmountOnExit>
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: { xs: scaledSize(2.4), md: scaledSize(3.8) },
                    fontWeight: 700, direction: 'rtl', textAlign: 'center',
                    color: '#0e2e1f', lineHeight: 1.2,
                    position: 'absolute', top: 0, left: 0, right: 0,
                }}>{wordDiacritic}</Typography>
            </Fade>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   DraggableWord
───────────────────────────────────────────── */
function DraggableWord({ word, id, slotIndex, status = 'neutral', textScale = 1 }: {
    word: string; id: string; slotIndex: number; status?: 'correct' | 'incorrect' | 'neutral'; textScale?: number
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 200ms ease',
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        zIndex: isDragging ? 1000 : 1,
    }
    const badgeBgColor = status === 'correct' ? '#2e7d32' : status === 'incorrect' ? '#d32f2f' : '#7a6e65'
    return (
        <Badge badgeContent={slotIndex} color="primary" anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ '& .MuiBadge-badge': { fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', fontWeight: 700, minWidth: 18, height: 18, padding: '0 4px', backgroundColor: badgeBgColor, color: '#fff', border: '2px solid #faf7f2', borderRadius: '50%', top: 4, right: 4, transform: 'scale(1) translate(50%, -50%)', transformOrigin: '100% 0%' } }}>
            <Button ref={setNodeRef} variant="outlined" {...attributes} {...listeners}
                sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: `calc(1.1rem * ${textScale})`, sm: `calc(1.3rem * ${textScale})` }, fontWeight: 600, color: '#2c1a0e', borderColor: 'rgba(184,134,11,0.4)', borderRadius: '30px', padding: { xs: '4px 14px', sm: '6px 18px' }, textTransform: 'none', position: 'relative', '&:hover': { background: 'rgba(184,134,11,0.08)', borderColor: '#b8860b' }, ...style }}>
                {word}
            </Button>
        </Badge>
    )
}

/* ─────────────────────────────────────────────
   InteractiveSentenceBuilder
───────────────────────────────────────────── */
function InteractiveSentenceBuilder({ plainWords, diacriticWords, englishTranslation, transliteration, showDiacritics, resetKey, textScale }: {
    plainWords: string[]; diacriticWords: string[]; englishTranslation: string; transliteration: string
    showDiacritics: boolean; resetKey: string | number; textScale: number
}) {
    const [order, setOrder] = useState<number[]>([])
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
    const [checking, setChecking] = useState(false)
    const [slotStatuses, setSlotStatuses] = useState<('correct' | 'incorrect' | 'neutral')[]>([])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const displayedWords = useMemo(() => {
        const source = showDiacritics ? diacriticWords : plainWords
        return order.map(idx => source[idx])
    }, [order, plainWords, diacriticWords, showDiacritics])

    const correctDisplayedWords = useMemo(() => showDiacritics ? diacriticWords : plainWords, [plainWords, diacriticWords, showDiacritics])
    const wordIds = useMemo(() => displayedWords.map((_, idx) => `word-${idx}`), [displayedWords])

    useEffect(() => {
        const initialOrder = plainWords.map((_, idx) => idx)
        for (let i = initialOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[initialOrder[i], initialOrder[j]] = [initialOrder[j], initialOrder[i]]
        }
        setOrder(initialOrder)
        setFeedback(null)
        setChecking(false)
        setSlotStatuses(new Array(plainWords.length).fill('neutral'))
    }, [resetKey, plainWords.length])

    const handleDragEnd = (event: DragEndEvent) => {
        if (feedback === 'correct' || checking) return
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = wordIds.indexOf(active.id as string)
        const newIndex = wordIds.indexOf(over.id as string)
        setOrder(arrayMove(order, oldIndex, newIndex))
        setFeedback(null)
        setSlotStatuses(new Array(plainWords.length).fill('neutral'))
    }

    const checkOrder = () => {
        const isCorrect = displayedWords.join(' ') === correctDisplayedWords.join(' ')
        if (isCorrect) {
            setFeedback('correct')
            setSlotStatuses(new Array(plainWords.length).fill('correct'))
        } else {
            setFeedback('incorrect')
            setChecking(true)
            setSlotStatuses(displayedWords.map((word, idx) => word === correctDisplayedWords[idx] ? 'correct' : 'incorrect'))
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
        setSlotStatuses(new Array(plainWords.length).fill('neutral'))
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: `calc(0.8rem * ${textScale})`, sm: `calc(0.85rem * ${textScale})` }, fontWeight: 500, color: '#7a6e65', textAlign: 'center', mb: 1.5 }}>
                    Drag and drop the words in the correct order
                </Typography>
                <SortableContext items={wordIds} strategy={horizontalListSortingStrategy}>
                    <Box dir="rtl" sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, justifyContent: 'center', alignItems: 'center', p: 1.5, mb: 2, border: '2px solid', borderColor: feedback === 'correct' ? '#2e7d32' : feedback === 'incorrect' ? '#d32f2f' : 'rgba(184,134,11,0.3)', borderRadius: '12px', background: feedback === 'correct' ? 'rgba(46,125,50,0.04)' : feedback === 'incorrect' ? 'rgba(211,47,47,0.04)' : 'rgba(184,134,11,0.02)', transition: 'border-color 0.3s, background 0.3s' }}>
                        {displayedWords.map((word, idx) => (
                            <DraggableWord key={wordIds[idx]} word={word} id={wordIds[idx]} slotIndex={idx + 1} status={slotStatuses[idx] || 'neutral'} textScale={textScale} />
                        ))}
                    </Box>
                </SortableContext>

                {feedback === 'correct' && (
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.95rem * ${textScale})`, color: '#7a6e65', textAlign: 'center', mb: 1 }}>
                        {transliteration}
                    </Typography>
                )}
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(1rem * ${textScale})`, fontWeight: 500, color: '#2c1a0e', textAlign: 'center', mb: 2 }}>
                    {englishTranslation}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
                    <Button variant="contained" onClick={checkOrder} disabled={feedback === 'correct' || checking}
                        sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: `calc(0.85rem * ${textScale})`, textTransform: 'none', borderRadius: '20px', px: 3, background: '#b8860b', '&:hover': { background: '#9a6e09' }, '&:disabled': { opacity: 0.5 } }}>Check</Button>
                    <Button variant="outlined" onClick={resetGame}
                        sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: `calc(0.85rem * ${textScale})`, textTransform: 'none', borderRadius: '20px', px: 3, borderColor: 'rgba(184,134,11,0.5)', color: '#2c1a0e', '&:hover': { borderColor: '#b8860b', background: 'rgba(184,134,11,0.05)' } }}>Reset</Button>
                </Box>

                {feedback === 'incorrect' && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.8rem * ${textScale})`, color: '#d32f2f', mt: 1.5, textAlign: 'center', fontWeight: 500 }}>Not quite right – try again!</Typography>}
                {feedback === 'correct' && <Box sx={{ mt: 1.5, textAlign: 'center' }}><Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.9rem * ${textScale})`, color: '#2e7d32', fontWeight: 600 }}>Perfect! ✓</Typography></Box>}
            </Box>
        </DndContext>
    )
}

/* ─────────────────────────────────────────────
   ExampleSentences
───────────────────────────────────────────── */
function ExampleSentences({ examplesForCard, revealed, showDiacritics, textScale }: {
    examplesForCard: ExampleRow[]; revealed: boolean; showDiacritics: boolean; textScale: number
}) {
    const [viewMode, setViewMode] = useState<'example' | 'try'>('example')
    const displayExamples = useMemo(() => examplesForCard.filter(e => !e.interactive), [examplesForCard])
    const interactiveExample = useMemo(() => examplesForCard.find(e => e.interactive) ?? null, [examplesForCard])
    const hasExamples = displayExamples.length > 0
    const hasInteractive = interactiveExample !== null

    if (!revealed || (!hasExamples && !hasInteractive)) return null

    const plainWords = interactiveExample ? interactiveExample.ex_ar.split(' ').filter(w => w.trim() !== '') : []
    const diacriticWords = interactiveExample ? interactiveExample.ex_dia.split(' ').filter(w => w.trim() !== '') : []
    const resetKey = examplesForCard[0]?.vocab_id ?? 0

    return (
        <Collapse in={revealed} timeout={300}>
            <Box sx={{ background: 'rgba(245,237,224,0.5)', borderRadius: '8px', padding: { xs: '1rem', sm: '1.25rem' }, margin: '1.25rem 0', borderLeft: '3px solid #b8860b' }}>
                {hasExamples && hasInteractive && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, val) => val && setViewMode(val)} size="small"
                            sx={{ display: 'flex', gap: 2, pb: 2, '& .MuiToggleButton-root': { fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.85rem' }, textTransform: 'none', borderRadius: '20px', px: 2, border: '1px solid rgba(184,134,11,0.3)', color: '#2c1a0e', '&.Mui-selected': { background: 'rgba(184,134,11,0.15)', color: '#b8860b', borderColor: '#b8860b' } } }}>
                            <ToggleButton value="example"><MenuBook sx={{ fontSize: 16, mr: 0.5 }} />Example</ToggleButton>
                            <ToggleButton value="try"><TouchApp sx={{ fontSize: 16, mr: 0.5 }} />You Try</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                )}

                {(viewMode === 'example' || !hasInteractive) && hasExamples && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {displayExamples.map((ex, i) => (
                            <Box key={i}>
                                <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: `calc(1.6rem * ${textScale})`, color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.5, mb: 0.35 }}>
                                    {showDiacritics ? ex.ex_dia : ex.ex_ar}
                                </Typography>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(1rem * ${textScale})`, color: '#9e8a7a', textAlign: 'left', mb: 0.35 }}>
                                    {ex.ex_tr || ''}
                                </Typography>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(1.15rem * ${textScale})`, color: '#7a6e65', textAlign: 'left', lineHeight: 1.5 }}>
                                    {ex.ex_en}
                                </Typography>
                                {i < displayExamples.length - 1 && <Box sx={{ borderTop: '1px solid rgba(184,134,11,0.1)', mt: 1.5 }} />}
                            </Box>
                        ))}
                    </Box>
                )}

                {(viewMode === 'try' || !hasExamples) && hasInteractive && interactiveExample && (
                    <InteractiveSentenceBuilder
                        plainWords={plainWords} diacriticWords={diacriticWords}
                        englishTranslation={interactiveExample.ex_en}
                        transliteration={interactiveExample.ex_tr || ''}
                        showDiacritics={showDiacritics} resetKey={resetKey} textScale={textScale}
                    />
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

function StatusChips({ newCount, revisionCount, completedCount, filter, currentStatus, onFilterChange }: {
    newCount: number; revisionCount: number; completedCount: number
    filter: FilterType; currentStatus: CardStatus | null; onFilterChange: (f: FilterType) => void
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
                const isDisabled = count === 0
                return (
                    <Box
                        key={type}
                        onClick={isDisabled ? undefined : () => onFilterChange(filter === type ? 'all' : type)}
                        sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: { xs: '12px', sm: '13px', md: '14px' },
                            fontWeight: isHighlighted ? 700 : 500,
                            padding: { xs: '4px 10px', sm: '5px 14px' },
                            borderRadius: '999px',
                            border: `${isHighlighted ? 2 : 1}px solid`,
                            borderColor: isHighlighted ? colors.border : 'rgba(122,110,101,0.18)',
                            color: isHighlighted ? colors.activeColor : isDisabled ? 'rgba(122,110,101,0.35)' : '#7a6e65',
                            background: isHighlighted ? colors.activeBg : 'transparent',
                            cursor: isDisabled ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                            userSelect: 'none',
                            outline: isCurrentCard && !isFilterActive ? `2px solid ${colors.border}` : 'none',
                            outlineOffset: '1px',
                            '&:hover': isDisabled ? {} : { background: colors.activeBg, borderColor: colors.border, color: colors.activeColor },
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
   DefinitionPanel
───────────────────────────────────────────── */
function DefinitionPanel({ card, showDiacritics, textScale }: {
    card: VocabRow
    showDiacritics: boolean
    textScale: number
}) {
    const hasDef = card.def_ar || card.def_tr || card.def_en
    if (!hasDef) return null

    const defArDisplay = showDiacritics
        ? (card.def_ar ?? '')
        : stripDiacritics(card.def_ar ?? '')

    return (
        <Box sx={{
            background: 'rgba(245,237,224,0.4)',
            border: '1px solid rgba(184,134,11,0.12)',
            borderRadius: '10px',
            p: { xs: '1rem', md: '1.25rem 1.5rem' },
            mb: { xs: '0.75rem', md: '0.25rem' },
        }}>
            <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: `calc(0.7rem * ${textScale})`,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#b8860b',
                mb: 1,
            }}>
                Definition
            </Typography>

            {card.def_ar && (
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: `calc(1.35rem * ${textScale})`,
                    color: '#2c1a0e',
                    direction: 'rtl',
                    textAlign: 'right',
                    lineHeight: 1.5,
                    mb: 0.5,
                }}>
                    {defArDisplay}
                </Typography>
            )}

            {card.def_tr && (
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: `calc(0.9rem * ${textScale})`,
                    color: '#9e8a7a',
                    textAlign: 'left',
                    lineHeight: 1.5,
                    mb: 0.5,
                }}>
                    {card.def_tr}
                </Typography>
            )}

            {card.def_en && (
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: `calc(1rem * ${textScale})`,
                    color: '#7a6e65',
                    textAlign: 'left',
                    lineHeight: 1.5,
                }}>
                    {card.def_en}
                </Typography>
            )}
        </Box>
    )
}

/* ─────────────────────────────────────────────
   FlashcardQuiz
───────────────────────────────────────────── */
function FlashcardQuiz({
    initialQueue, themeId, allExamples, showDiacritics, alwaysShow, onComplete, themeLabel,
    totalInTheme, alreadyCompletedCount, textScale, initialCardIndex, flushRef,
    levelCode,
    onThemeProgressUpdate,
}: {
    initialQueue: CardState[]
    themeId: number
    allExamples: ExampleRow[]
    showDiacritics: boolean
    alwaysShow: boolean
    onComplete: () => void
    themeLabel: string
    totalInTheme: number
    alreadyCompletedCount: number
    textScale: number
    initialCardIndex?: number
    flushRef?: React.MutableRefObject<(() => Promise<void>) | null>
    levelCode: string
    onThemeProgressUpdate?: (themeId: number, progress: { completedCount: number; revisionCount: number }) => void
}) {
    const updateLocalProgress = useVocabStore(s => s.updateLocalProgress)
    const awardWord = useXpStore(s => s.awardWord)
    const awardTheme = useXpStore(s => s.awardTheme)

    const [allCards, setAllCards] = useState<CardState[]>(initialQueue)
    const [filter, setFilter] = useState<FilterType>('all')
    const [revealed, setRevealed] = useState(alwaysShow)
    const [cardKey, setCardKey] = useState(0)
    const [mobileTab, setMobileTab] = useState<'definition' | 'examples'>('definition')
    const themeObj = useTheme()
    const isMobile = useMediaQuery(themeObj.breakpoints.down('sm'))

    /* ── swipe gesture refs ── */
    const cardRef = useRef<HTMLDivElement | null>(null)
    const activeElRef = useRef<HTMLDivElement | null>(null)
    const dragState = useRef<{ startX: number; isDragging: boolean } | null>(null)
    const SWIPE_THRESHOLD = 80

    const pendingRef = useRef<Map<number, { isCompleted: boolean; isInRevision: boolean }>>(new Map())

    const flushPending = useCallback(async () => {
        if (pendingRef.current.size === 0) return
        const entries = Array.from(pendingRef.current.entries())
        pendingRef.current.clear()
        await Promise.allSettled(
            entries.map(([wordId, { isCompleted, isInRevision }]) =>
                upsertWordProgress({ vocabId: wordId, isCompleted, isInRevision })
            )
        )
    }, [])

    useEffect(() => {
        if (flushRef) flushRef.current = flushPending
        return () => { if (flushRef) flushRef.current = null }
    }, [flushRef, flushPending])

    useEffect(() => { if (alwaysShow) setRevealed(true) }, [alwaysShow])

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

    const newCount = allCards.filter(c => !c.isCompleted && !c.isInRevision).length
    const revisionCount = allCards.filter(c => c.isInRevision).length
    const completedCount = allCards.filter(c => c.isCompleted).length
    const progressPct = allCards.length > 0 ? Math.round((completedCount / allCards.length) * 100) : 0

    const currentCardExamples = useMemo(
        () => current ? allExamples.filter(e => e.vocab_id === current.id) : [],
        [current, allExamples]
    )

    /* ── Sync theme-level counts back to parent ── */
    useEffect(() => {
        if (allCards.length === 0) return
        onThemeProgressUpdate?.(themeId, { completedCount, revisionCount })
    }, [allCards, themeId, completedCount, revisionCount, onThemeProgressUpdate])

    /* ── Auto-advance when theme fully completed ── */
    const wasAlreadyCompleteOnMount = useRef(initialQueue.every(c => c.isCompleted))
    const hasTriggeredAdvance = useRef(false)
    const hasAwardedThemeBonus = useRef(false)

    useEffect(() => {
        const everyCompleted = allCards.length > 0 && allCards.every(c => c.isCompleted)
        if (everyCompleted && !wasAlreadyCompleteOnMount.current && !hasTriggeredAdvance.current) {
            hasTriggeredAdvance.current = true
            if (!hasAwardedThemeBonus.current) {
                hasAwardedThemeBonus.current = true
                awardTheme(themeId)
            }
            const timer = setTimeout(() => {
                onComplete?.()
            }, 1200)
            return () => clearTimeout(timer)
        }
        if (!everyCompleted) {
            hasTriggeredAdvance.current = false
        }
    }, [allCards, onComplete, themeId, awardTheme])

    const updateCardStatus = useCallback(
        (cardId: number, newStatus: CardStatus, opts?: { isCompleted?: boolean; isInRevision?: boolean }) => {
            setAllCards(prev =>
                prev.map(c => {
                    if (c.id !== cardId) return c
                    const isCompleted = opts?.isCompleted ?? c.isCompleted
                    const isInRevision = opts?.isInRevision ?? c.isInRevision
                    let status: CardStatus = 'new'
                    if (isCompleted) status = 'completed'
                    else if (isInRevision) status = 'revision'

                    if (opts) {
                        pendingRef.current.set(cardId, { isCompleted, isInRevision })
                        updateLocalProgress(themeId, levelCode, cardId, {
                            is_completed: isCompleted,
                            is_in_revision: isInRevision,
                        })
                    }

                    return { ...c, status, isCompleted, isInRevision }
                })
            )
        },
        [themeId, levelCode, updateLocalProgress]
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
        if (currentIndex < filteredCards.length - 1) {
            goToIndex(currentIndex + 1)
        } else if (filter === 'all') {
            onComplete?.()
        }
    }, [currentIndex, filteredCards.length, goToIndex, onComplete, filter])

    const toggleRevision = useCallback(() => {
        if (!current) return
        const toRevision = !current.isInRevision
        updateCardStatus(current.id, toRevision ? 'revision' : 'new', { isInRevision: toRevision })
    }, [current, updateCardStatus])

    const toggleComplete = useCallback(() => {
        if (!current) return
        if (current.isCompleted) {
            updateCardStatus(current.id, current.isInRevision ? 'revision' : 'new', { isCompleted: false })
        } else {
            updateCardStatus(current.id, 'completed', { isCompleted: true })
            awardWord(current.id)
            if (currentIndex < filteredCards.length - 1) {
                goToIndex(currentIndex + 1)
            } else if (filter === 'all') {
                onComplete?.()
            }
        }
    }, [current, currentIndex, filteredCards.length, updateCardStatus, goToIndex, onComplete, awardWord, filter])

    const handleFilterChange = useCallback(
        (newFilter: FilterType) => {
            setFilter(newFilter)
            const next = newFilter === 'all' ? allCards : allCards.filter(c => c.status === newFilter)
            const idx = next.findIndex(c => c.status === 'new')
            setCurrentIndex(idx === -1 ? 0 : idx)
            if (!alwaysShow) setRevealed(false)
            setCardKey(k => k + 1)
        },
        [allCards, alwaysShow]
    )

    /* ── Tinder-style swipe refs (must be before any early return) ── */
    const nextBadgeRef = useRef<HTMLDivElement | null>(null)
    const backBadgeRef = useRef<HTMLDivElement | null>(null)

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

    const onSwipeStart = useCallback((e: React.TouchEvent) => {
        if (!isMobile) return
        const touch = e.touches[0]
        dragState.current = { startX: touch.clientX, isDragging: true }
        activeElRef.current = cardRef.current
        const el = activeElRef.current
        if (el) {
            el.style.transition = 'none'
            el.style.willChange = 'transform'
        }
        if (nextBadgeRef.current) nextBadgeRef.current.style.opacity = '0'
        if (backBadgeRef.current) backBadgeRef.current.style.opacity = '0'
    }, [isMobile])

    const onSwipeMove = useCallback((e: React.TouchEvent) => {
        if (!dragState.current?.isDragging || !activeElRef.current) return
        const touch = e.touches[0]
        const rawDelta = touch.clientX - dragState.current.startX
        const resisted = rawDelta * 0.5
        const rotation = resisted * 0.04
        activeElRef.current.style.transform = `translateX(${resisted}px) rotate(${rotation}deg)`

        const progress = Math.min(1, Math.abs(rawDelta) / SWIPE_THRESHOLD)
        if (rawDelta > 0 && backBadgeRef.current) {
            backBadgeRef.current.style.opacity = String(progress)
        } else if (rawDelta < 0 && nextBadgeRef.current) {
            nextBadgeRef.current.style.opacity = String(progress)
        }
    }, [])

    const onSwipeEnd = useCallback(() => {
        if (!dragState.current?.isDragging || !activeElRef.current) return
        const el = activeElRef.current
        const style = el.style
        const match = style.transform.match(/translateX\(([-\d.]+)px\)/)
        const delta = match ? parseFloat(match[1]) : 0
        dragState.current = null

        const canSwipeRight = delta < -SWIPE_THRESHOLD && canGoBack
        const canSwipeLeft  = delta > SWIPE_THRESHOLD

        if (canSwipeRight || canSwipeLeft) {
            const dir = canSwipeLeft ? -1 : 1
            style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease'
            style.transform = `translateX(${dir * 110}%) rotate(${dir * -12}deg)`
            style.opacity = '0'
            if (nextBadgeRef.current) nextBadgeRef.current.style.opacity = '0'
            if (backBadgeRef.current) backBadgeRef.current.style.opacity = '0'
            setTimeout(() => {
                style.willChange = ''
                style.transform = ''
                style.opacity = ''
                if (canSwipeLeft) handleNext()
                else handlePrevious()
            }, 300)
        } else {
            style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease'
            style.transform = 'translateX(0px) rotate(0deg)'
            style.opacity = '1'
            if (nextBadgeRef.current) nextBadgeRef.current.style.opacity = '0'
            if (backBadgeRef.current) backBadgeRef.current.style.opacity = '0'
            const onDone = () => {
                style.transition = ''
                style.transform = ''
                style.willChange = ''
                el.removeEventListener('transitionend', onDone)
            }
            el.addEventListener('transitionend', onDone)
            setTimeout(onDone, 450)
        }
    }, [canGoBack, handleNext, handlePrevious])

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
        <Fade in key={`${cardKey}-${current.id}`} timeout={400}>
            <Box
                ref={cardRef}
                onTouchStart={onSwipeStart}
                onTouchMove={onSwipeMove}
                onTouchEnd={onSwipeEnd}
                sx={{
                    background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px',
                    padding: { xs: '1.25rem 0.875rem', md: '2rem 1.5rem 1.75rem' },
                    minHeight: { xs: '300px', md: '340px' }, display: 'flex', flexDirection: 'column',
                    touchAction: 'pan-y', position: 'relative',
                }}
            >
                {/* Swipe overlay badges */}
                <Box ref={nextBadgeRef} sx={{
                    position: 'absolute', top: 24, right: 24,
                    border: '3px solid #2e7d32', color: '#2e7d32',
                    fontFamily: 'Jost, sans-serif', fontWeight: 800, fontSize: '1.4rem',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    px: 1.5, py: 0.5, borderRadius: '8px',
                    transform: 'rotate(12deg)', opacity: 0,
                    transition: 'opacity 0.1s', pointerEvents: 'none',
                    zIndex: 10,
                }}>
                    Next
                </Box>
                <Box ref={backBadgeRef} sx={{
                    position: 'absolute', top: 24, left: 24,
                    border: '3px solid #d32f2f', color: '#d32f2f',
                    fontFamily: 'Jost, sans-serif', fontWeight: 800, fontSize: '1.4rem',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    px: 1.5, py: 0.5, borderRadius: '8px',
                    transform: 'rotate(-12deg)', opacity: 0,
                    transition: 'opacity 0.1s', pointerEvents: 'none',
                    zIndex: 10,
                }}>
                    Back
                </Box>
                {/* Progress bar */}
                <Box sx={{ height: '2px', background: 'rgba(184,134,11,0.1)', borderRadius: '999px', mb: '1.25rem', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', background: 'linear-gradient(90deg, #b8860b, #d4a843)', borderRadius: '999px', transition: 'width 0.4s ease', width: `${progressPct}%` }} />
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

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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

                        {/* POS chip on its own line */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 0.5, md: 0.75 } }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Jost, sans-serif', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: '999px', background: 'rgba(122,110,101,0.08)', color: '#7a6e65' }}>
                                {current.pos}
                            </Box>
                        </Box>

                        {/* Transliteration + definition on the same line */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', py: 1, mb: { xs: 1, md: 1.5} }}>
                            <Typography component="span" sx={{ fontFamily: 'Jost, sans-serif', fontSize: transliterationFontSize, color: '#b8860b', letterSpacing: '0.05em', lineHeight: 1 }}>
                                {current.transliteration}
                            </Typography>
                            <Typography component="span" sx={{ fontFamily: "'EB Garamond', serif", fontSize: `calc(1.5rem * ${textScale})`, fontWeight: 700, color: '#2c1a0e', lineHeight: 1 }}>
                                {current.definition}
                            </Typography>
                        </Box>

                        {/* Desktop: everything stacked */}
                        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                            <DefinitionPanel card={current} showDiacritics={showDiacritics} textScale={textScale} />
                            <ExampleSentences
                                examplesForCard={currentCardExamples}
                                revealed={revealed}
                                showDiacritics={showDiacritics}
                                textScale={textScale}
                            />
                        </Box>

                        {/* Mobile: tabs for Definition / Examples */}
                        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1.5 }}>
                                <Button
                                    onClick={() => setMobileTab('definition')}
                                    sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.8rem',
                                        fontWeight: mobileTab === 'definition' ? 600 : 500,
                                        textTransform: 'none',
                                        borderRadius: '20px',
                                        px: 2,
                                        py: 0.5,
                                        minWidth: 100,
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
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.8rem',
                                        fontWeight: mobileTab === 'examples' ? 600 : 500,
                                        textTransform: 'none',
                                        borderRadius: '20px',
                                        px: 2,
                                        py: 0.5,
                                        minWidth: 100,
                                        background: mobileTab === 'examples' ? 'rgba(184,134,11,0.12)' : 'transparent',
                                        color: mobileTab === 'examples' ? '#b8860b' : '#7a6e65',
                                        border: '1px solid',
                                        borderColor: mobileTab === 'examples' ? 'rgba(184,134,11,0.4)' : 'rgba(122,110,101,0.2)',
                                    }}
                                >
                                    Examples
                                </Button>
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
                        </Box>

                        {/* Desktop action buttons */}
                        <Box sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', mt: '1.25rem' }}>
                            <Button variant="outlined" size="small" onClick={handlePrevious} disabled={!canGoBack} startIcon={<NavigateBefore sx={{ fontSize: '1.1rem !important' }} />}
                                sx={{ borderColor: '#7a6e65', color: '#7a6e65', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px', textTransform: 'none', '&:hover': { background: 'rgba(122,110,101,0.08)' }, '&:disabled': { opacity: 0.4 } }}>Back</Button>
                            <Button variant={current.isInRevision ? 'contained' : 'outlined'} color="primary" size="small" onClick={toggleRevision} startIcon={current.isInRevision ? <BookmarkAdded sx={{ fontSize: '1.1rem !important' }} /> : <Bookmark sx={{ fontSize: '1.1rem !important' }} />}
                                sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px' }}>Revision</Button>
                            <Button variant={current.isCompleted ? 'contained' : 'outlined'} color="success" size="small" onClick={toggleComplete} startIcon={current.isCompleted ? <DoneAll sx={{ fontSize: '1.1rem !important' }} /> : <Check sx={{ fontSize: '1.1rem !important' }} />}
                                sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px' }}>{current.isCompleted ? 'Completed' : 'Complete'}</Button>
                            <Button variant="outlined" color="warning" size="small" onClick={handleNext} disabled={isLastCard && filter !== 'all'} endIcon={<NavigateNext sx={{ fontSize: '1.1rem !important' }} />}
                                sx={{ textTransform: 'none', fontFamily: 'Jost, sans-serif', fontWeight: 500, fontSize: '0.9rem', padding: '0.6rem 0.5rem', borderRadius: '6px', '&:disabled': { opacity: 0.4 } }}>
                                {isLastCardInTheme && filter === 'all' ? 'Next Theme' : 'Next'}
                            </Button>
                        </Box>

                        {/* Mobile action buttons */}
                        <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'center', gap: '10px', mt: '1rem' }}>
                            <Button variant="outlined" size="small" onClick={handlePrevious} disabled={!canGoBack}
                                sx={{ ...mobileActionBtnSx, borderColor: canGoBack ? 'rgba(122,110,101,0.4)' : 'rgba(122,110,101,0.15)', color: canGoBack ? '#7a6e65' : 'rgba(122,110,101,0.3)', '&:hover': { background: 'rgba(122,110,101,0.08)' }, '&.Mui-disabled': { opacity: 0.35, border: '1px solid rgba(122,110,101,0.15)' } }}>
                                Prev
                            </Button>
                            <Button variant={current.isInRevision ? 'contained' : 'outlined'} color="primary" size="small" onClick={toggleRevision} startIcon={current.isInRevision ? <BookmarkAdded /> : <Bookmark />} sx={mobileActionBtnSx}>Revision</Button>
                            <Button variant={current.isCompleted ? 'contained' : 'outlined'} color="success" size="small" onClick={toggleComplete} startIcon={current.isCompleted ? <DoneAll /> : <Check />} sx={mobileActionBtnSx}>{current.isCompleted ? 'Completed' : 'Complete'}</Button>
                            <Button variant="outlined" size="small" onClick={handleNext} disabled={isLastCard && filter !== 'all'}
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
            </Box>
        </Fade>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   ThemePlaylistSidebar
───────────────────────────────────────────── */
function ThemePlaylistSidebar({
    themes, selectedTheme, onSelectTheme, label,
}: {
    themes: ThemeProgress[]
    selectedTheme: ThemeProgress | null
    onSelectTheme: (theme: ThemeProgress) => void
    label: string
}) {
    const overallProgress = useMemo(() => {
        const total = themes.reduce((s, t) => s + t.total_words, 0)
        if (total === 0) return 0
        return Math.round(themes.reduce((s, t) => s + t.completed_count, 0) / total * 100)
    }, [themes])

    return (
        <Box sx={{
            background: '#fff',
            border: '1px solid rgba(184,134,11,0.15)',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>
            <Box sx={{
                background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)',
                px: 2, py: 1.75,
                flexShrink: 0,
            }}>
                <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: '#f5ede0', lineHeight: 1.2, mb: 0.5 }}>
                    {label}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'rgba(245,237,224,0.6)', fontWeight: 500 }}>
                        {themes.reduce((s, t) => s + t.total_words, 0)} words · {themes.length} themes
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: '#d4a843', fontWeight: 600 }}>
                        {overallProgress}%
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={overallProgress}
                    sx={{
                        height: 4, borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, #b8860b 0%, #d4a843 100%)',
                            borderRadius: 2,
                        },
                    }}
                />
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {themes.map((theme, idx) => {
                    const progress = theme.total_words > 0
                        ? Math.round((theme.completed_count / theme.total_words) * 100)
                        : 0
                    const isActive = selectedTheme?.theme_id === theme.theme_id
                    const isComplete = progress === 100

                    return (
                        <Box key={theme.theme_id} onClick={() => onSelectTheme(theme)} sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            px: 2, py: 1.25, cursor: 'pointer',
                            background: isActive ? 'rgba(184,134,11,0.08)' : 'transparent',
                            borderLeft: isActive ? '3px solid #b8860b' : '3px solid transparent',
                            borderBottom: '1px solid rgba(184,134,11,0.07)',
                            transition: 'all 0.15s',
                            '&:hover': { background: isActive ? 'rgba(184,134,11,0.1)' : 'rgba(184,134,11,0.04)' },
                        }}>
                            <Box sx={{
                                width: 28, height: 28, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%',
                                background: isActive ? 'rgba(184,134,11,0.15)' : isComplete ? 'rgba(46,125,50,0.08)' : 'rgba(122,110,101,0.08)',
                            }}>
                                {isComplete ? <CheckCircle sx={{ fontSize: '1rem', color: '#2e7d32' }} />
                                    : isActive ? <Box sx={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #b8860b', ml: '2px' }} />
                                        : <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, color: '#7a6e65' }}>{idx + 1}</Typography>
                                }
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#2c1a0e' : '#3d3028', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {theme.display_name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.4 }}>
                                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', color: '#9e8a7a' }}>{theme.total_words} words</Typography>
                                    {theme.revision_count > 0 && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', color: '#1565c0' }}>· {theme.revision_count} revision</Typography>}
                                </Box>
                                <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, background: 'rgba(184,134,11,0.1)', overflow: 'hidden' }}>
                                    <Box sx={{ height: '100%', borderRadius: 2, width: `${progress}%`, background: isComplete ? 'linear-gradient(90deg, #2e7d32, #4caf50)' : 'linear-gradient(90deg, #b8860b, #d4a843)', transition: 'width 0.4s ease' }} />
                                </Box>
                            </Box>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: isComplete ? '#2e7d32' : isActive ? '#b8860b' : '#9e8a7a', flexShrink: 0 }}>
                                {progress}%
                            </Typography>
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function FlashcardSlugPage() {
    const [textScale, setTextScale] = useState(1.1)
    const params = useParams()
    const router = useRouter()
    const slug = (params?.slug as string) ?? 'beginner'
    const level = SLUG_TO_LEVEL[slug] ?? 'A0'
    const label = SLUG_LABELS[slug] ?? slug

    const fetchTheme = useVocabStore(s => s.fetchTheme)
    const loadingThemeId = useVocabStore(s => s.loadingThemeId)

    const [themes, setThemes] = useState<ThemeProgress[]>([])
    const [themesLoading, setThemesLoading] = useState(true)
    const [themesError, setThemesError] = useState<string | null>(null)
    const [selectedTheme, setSelectedTheme] = useState<ThemeProgress | null>(null)
    const [activeQueue, setActiveQueue] = useState<CardState[]>([])
    const [activeExamples, setActiveExamples] = useState<ExampleRow[]>([])
    const [initialCardIndex, setInitialCardIndex] = useState<number | undefined>(undefined)
    const [showDiacritics, setShowDiacritics] = useState(true)
    const [alwaysShow, setAlwaysShow] = useState(true)
    const [quizKey, setQuizKey] = useState(0)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [themesOpen, setThemesOpen] = useState(false)

    const { seen: tutorialSeen, markSeen: markTutorialSeen } = useTutorialSeen()
    const [tutorialOpen, setTutorialOpen] = useState(false)

    useEffect(() => {
        if (!tutorialSeen) {
            const timer = setTimeout(() => setTutorialOpen(true), 800)
            return () => clearTimeout(timer)
        }
    }, [tutorialSeen])

    const flushRef = useRef<(() => Promise<void>) | null>(null)
    const flush = useCallback(() => flushRef.current?.() ?? Promise.resolve(), [])

    useEffect(() => {
        const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
        const onBeforeUnload = () => { flush() }
        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    }, [flush])

    // Fetch themes whenever level changes
    useEffect(() => {
        let cancelled = false
        setThemesLoading(true)
        setThemesError(null)
        setSelectedTheme(null)
        fetchThemesWithProgress(level)
            .then(async (data) => {
                if (cancelled) return
                setThemes(data)
                setThemesLoading(false)

                const firstIncomplete = data.find((t: ThemeProgress) =>
                    t?.theme_id != null &&
                    !Number.isNaN(t.theme_id) &&
                    (t.total_words === 0 || t.completed_count < t.total_words)
                ) ?? data[0]

                if (firstIncomplete) {
                    await handleThemeSelect(firstIncomplete)
                }
            })
            .catch(err => {
                console.error(err)
                if (!cancelled) {
                    setThemes([])
                    setThemesLoading(false)
                    setThemesError(err?.message ?? 'Failed to load themes')
                }
            })
        return () => { cancelled = true }
    }, [slug, level])

    const handleThemeSelect = useCallback(async (theme: ThemeProgress, cardIndex?: number) => {
        if (!theme?.theme_id || Number.isNaN(theme.theme_id)) return
        await flush()
        setSelectedTheme(theme)
        try {
            const { vocab, progress, examples } = await fetchTheme(theme.theme_id, level)
            const queue = buildQueue(vocab, progress)
            setActiveQueue(queue)
            setActiveExamples(examples)

            if (cardIndex !== undefined) {
                setInitialCardIndex(cardIndex)
            } else {
                const firstIncomplete = queue.findIndex(c => !c.isCompleted && !c.isInRevision)
                setInitialCardIndex(firstIncomplete === -1 ? 0 : firstIncomplete)
            }

            setQuizKey(k => k + 1)
        } catch (err) {
            console.error(err)
            setActiveQueue([])
            setActiveExamples([])
            setInitialCardIndex(0)
        }
    }, [fetchTheme, level])

    /* ── Keep sidebar counts in sync with quiz actions ── */
    const handleThemeProgressUpdate = useCallback((themeId: number, progress: { completedCount: number; revisionCount: number }) => {
        setThemes(prev => prev.map(t =>
            t.theme_id === themeId
                ? { ...t, completed_count: progress.completedCount, revision_count: progress.revisionCount }
                : t
        ))
        setSelectedTheme(prev => prev && prev.theme_id === themeId
            ? { ...prev, completed_count: progress.completedCount, revision_count: progress.revisionCount }
            : prev
        )
    }, [])

    /* ── Auto-advance to next unfinished theme ── */
    const validThemes = useMemo(() => themes.filter((t) => t?.theme_id != null && !Number.isNaN(t.theme_id)), [themes])

    const handleQuizComplete = useCallback(() => {
        if (!selectedTheme) return
        const currentIdx = validThemes.findIndex(t => t.theme_id === selectedTheme.theme_id)
        const nextTheme = validThemes.slice(currentIdx + 1).find(t =>
            t.total_words === 0 || t.completed_count < t.total_words
        )
        if (nextTheme) {
            handleThemeSelect(nextTheme)
        }
    }, [selectedTheme, validThemes, handleThemeSelect])

    const advanceToNextTheme = useCallback(() => {
        if (!selectedTheme) return
        const currentIdx = validThemes.findIndex(t => t.theme_id === selectedTheme.theme_id)
        const nextTheme = validThemes.slice(currentIdx + 1).find(t =>
            t.total_words === 0 || t.completed_count < t.total_words
        )
        if (nextTheme) {
            handleThemeSelect(nextTheme)
        }
    }, [selectedTheme, validThemes, handleThemeSelect])

    const isLoadingVocab = selectedTheme != null && loadingThemeId === selectedTheme.theme_id

    return (
        <>
            <Navbar />

            <TutorialDialog
                open={tutorialOpen}
                onClose={() => {
                    setTutorialOpen(false)
                    markTutorialSeen()
                }}
            />

            {/* Mobile themes dialog */}
            <Dialog open={themesOpen} onClose={() => setThemesOpen(false)} fullScreen sx={{ display: { sm: 'none' } }} slotProps={{ paper: { sx: { background: '#faf7f2' } } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{
                        background: 'linear-gradient(135deg, #0e2e1f 0%, #071a0f 100%)',
                        px: 2.5, py: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexShrink: 0,
                    }}>
                        <Box>
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.25rem', fontWeight: 700, color: '#f5ede0', lineHeight: 1.2 }}>
                                {label}
                            </Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', color: 'rgba(245,237,224,0.6)', fontWeight: 500, mt: 0.25 }}>
                                {validThemes.reduce((s, t) => s + t.total_words, 0)} words · {validThemes.length} themes
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setThemesOpen(false)} size="small" sx={{ color: '#f5ede0', ml: 1 }}>
                            <Close sx={{ fontSize: '1.5rem' }} />
                        </IconButton>
                    </Box>

                    <Box sx={{ overflowY: 'auto', flex: 1, py: 0.5 }}>
                        {validThemes.map((theme, idx) => {
                            const progress = theme.total_words > 0
                                ? Math.round((theme.completed_count / theme.total_words) * 100)
                                : 0
                            const isActive = selectedTheme?.theme_id === theme.theme_id
                            const isComplete = progress === 100

                            return (
                                <Box
                                    key={theme.theme_id}
                                    onClick={() => {
                                        handleThemeSelect(theme)
                                        setThemesOpen(false)
                                    }}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.5,
                                        px: 2.5, py: 1.5, cursor: 'pointer',
                                        background: isActive ? 'rgba(184,134,11,0.08)' : 'transparent',
                                        borderLeft: isActive ? '3px solid #b8860b' : '3px solid transparent',
                                        borderBottom: '1px solid rgba(184,134,11,0.07)',
                                        transition: 'all 0.15s',
                                        '&:hover': { background: isActive ? 'rgba(184,134,11,0.1)' : 'rgba(184,134,11,0.04)' },
                                    }}
                                >
                                    <Box sx={{
                                        width: 32, height: 32, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '50%',
                                        background: isActive ? 'rgba(184,134,11,0.15)' : isComplete ? 'rgba(46,125,50,0.08)' : 'rgba(122,110,101,0.08)',
                                    }}>
                                        {isComplete ? <CheckCircle sx={{ fontSize: '1.1rem', color: '#2e7d32' }} />
                                            : isActive ? <Box sx={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid #b8860b', ml: '2px' }} />
                                                : <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#7a6e65' }}>{idx + 1}</Typography>
                                        }
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{
                                            fontFamily: 'Jost, sans-serif',
                                            fontSize: '0.95rem',
                                            fontWeight: isActive ? 700 : 500,
                                            color: isActive ? '#2c1a0e' : '#3d3028',
                                            lineHeight: 1.25,
                                        }}>
                                            {theme.display_name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.4 }}>
                                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#9e8a7a' }}>
                                                {theme.total_words} words
                                            </Typography>
                                            {theme.revision_count > 0 && (
                                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#1565c0' }}>
                                                    · {theme.revision_count} revision
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, background: 'rgba(184,134,11,0.1)', overflow: 'hidden' }}>
                                            <Box sx={{
                                                height: '100%', borderRadius: 2,
                                                width: `${progress}%`,
                                                background: isComplete ? 'linear-gradient(90deg, #2e7d32, #4caf50)' : 'linear-gradient(90deg, #b8860b, #d4a843)',
                                                transition: 'width 0.4s ease',
                                            }} />
                                        </Box>
                                    </Box>
                                    <Typography sx={{
                                        fontFamily: 'Jost, sans-serif',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        color: isComplete ? '#2e7d32' : isActive ? '#b8860b' : '#9e8a7a',
                                        flexShrink: 0,
                                    }}>
                                        {progress}%
                                    </Typography>
                                </Box>
                            )
                        })}
                    </Box>
                </Box>
            </Dialog>

            <SettingsDialog
                open={settingsOpen} onClose={() => setSettingsOpen(false)}
                showDiacritics={showDiacritics} onToggleDiacritics={() => setShowDiacritics(p => !p)}
                alwaysShow={alwaysShow} onToggleAlwaysShow={() => setAlwaysShow(p => !p)}
                textScale={textScale} onTextScaleChange={setTextScale}
                onOpenTutorial={() => setTutorialOpen(true)}
            />

            <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
                <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
                    {/* Desktop controls */}
                    {selectedTheme && (
                        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { sm: '1.6rem', md: '2rem' }, fontWeight: 700, color: '#2c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedTheme.display_name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                <DesktopTextScaleSlider textScale={textScale} onChange={setTextScale} />
                                <PillToggle enabled={alwaysShow} onToggle={() => setAlwaysShow(p => !p)} label="Always show card" activeColor="#0e2e1f" />
                                <PillToggle enabled={showDiacritics} onToggle={() => setShowDiacritics(p => !p)} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                                <IconButton onClick={() => setTutorialOpen(true)} size="small" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}>
                                    <HelpOutlineRounded sx={{ fontSize: '1rem' }} />
                                </IconButton>
                            </Box>
                        </Box>
                    )}

                    {/* Mobile controls */}
                    {selectedTheme && (
                        <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#2c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, mr: 1 }}>
                                {selectedTheme.display_name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
                                <Button size="small" onClick={() => setThemesOpen(true)} variant="outlined" sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: '20px', px: 1.5, py: '4px', borderColor: 'rgba(14,46,31,0.35)', color: '#0e2e1f', '&:hover': { background: 'rgba(14,46,31,0.06)', borderColor: '#0e2e1f' } }}>Themes</Button>
                                <IconButton onClick={() => setSettingsOpen(true)} size="small" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}><Settings sx={{ fontSize: '1rem' }} /></IconButton>
                            </Box>
                        </Box>
                    )}

                    {/* Main content */}
                    {themesLoading && !selectedTheme ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
                            <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '1.5rem 1rem', md: '2rem 1.5rem' }, minHeight: 340, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Skeleton variant="rounded" height={2} sx={{ mb: 2 }} />
                                <Skeleton variant="text" width={80} sx={{ mx: 'auto' }} />
                                <Skeleton variant="rounded" height={88} width="55%" sx={{ mx: 'auto', mt: 1 }} />
                                <Skeleton variant="rounded" height={32} width="30%" sx={{ mx: 'auto' }} />
                                <Skeleton variant="rounded" height={44} width="100%" sx={{ mt: 'auto' }} />
                            </Box>
                            <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.15)', borderRadius: '10px', overflow: 'hidden', display: { xs: 'none', lg: 'block' } }}>
                                <Skeleton variant="rounded" height={100} sx={{ borderRadius: 0 }} />
                                {[...Array(5)].map((_, i) => (
                                    <Box key={i} sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(184,134,11,0.07)', display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                        <Skeleton variant="circular" width={28} height={28} />
                                        <Box sx={{ flex: 1 }}><Skeleton variant="text" width="70%" height={14} /><Skeleton variant="text" width="40%" height={12} sx={{ mt: 0.5 }} /><Skeleton variant="rounded" height={3} width="100%" sx={{ mt: 0.75, borderRadius: 2 }} /></Box>
                                        <Skeleton variant="text" width={28} height={12} />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
                            <Box>
                                {isLoadingVocab ? (
                                    <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '1.5rem 1rem', md: '2rem 1.5rem' }, minHeight: 340, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Skeleton variant="rounded" height={2} sx={{ mb: 2 }} />
                                        <Skeleton variant="text" width={80} sx={{ mx: 'auto' }} />
                                        <Skeleton variant="rounded" height={88} width="55%" sx={{ mx: 'auto', mt: 1 }} />
                                        <Skeleton variant="rounded" height={32} width="30%" sx={{ mx: 'auto' }} />
                                        <Skeleton variant="rounded" height={44} width="100%" sx={{ mt: 'auto' }} />
                                    </Box>
                                ) : selectedTheme && activeQueue.length > 0 ? (
                                    <FlashcardQuiz
                                        textScale={textScale}
                                        key={quizKey}
                                        initialQueue={activeQueue}
                                        themeId={selectedTheme.theme_id}
                                        allExamples={activeExamples}
                                        showDiacritics={showDiacritics}
                                        alwaysShow={alwaysShow}
                                        onComplete={handleQuizComplete}
                                        themeLabel={selectedTheme.display_name}
                                        totalInTheme={selectedTheme.total_words}
                                        alreadyCompletedCount={selectedTheme.completed_count}
                                        initialCardIndex={initialCardIndex}
                                        flushRef={flushRef}
                                        levelCode={level}
                                        onThemeProgressUpdate={handleThemeProgressUpdate}
                                    />
                                ) : selectedTheme ? (
                                    <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '2rem 1rem', md: '3rem 1.5rem' }, minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center' }}>
                                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e' }}>
                                            No words yet
                                        </Typography>
                                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#7a6e65', maxWidth: 400 }}>
                                            This theme doesn&apos;t have any words for <strong>{label}</strong> yet.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ background: '#fff', border: '1px solid rgba(184,134,11,0.2)', borderRadius: '10px', padding: { xs: '2rem 1rem', md: '3rem 1.5rem' }, minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center' }}>
                                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#2c1a0e' }}>
                                            {themesError ? 'Something went wrong' : 'No themes found'}
                                        </Typography>
                                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', color: '#7a6e65', maxWidth: 400 }}>
                                            {themesError ?? `There are no themes for ${label} yet.`}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                            {validThemes.length > 0 && (
                                <Box sx={{ display: { xs: 'none', lg: 'block' }, position: 'sticky', top: 80, maxHeight: 'calc(100vh - 100px)' }}>
                                    <ThemePlaylistSidebar
                                        themes={validThemes}
                                        selectedTheme={selectedTheme}
                                        onSelectTheme={(t) => handleThemeSelect(t)}
                                        label={label}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}
                </Container>
            </Box>
        </>
    )
}
