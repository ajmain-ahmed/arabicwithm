'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AnswerResult } from '@/app/lib/sm2'
import type { RevisionCard, Answer } from '@/app/actions/revision'
import { type SessionCard, type Queue, RATING_COLORS, makeDotId } from '../types'

interface QueueState {
    deck: SessionCard[]
    answeredDots: Map<string, string>
    dotOrder: string[]
    totalEver: number
    uniqueAnsweredIds: Set<number>
    initialUniqueTotal: number
}

export default function useAnkiQueue(
    initial: SessionCard[],
    seedAnswered?: Map<string, string>,
    seedDotOrder?: string[],
    sessionKey?: number
) {
    const [state, setState] = useState<QueueState>(() => {
        const initialDotIds = initial.map(c => c.dotId)
        const mergedDotOrder = [...(seedDotOrder ?? []), ...initialDotIds]
        const initialIds = new Set(initial.map(c => c.data.id))
        return {
            deck: initial,
            answeredDots: seedAnswered ? new Map(seedAnswered) : new Map(),
            dotOrder: mergedDotOrder,
            totalEver: mergedDotOrder.length,
            uniqueAnsweredIds: new Set(),
            initialUniqueTotal: initialIds.size,
        }
    })

    useEffect(() => {
        const initialDotIds = initial.map(c => c.dotId)
        const mergedDotOrder = [...(seedDotOrder ?? []), ...initialDotIds]
        const answeredDots = seedAnswered ? new Map(seedAnswered) : new Map()

        /* ── BUG FIX: do NOT pre-mark initial cards as answered ──
           lastRating belongs to a previous session, not this one. ── */

        const initialIds = new Set(initial.map(c => c.data.id))
        setState({
            deck: initial,
            answeredDots,
            dotOrder: mergedDotOrder,
            totalEver: mergedDotOrder.length,
            uniqueAnsweredIds: new Set(),
            initialUniqueTotal: initialIds.size,
        })
    }, [sessionKey, initial, seedAnswered, seedDotOrder])

    const currentCard = state.deck[0] ?? null
    const isComplete = state.deck.length === 0
    const doneCount = state.answeredDots.size

    const counts: Record<Queue, number> = useMemo(() => {
        const c: Record<Queue, number> = { new: 0, learning: 0, review: 0 }
        state.deck.forEach(sc => { c[sc.queue]++ })
        return c
    }, [state.deck])

    const answer = useCallback((ans: Answer, result: AnswerResult) => {
        setState(prev => {
            if (prev.deck.length === 0) return prev
            const [current, ...rest] = prev.deck

            const color = RATING_COLORS[ans]
            const newAnswered = new Map(prev.answeredDots)
            newAnswered.set(current.dotId, color)

            const newUniqueAnswered = new Set(prev.uniqueAnsweredIds)
            newUniqueAnswered.add(current.data.id)

            const updatedData: RevisionCard = {
                ...current.data,
                repetitions: result.repetitions,
                interval_days: result.interval_days,
                ease_factor: result.ease_factor,
                // learning_step removed from schema
                last_review_at: new Date().toISOString(),
            }

            const shouldReinsert = ans === 'again' || !result.graduated

            if (shouldReinsert) {
                const reinserted: SessionCard = {
                    ...current,
                    queue: 'learning',
                    lapses: ans === 'again' ? current.lapses + 1 : current.lapses,
                    dotId: makeDotId(),
                    // learningStep removed from schema
                    data: updatedData,
                }
                const insertAt = Math.min(3, rest.length)
                const newDeck = [
                    ...rest.slice(0, insertAt),
                    reinserted,
                    ...rest.slice(insertAt),
                ]
                const newDotOrder = [...prev.dotOrder]
                const insertDotAt = newDotOrder.indexOf(current.dotId) + 1 + insertAt
                newDotOrder.splice(insertDotAt, 0, reinserted.dotId)

                return {
                    ...prev,
                    deck: newDeck,
                    answeredDots: newAnswered,
                    dotOrder: newDotOrder,
                    totalEver: prev.totalEver + 1,
                    uniqueAnsweredIds: newUniqueAnswered,
                }
            }

            return {
                ...prev,
                deck: rest,
                answeredDots: newAnswered,
                uniqueAnsweredIds: newUniqueAnswered,
            }
        })
    }, [])

    return {
        ...state,
        currentCard,
        isComplete,
        doneCount,
        counts,
        answer,
        uniqueDoneCount: state.uniqueAnsweredIds.size,
        uniqueTotal: state.initialUniqueTotal,
    }
}