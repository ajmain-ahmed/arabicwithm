'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { SentenceRevisionCard, Answer } from '@/app/actions/revision'
import {
  fetchSentenceRevisionSession,
  submitSentenceRevisionAnswersBatch,
} from '@/app/actions/revision'
import { computeAnswerResult } from '@/app/lib/sm2'
import type { ProgressState } from '@/app/lib/sm2'
import { useSentenceQueue } from './useSentenceQueue'
import type { ExtendedSessionLog, MultiplierData, SessionCard } from '../types'
import { classifyCard, makeDotId, computeCardPoints } from '../types'

function toProgressState(card: SentenceRevisionCard): ProgressState {
  return {
    repetitions: card.repetitions ?? 0,
    interval_days: card.interval_days ?? 0,
    ease_factor: card.ease_factor ?? 2.5,
    lapses: card.lapses ?? 0,
  }
}

export function useSentenceSession() {
  const [mode, setMode] = useState<'idle' | 'daily' | 'custom'>('idle')
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([])
  const [sessionLog, setSessionLog] = useState<ExtendedSessionLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [points, setPoints] = useState(0)
  const [correctStreak, setCorrectStreak] = useState(0)
  const [currentMultipliers, setCurrentMultipliers] = useState<MultiplierData | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [showResultOverlay, setShowResultOverlay] = useState(false)
  const [lastPoints, setLastPoints] = useState<number | null>(null)
  const [pointsAnimKey, setPointsAnimKey] = useState(0)

  const answerStartRef = useRef<number>(0)
  const pendingAnswersRef = useRef<
    { showSlug: string; episodeSlug: string; blockIndex: number; answer: Answer }[]
  >([])
  const logRef = useRef<ExtendedSessionLog[]>([])
  const {
    deck,
    currentCard,
    isComplete,
    answeredDots,
    dotOrder,
    currentDotId,
    getDotColor,
    answer: queueAnswer,
  } = useSentenceQueue(sessionCards)

  // Flush pending answers
  const flushPendingAnswers = useCallback(async () => {
    const batch = pendingAnswersRef.current
    if (batch.length === 0) return
    pendingAnswersRef.current = []
    try {
      await submitSentenceRevisionAnswersBatch(batch)
    } catch (err) {
      console.error('Sentence batch submission failed:', err)
    }
  }, [])

  // Load daily session
  const loadDaily = useCallback(async () => {
    setIsLoading(true)
    try {
      const { dueCards, completedCards } = await fetchSentenceRevisionSession()
      const allCards = [...completedCards, ...dueCards]
      const mapped: SessionCard[] = allCards.map(c => ({
        data: c,
        queue: classifyCard(c),
        lapses: c.lapses ?? 0,
        dotId: makeDotId(),
      }))
      setSessionCards(mapped)
      setMode('daily')
      setStartTime(Date.now())
      setPoints(0)
      setCorrectStreak(0)
      setSessionLog([])
      logRef.current = []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startCustomSession = useCallback(async (cards: SentenceRevisionCard[]) => {
    const mapped: SessionCard[] = cards.map(c => ({
      data: c,
      queue: classifyCard(c),
      lapses: c.lapses ?? 0,
      dotId: makeDotId(),
    }))
    setSessionCards(mapped)
    setMode('custom')
    setStartTime(Date.now())
    setPoints(0)
    setCorrectStreak(0)
    setSessionLog([])
    logRef.current = []
  }, [])

  const endSession = useCallback(() => {
    flushPendingAnswers()
    setShowResultOverlay(true)
  }, [flushPendingAnswers])

  const handleAnswer = useCallback(
    (ans: Answer) => {
      if (!currentCard) return

      const timeTaken = answerStartRef.current
        ? (Date.now() - answerStartRef.current) / 1000
        : 0

      const progress = toProgressState(currentCard.data)
      const result = computeAnswerResult(progress, ans)

      const { points: cardPoints, multipliers } = computeCardPoints(
        currentCard.data.ease_factor,
        timeTaken,
        ans,
        currentCard.lapses,
        correctStreak
      )

      setCurrentMultipliers(multipliers)

      if (ans !== 'again') {
        setPoints(p => p + cardPoints)
        setCorrectStreak(s => s + 1)
        setLastPoints(cardPoints)
        setPointsAnimKey(k => k + 1)
      } else {
        setCorrectStreak(0)
        setLastPoints(0)
        setPointsAnimKey(k => k + 1)
      }

      const log: ExtendedSessionLog = {
        cardId: currentCard.data.id,
        sentence: currentCard.data.arabicPlain,
        rating: ans,
        timeTaken: Math.round(timeTaken * 10) / 10,
        queue: currentCard.queue,
        cardPoints,
        easeFactor: currentCard.data.ease_factor,
        lapsesAtTime: currentCard.lapses,
      }
      logRef.current.push(log)
      setSessionLog([...logRef.current])

      pendingAnswersRef.current.push({
        showSlug: currentCard.data.show_slug,
        episodeSlug: currentCard.data.episode_slug,
        blockIndex: currentCard.data.block_index,
        answer: ans,
      })

      queueAnswer(ans, {
        repetitions: result.repetitions,
        interval_days: result.interval_days,
        ease_factor: result.ease_factor,
        lapses: ans === 'again' ? (currentCard?.lapses ?? 0) + 1 : (currentCard?.lapses ?? 0),
        graduated: result.interval_days > 0 && result.repetitions >= 2,
      })

      answerStartRef.current = Date.now()
    },
    [currentCard, correctStreak, queueAnswer]
  )

  // Start timer when card changes
  useEffect(() => {
    answerStartRef.current = Date.now()
  }, [currentCard?.data.id])

  // Flush on unmount / page leave
  useEffect(() => {
    const onBeforeUnload = () => flushPendingAnswers()
    const onVisibility = () => {
      if (document.hidden) flushPendingAnswers()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
      flushPendingAnswers()
    }
  }, [flushPendingAnswers])

  return {
    // State
    mode,
    isLoading,
    deck,
    currentCard,
    isComplete,
    answeredDots,
    dotOrder,
    currentDotId,
    getDotColor,
    points,
    correctStreak,
    currentMultipliers,
    sessionLog,
    showResultOverlay,
    isAudioPlaying,
    startTime,
    lastPoints,
    pointsAnimKey,

    // Actions
    loadDaily,
    startCustomSession,
    handleAnswer,
    endSession,
    setShowResultOverlay,
    setIsAudioPlaying,
    flushPendingAnswers,
  }
}
