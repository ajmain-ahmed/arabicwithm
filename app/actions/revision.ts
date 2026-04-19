'use server'

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const serviceUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!
const serviceClient = createServiceClient(serviceUrl, serviceKey)

async function getAuthClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll() { },
            },
        }
    )
}

async function getAuthenticatedUserId(): Promise<string | null> {
    try {
        const supabase = await getAuthClient()
        const { data, error } = await supabase.auth.getUser()
        if (error) {
            console.error("[revision] getUser error:", error.message)
            return null
        }
        return data.user?.id ?? null
    } catch (e) {
        console.error("[revision] unexpected auth error:", e)
        return null
    }
}

export type VocabRow = {
    id: number
    word: string
    word_diacritic: string
    transliteration: string
    definition: string
    level: string
    type: string
    root: string | null
    ex_ar: string | null
    ex_di: string | null
    ex_en: string | null
    theme_id: number
}

export type RevisionCard = VocabRow & {
    progress_word_id: number
    repetitions: number
    interval_days: number
    ease_factor: number
    last_review_at: string | null
    next_review_at: string | null
    isDue: boolean
}

export type Answer = 'again' | 'hard' | 'good' | 'easy'

const DAILY_NEW_LIMIT = 20
const LEARNING_STEPS = [1, 10] // minutes

function applySM2(
    repetitions: number,
    intervalDays: number,
    easeFactor: number,
    answer: Answer
): { repetitions: number; intervalDays: number; easeFactor: number } {
    let newReps = repetitions
    let newInterval = intervalDays
    let newEase = easeFactor

    if (answer === 'again') {
        newReps = 0
        newInterval = 0
    } else {
        if (answer === 'hard') {
            newEase = Math.max(1.3, easeFactor - 0.15)
        } else if (answer === 'easy') {
            newEase = easeFactor + 0.15
        }

        if (repetitions === 0) {
            newInterval = 0
        } else if (repetitions === 1) {
            newInterval = 1
        } else {
            if (answer === 'hard') {
                newInterval = Math.max(1, Math.round(intervalDays * 1.2))
            } else if (answer === 'good') {
                newInterval = Math.round(intervalDays * easeFactor)
            } else if (answer === 'easy') {
                newInterval = Math.round(intervalDays * easeFactor * 1.3)
            }
        }
        newReps = repetitions + 1
    }

    return { repetitions: newReps, intervalDays: newInterval, easeFactor: newEase }
}

function calculateNextReview(
    currentStep: number,
    repetitions: number,
    intervalDays: number,
    answer: Answer
): { nextReview: Date; newStep?: number; graduated: boolean } {
    const now = new Date()

    if (answer === 'again') {
        return {
            nextReview: new Date(now.getTime() + LEARNING_STEPS[0] * 60 * 1000),
            newStep: 0,
            graduated: false,
        }
    }

    if (repetitions === 0) {
        const nextStep = currentStep + 1
        if (nextStep < LEARNING_STEPS.length) {
            return {
                nextReview: new Date(now.getTime() + LEARNING_STEPS[nextStep] * 60 * 1000),
                newStep: nextStep,
                graduated: false,
            }
        } else {
            const tomorrow = new Date(now)
            tomorrow.setDate(now.getDate() + 1)
            return { nextReview: tomorrow, graduated: true }
        }
    }

    const next = new Date(now)
    next.setDate(now.getDate() + intervalDays)
    return { nextReview: next, graduated: true }
}

function getStartOfTodayUTC(): string {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

export async function fetchDueRevisionCards(): Promise<RevisionCard[]> {
    const userId = await getAuthenticatedUserId()
    console.log("[revision] fetchDueRevisionCards – userId:", userId)
    if (!userId) return []

    const now = new Date().toISOString()
    const startOfToday = getStartOfTodayUTC()
    console.log("[revision] now:", now, "startOfToday:", startOfToday)

    // Count how many new cards have already been introduced today
    const { count: introducedToday, error: countError } = await serviceClient
        .from('progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .gte('first_review_at', startOfToday)

    if (countError) {
        console.error("[revision] countError:", countError.message)
        throw new Error(countError.message)
    }

    const remainingNewLimit = Math.max(0, DAILY_NEW_LIMIT - (introducedToday ?? 0))
    console.log("[revision] introducedToday:", introducedToday, "remainingNewLimit:", remainingNewLimit)

    // 1. Reviews (graduated cards that are due)
    const { data: reviews, error: reviewsError } = await serviceClient
        .from('progress')
        .select(`
      word_id,
      repetitions,
      interval_days,
      ease_factor,
      last_review_at,
      next_review_at,
      vocab (*)
    `)
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .gt('repetitions', 0)
        .lte('next_review_at', now)
        .order('next_review_at', { ascending: true })

    if (reviewsError) throw new Error(reviewsError.message)
    console.log("[revision] reviews count:", reviews?.length ?? 0)

    // 2. Brand new cards (never reviewed) – limited per day
    const { data: brandNew, error: brandNewError } = await serviceClient
        .from('progress')
        .select(`
      word_id,
      repetitions,
      interval_days,
      ease_factor,
      last_review_at,
      next_review_at,
      vocab (*)
    `)
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .eq('repetitions', 0)
        .is('last_review_at', null)
        .order('created_at', { ascending: true })
        .limit(remainingNewLimit)

    if (brandNewError) throw new Error(brandNewError.message)
    console.log("[revision] brand new count:", brandNew?.length ?? 0)

    // 3. Learning cards – ALL cards that have been seen today (still in learning phase)
    const { data: learning, error: learningError } = await serviceClient
        .from('progress')
        .select(`
      word_id,
      repetitions,
      interval_days,
      ease_factor,
      last_review_at,
      next_review_at,
      vocab (*)
    `)
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .eq('repetitions', 0)
        .not('last_review_at', 'is', null)

    if (learningError) throw new Error(learningError.message)
    console.log("[revision] learning count:", learning?.length ?? 0)

    // Combine: reviews first, then brand new, then learning
    const combined = [...(reviews ?? []), ...(brandNew ?? []), ...(learning ?? [])]
    console.log("[revision] total combined:", combined.length)

    const nowISO = new Date().toISOString()
    return combined.map((row: any) => ({
        ...row.vocab,
        progress_word_id: row.word_id,
        repetitions: row.repetitions,
        interval_days: row.interval_days,
        ease_factor: row.ease_factor,
        last_review_at: row.last_review_at,
        next_review_at: row.next_review_at,
        isDue: row.next_review_at ? row.next_review_at <= nowISO : true,
    }))
}

export async function submitRevisionAnswer(
    wordId: number,
    answer: Answer,
    currentStep: number = 0
) {
    const userId = await getAuthenticatedUserId()
    if (!userId) throw new Error('Not authenticated')

    const { data: progress, error: fetchError } = await serviceClient
        .from('progress')
        .select('repetitions, interval_days, ease_factor, last_review_at, next_review_at')
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .single()

    if (fetchError || !progress) throw new Error('Progress not found')

    const { repetitions, interval_days, ease_factor } = progress

    const { repetitions: newReps, intervalDays: newInterval, easeFactor: newEase } = applySM2(
        repetitions,
        interval_days,
        ease_factor,
        answer
    )

    const { nextReview, graduated } = calculateNextReview(
        currentStep,
        repetitions,
        newInterval,
        answer
    )

    const now = new Date().toISOString()

    const updates: any = {
        repetitions: newReps,
        interval_days: newInterval,
        ease_factor: newEase,
        last_review_at: now,
        next_review_at: nextReview.toISOString(),
        // Only stamp on first ever review
        ...(progress.last_review_at === null && { first_review_at: now }),
    }

    const { error: updateError } = await serviceClient
        .from('progress')
        .update(updates)
        .eq('user_id', userId)
        .eq('word_id', wordId)

    if (updateError) throw new Error(updateError.message)

    revalidatePath('/revision')
    return { success: true, nextReview }
}

export async function getDueCounts(): Promise<{ reviews: number; new: number }> {
    const userId = await getAuthenticatedUserId()
    if (!userId) return { reviews: 0, new: 0 }

    const now = new Date().toISOString()

    const { count: reviewsCount, error: reviewsError } = await serviceClient
        .from('progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .gt('repetitions', 0)
        .lte('next_review_at', now)

    const { count: newCount, error: newError } = await serviceClient
        .from('progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .eq('repetitions', 0)
        .is('last_review_at', null)

    return {
        reviews: reviewsCount ?? 0,
        new: newCount ?? 0,
    }
}