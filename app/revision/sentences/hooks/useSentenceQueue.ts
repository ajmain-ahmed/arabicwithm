'use client'
import { useState, useCallback } from 'react'
import type { SessionCard, Queue } from '../types'
import { classifyCard, makeDotId } from '../types'

export type AnswerResult = {
  repetitions: number
  interval_days: number
  ease_factor: number
  lapses: number
  graduated: boolean
}

interface QueueState {
  deck: SessionCard[]
  answeredDots: Record<string, Queue>
  dotOrder: string[]
}

export function useSentenceQueue(initialCards?: SessionCard[]) {
  const [state, setState] = useState<QueueState>(() => {
    const deck = initialCards?.map(c => ({
      ...c,
      dotId: c.dotId || makeDotId(),
      queue: c.queue || classifyCard(c.data),
      lapses: c.lapses ?? 0,
    })) ?? []
    return {
      deck,
      answeredDots: {},
      dotOrder: deck.map(c => c.dotId),
    }
  })

  const currentCard = state.deck[0] ?? null
  const isComplete = state.deck.length === 0

  const getDotColor = useCallback((dotId: string) => {
    const queue = state.answeredDots[dotId]
    if (!queue) return '#ccc'
    const colors: Record<Queue, string> = {
      new: '#1565c0',
      learning: '#c13a00',
      review: '#2e7d32',
    }
    return colors[queue]
  }, [state.answeredDots])

  const answer = useCallback((ans: 'again' | 'hard' | 'good' | 'easy', result: AnswerResult) => {
    setState(prev => {
      if (prev.deck.length === 0) return prev
      const [current, ...rest] = prev.deck

      const nextQueue: Queue =
        !result.graduated
          ? 'learning'
          : result.interval_days <= 1
            ? 'learning'
            : 'review'

      const updatedCard: SessionCard = {
        ...current,
        data: { ...current.data, ...result, lastRating: ans },
        queue: nextQueue,
        lapses: ans === 'again' ? current.lapses + 1 : current.lapses,
      }

      const newAnswered = { ...prev.answeredDots, [current.dotId]: nextQueue }

      const shouldReinsert = ans === 'again' || !result.graduated
      if (shouldReinsert) {
        const newDotId = makeDotId()
        const reinserted: SessionCard = { ...updatedCard, dotId: newDotId }
        const insertAt = Math.min(3, rest.length)
        const newDeck = [
          ...rest.slice(0, insertAt),
          reinserted,
          ...rest.slice(insertAt),
        ]
        const newDotOrder = [...prev.dotOrder]
        const insertDotAt = newDotOrder.indexOf(current.dotId) + 1 + insertAt
        newDotOrder.splice(insertDotAt, 0, newDotId)

        return {
          deck: newDeck,
          answeredDots: newAnswered,
          dotOrder: newDotOrder,
        }
      }

      return {
        deck: rest,
        answeredDots: newAnswered,
        dotOrder: prev.dotOrder,
      }
    })
  }, [])

  return {
    deck: state.deck,
    currentCard,
    isComplete,
    answeredDots: state.answeredDots,
    dotOrder: state.dotOrder,
    currentDotId: currentCard?.dotId ?? null,
    getDotColor,
    answer,
  }
}
