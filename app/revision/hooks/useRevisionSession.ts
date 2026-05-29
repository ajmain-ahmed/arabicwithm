'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '@/app/AuthContext'
import { useRevisionStore } from '@/store/revisionStore'
import { submitRevisionAnswersBatch, type RevisionCard, type Answer } from '@/app/actions/revision'
import { computeAnswerResult, type ProgressState } from '@/app/lib/sm2'
import useAnkiQueue from './useAnkiQueue'
import { type SessionMode, type SessionCard, type ExtendedSessionLog, type MultiplierData, type ModeConfig, classifyCard, computeCardPoints, makeDotId, RATING_COLORS } from '../types'

export default function useRevisionSession() {
    const { user } = useAuth()
    const getSession = useRevisionStore((s) => s.getSession)
    const updateSessionCard = useRevisionStore((s) => s.updateSessionCard)
    const clearSession = useRevisionStore((s) => s.clearSession)

    const [dueCards, setDueCards] = useState<RevisionCard[]>([])
    const [completedCards, setCompletedCards] = useState<RevisionCard[]>([])
    const [loading, setLoading] = useState(false)
    const [showDiacritics, setShowDiacritics] = useState(true)
    const [textScale, setTextScale] = useState(1.1)
    const [sessionStarted, setSessionStarted] = useState(false)
    const [sessionMode, setSessionMode] = useState<SessionMode | null>(null)
    const [sessionLogs, setSessionLogs] = useState<ExtendedSessionLog[]>([])
    const [sessionKey, setSessionKey] = useState(0)
    const [totalPoints, setTotalPoints] = useState(0)
    const [displayPoints, setDisplayPoints] = useState(0)
    const displayPointsRef = useRef(0)
    const [lastPoints, setLastPoints] = useState<number | null>(null)
    const [pointsAnimKey, setPointsAnimKey] = useState(0)
    const [lastMultipliers, setLastMultipliers] = useState<MultiplierData | null>(null)
    const [streakCount, setStreakCount] = useState(0)
    const [showResults, setShowResults] = useState(false)
    const [targetPoints, setTargetPoints] = useState(0)
    const [modeConfig, setModeConfig] = useState<ModeConfig>({ reverse: false, rapidFire: false, scholar: false, weakWords: false })
    const pendingAnswersRef = useRef<{ vocabId: number; answer: Answer }[]>([])
    const hasUnsavedRef = useRef(false)
    const pointsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    /* ── NEW: track which unique cards have already been scored ── */
    const [scoredIds, setScoredIds] = useState<Set<number>>(new Set())

    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
    const leaveTargetUrlRef = useRef<string | null>(null)

    /* ── Count-up animation for points ── */
    useEffect(() => {
        const start = displayPointsRef.current
        const end = totalPoints
        if (start === end) return
        const duration = 500
        const startTime = performance.now()

        const animate = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const current = Math.round(start + (end - start) * progress)
            displayPointsRef.current = current
            setDisplayPoints(current)
            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }, [totalPoints])

    const initialDeck = useMemo<SessionCard[]>(() => dueCards.map(card => ({
        data: card,
        queue: classifyCard(card),
        lapses: card.lapses ?? 0,
        dotId: makeDotId(),
        // learningStep removed from schema
    })), [dueCards])

    const { seedAnsweredDots, seedDotOrder } = useMemo(() => {
        const dueIds = new Set(dueCards.map(c => c.id))
        const answeredDots = new Map<string, string>()
        const dotOrder: string[] = []
        completedCards.forEach(card => {
            if (dueIds.has(card.id)) return
            const dotId = `seed-${card.id}`
            if (card.lastRating) answeredDots.set(dotId, RATING_COLORS[card.lastRating])
            dotOrder.push(dotId)
        })
        return { seedAnsweredDots: answeredDots, seedDotOrder: dotOrder }
    }, [completedCards, dueCards])

    const {
        deck, currentCard, counts, doneCount, totalEver, isComplete, answer,
        dotOrder, answeredDots, uniqueDoneCount, uniqueTotal,
    } = useAnkiQueue(initialDeck, seedAnsweredDots, seedDotOrder, sessionKey)

    /* ── Session complete transition ── */
    const isFinished = isComplete || (sessionStarted && dueCards.length === 0 && completedCards.length === 0)
    useEffect(() => {
        setShowResults(isFinished)
    }, [isFinished])

    const againPendingIds = useMemo<Set<string>>(() => {
        const set = new Set<string>()
        const deckMap = new Map(deck.map(c => [c.dotId, c]))
        dotOrder.forEach(id => {
            if (answeredDots.has(id)) return
            const card = deckMap.get(id)
            if (card && card.lapses > 0) set.add(id)
        })
        return set
    }, [dotOrder, answeredDots, deck])

    /* ── Flush pending answers to server ── */
    const flushPendingAnswers = useCallback(async () => {
        const pending = pendingAnswersRef.current
        if (pending.length === 0) return

        const answers = pending.splice(0)
        hasUnsavedRef.current = false

        try {
            await submitRevisionAnswersBatch(answers)
        } catch (err) {
            console.error('Batch flush failed:', err)
            // Restore failed answers for next flush attempt
            pending.unshift(...answers)
            hasUnsavedRef.current = true
        }
    }, [])

    /* ── Flush pending answers when session completes ── */
    useEffect(() => {
        if (isComplete && user && sessionStarted && sessionMode === 'daily') {
            flushPendingAnswers()
            clearSession()
        }
    }, [isComplete, user, flushPendingAnswers, sessionStarted, sessionMode, clearSession])

    /* ── Load cards ── */
    const hasInitializedRef = useRef(false)

    const loadCards = useCallback(async () => {
        setLoading(true)

        await flushPendingAnswers()

        try {
            const { dueCards, completedCards } = await getSession()
            setDueCards(dueCards)
            setCompletedCards(completedCards)
            setSessionStarted(true)

            // Target = 60% of theoretical per-card max (no streak bonus)
            // 100 * maxDifficulty(2.42) * maxTime(1.2) * maxRating(1.4) * 0.6 ≈ 244 per card
            const target = Math.round((dueCards.length + completedCards.length) * 244)
            setTargetPoints(target)

            setSessionLogs([])
            setScoredIds(new Set()) // reset scored tracking

            if (!hasInitializedRef.current) {
                hasInitializedRef.current = true
                setSessionKey(k => k + 1)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [flushPendingAnswers, getSession])

    const restartSession = useCallback(async () => {
        await flushPendingAnswers()
        clearSession()
        setDueCards([])
        setCompletedCards([])
        hasInitializedRef.current = false
        setSessionLogs([])
        setSessionStarted(false)
        setSessionMode(null)
        setSessionKey(k => k + 1)
        setTotalPoints(0)
        setDisplayPoints(0)
        displayPointsRef.current = 0
        setLastPoints(null)
        setPointsAnimKey(0)
        setStreakCount(0)
        setLastMultipliers(null)
        setShowResults(false)
        setTargetPoints(0)
        setScoredIds(new Set()) // reset scored tracking
        setModeConfig({ reverse: false, rapidFire: false, scholar: false, weakWords: false })
        setLeaveDialogOpen(false)
        leaveTargetUrlRef.current = null
        if (pointsTimeoutRef.current) clearTimeout(pointsTimeoutRef.current)
        pointsTimeoutRef.current = null
    }, [clearSession, flushPendingAnswers])

    /* ── Flush on tab hide / page leave / soft navigation ── */
    useEffect(() => {
        const flush = () => { flushPendingAnswers() }

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') flush()
        }

        const onPageHide = () => { flush() }

        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedRef.current || (sessionStarted && sessionMode === 'custom')) {
                e.preventDefault()
                e.returnValue = ''
            }
            flush()
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('pagehide', onPageHide)
        window.addEventListener('beforeunload', onBeforeUnload)

        return () => {
            if (pointsTimeoutRef.current) clearTimeout(pointsTimeoutRef.current)
            flush()
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('pagehide', onPageHide)
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    }, [flushPendingAnswers, sessionStarted, sessionMode])

    /* ── Reset to welcome screen when navbar Revision is clicked ── */
    useEffect(() => {
        const onNavigateToRevision = () => {
            restartSession()
        }
        window.addEventListener('navigate-to-revision', onNavigateToRevision)
        return () => {
            window.removeEventListener('navigate-to-revision', onNavigateToRevision)
        }
    }, [restartSession])

    /* ── Block navigation during custom sessions ── */
    useEffect(() => {
        const isCustom = sessionStarted && sessionMode === 'custom' && !isFinished
        ;(window as any).__customSessionActive = isCustom
    }, [sessionStarted, sessionMode, isFinished])

    useEffect(() => {
        const onLeaveRequested = (e: CustomEvent<{ url: string }>) => {
            leaveTargetUrlRef.current = e.detail.url
            setLeaveDialogOpen(true)
        }
        window.addEventListener('revision-leave-requested', onLeaveRequested as EventListener)
        return () => {
            window.removeEventListener('revision-leave-requested', onLeaveRequested as EventListener)
        }
    }, [])

    /* ── Optimistic answer handler ── */
    const handleAnswer = useCallback((ans: Answer, timeTaken: number) => {
        if (!currentCard) return

        const vocabId = currentCard.data.progress_word_id
        const currentProgress: ProgressState = {
            repetitions: currentCard.data.repetitions,
            interval_days: currentCard.data.interval_days,
            ease_factor: currentCard.data.ease_factor,
            lapses: currentCard.data.lapses ?? 0,
        }

        const result = computeAnswerResult(currentProgress, ans)

        answer(ans, result)

        if (sessionMode === 'daily') {
            updateSessionCard(vocabId, {
                repetitions: result.repetitions,
                interval_days: result.interval_days,
                ease_factor: result.ease_factor,
                lapses: ans === 'again' ? (currentCard.data.lapses ?? 0) + 1 : (currentCard.data.lapses ?? 0),
            }, ans)

            pendingAnswersRef.current.push({ vocabId, answer: ans })
            hasUnsavedRef.current = true
        }

        /* ── Streak logic: Again/Hard break, Good/Easy build ── */
        const newStreak = (ans === 'good' || ans === 'easy') ? streakCount + 1 : 0
        setStreakCount(newStreak)

        /* ── Points: only score on first encounter per unique card ── */
        const alreadyScored = scoredIds.has(vocabId)
        let cardPoints = 0
        let multipliers: MultiplierData | null = null

        if (!alreadyScored) {
            const pointsResult = computeCardPoints(
                currentProgress.ease_factor,
                timeTaken,
                ans,
                currentCard.data.lapses ?? 0,
                newStreak
            )
            cardPoints = pointsResult.points
            multipliers = pointsResult.multipliers

            setScoredIds(prev => {
                const next = new Set(prev)
                next.add(vocabId)
                return next
            })

            if (pointsTimeoutRef.current) clearTimeout(pointsTimeoutRef.current)
            setTotalPoints(prev => prev + cardPoints)
            setLastPoints(cardPoints)
            setPointsAnimKey(k => k + 1)
            setLastMultipliers(multipliers)
            pointsTimeoutRef.current = setTimeout(() => setLastPoints(null), 1400)
        }

        setSessionLogs(prev => [...prev, {
            cardId: currentCard.data.id ?? vocabId,
            word: currentCard.data.word,
            rating: ans,
            timeTaken,
            level: currentCard.data.level,
            theme: currentCard.data.theme_name ?? '',
            queue: currentCard.queue,
            easeFactor: currentCard.data.ease_factor,
            lapsesAtTime: currentCard.data.lapses ?? 0,
            cardPoints,
        }])
    }, [currentCard, answer, sessionMode, streakCount, updateSessionCard, scoredIds])

    const startCustom = useCallback((cards: RevisionCard[], config: ModeConfig) => {
        setSessionMode('custom')
        setDueCards(cards)
        setCompletedCards([])
        setSessionStarted(true)
        setSessionLogs([])
        setSessionKey(k => k + 1)
        setScoredIds(new Set()) // reset scored tracking
        setModeConfig(config)
        const target = Math.round(cards.length * 244)
        setTargetPoints(target)
    }, [])

    const startDaily = useCallback(() => {
        setSessionMode('daily')
        loadCards()
    }, [loadCards])

    return {
        /* Queue / deck */
        deck,
        currentCard,
        counts,
        isComplete,
        dotOrder,
        answeredDots,
        againPendingIds,
        uniqueDoneCount,
        uniqueTotal,

        /* Actions */
        handleAnswer,
        restartSession,
        loadCards,
        startDaily,
        startCustom,

        /* Session state */
        sessionStarted,
        sessionMode,
        sessionLogs,
        totalPoints,
        displayPoints,
        lastPoints,
        pointsAnimKey,
        lastMultipliers,
        streakCount,
        showResults,
        loading,
        dueCards,
        completedCards,
        targetPoints,
        modeConfig,

        /* Leave dialog */
        leaveDialogOpen,
        setLeaveDialogOpen,
        leaveTargetUrlRef,

        /* UI settings */
        showDiacritics,
        setShowDiacritics,
        textScale,
        setTextScale,
    }
}