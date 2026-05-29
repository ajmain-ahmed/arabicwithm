'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
    Box, Button, Typography, Collapse,
    ToggleButton, ToggleButtonGroup, Badge,
} from '@mui/material'
import { MenuBook, TouchApp } from '@mui/icons-material'
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
import type { ExampleRow } from '@/app/actions/vocab'

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
    const checkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (checkingTimerRef.current) clearTimeout(checkingTimerRef.current)
        }
    }, [])

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
            checkingTimerRef.current = setTimeout(() => setChecking(false), 500)
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
            <Box sx={{ background: 'rgba(245,237,224,0.5)', borderRadius: '8px', padding: { xs: '1rem', sm: '1.25rem' }, borderLeft: '3px solid #b8860b', mb: { xs: '0.75rem', md: '0.25rem' } }}>
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
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(1rem * ${textScale})`, color: '#6b5f55', textAlign: 'left', mb: 0.35 }}>
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

export default InteractiveSentenceBuilder
export { DraggableWord, ExampleSentences }
