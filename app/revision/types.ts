import type { RevisionCard, Answer, SessionLog } from '@/app/actions/revision'

export type SessionMode = 'daily' | 'custom'

export type Queue = 'new' | 'learning' | 'review'

export interface SessionCard {
    data: RevisionCard
    queue: Queue
    lapses: number
    dotId: string
}

export type ExtendedSessionLog = SessionLog & {
    easeFactor?: number
    lapsesAtTime?: number
    cardPoints?: number
}

export interface DotInfo {
    dotId: string
    color?: string
    isCurrent: boolean
    isAgainPending: boolean
}

export const QUEUE_CONFIG: Record<Queue, { label: string; color: string; activeBg: string; border: string }> = {
    new: { label: 'New', color: '#1565c0', activeBg: 'rgba(21,101,192,0.12)', border: 'rgba(21,101,192,0.5)' },
    learning: { label: 'Learning', color: '#c13a00', activeBg: 'rgba(193,58,0,0.10)', border: 'rgba(193,58,0,0.45)' },
    review: { label: 'To Review', color: '#2e7d32', activeBg: 'rgba(46,125,50,0.10)', border: 'rgba(46,125,50,0.45)' },
}

export const RATING_COLORS: Record<Answer, string> = {
    again: '#c62828',
    hard: '#e65100',
    good: '#2e7d32',
    easy: '#1565c0',
}

/* ── Helpers ───────────────────────────────────────────── */
export function classifyCard(card: RevisionCard): Queue {
    const lastReview = card.last_review_at as string | null | undefined
    const interval = card.interval_days as number | null | undefined
    if (!lastReview && (card.repetitions ?? 0) === 0) return 'new'
    if (interval == null || interval === 0) return 'learning'
    return 'review'
}

export function parseExamples(card: RevisionCard) {
    const exAr = card.ex_ar
    const exEn = card.ex_en
    const exDi = card.ex_di
    if (!exAr || !exEn) return []
    const ar = exAr.split(';').map((s) => s.trim())
    const di = exDi ? exDi.split(';').map((s) => s.trim()) : ar
    const en = exEn.split(';').map((s) => s.trim())
    const count = Math.min(ar.length, en.length)
    return Array.from({ length: count }, (_, i) => ({
        arabic: ar[i] || '',
        diacritic: di[i] || ar[i] || '',
        english: en[i] || '',
    }))
}

let _dotIdCounter = 0
export function makeDotId() { return `dot-${++_dotIdCounter}` }

export interface MultiplierData {
    difficulty: number
    time: number
    rating: number
    streak: number
}

export function computeCardPoints(
    easeFactor: number,
    timeTaken: number,
    rating: Answer,
    lapsesAtTime: number,
    streakCount: number
): { points: number; multipliers: MultiplierData } {
    const basePoints = 100
    const difficultyMultiplier = 0.5 + (2.5 / Math.max(easeFactor, 1.3))

    let timeMultiplier: number
    if (timeTaken <= 2) timeMultiplier = 1.2
    else if (timeTaken <= 5) timeMultiplier = 1.0
    else if (timeTaken <= 10) timeMultiplier = 0.8
    else timeMultiplier = 0.5

    const ratingMultiplier: Record<Answer, number> = {
        again: 0,
        hard: 0.6,
        good: 1.0,
        easy: 1.4,
    }

    const streakMultiplier = Math.min(1 + streakCount * 0.1, 2.0)
    const lapsePenalty = lapsesAtTime * 10

    const points = Math.max(0, Math.round(
        basePoints * difficultyMultiplier * timeMultiplier * ratingMultiplier[rating] * streakMultiplier - lapsePenalty
    ))

    return {
        points,
        multipliers: {
            difficulty: difficultyMultiplier,
            time: timeMultiplier,
            rating: ratingMultiplier[rating],
            streak: streakMultiplier,
        },
    }
}