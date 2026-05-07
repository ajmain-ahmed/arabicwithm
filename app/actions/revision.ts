// app/actions/revision.ts

'use server'

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const serviceUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!serviceUrl || !serviceKey) {
    throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY')
}
const serviceClient = createServiceClient(serviceUrl, serviceKey)

async function getAuthClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() {},
            },
        }
    )
}

async function getAuthenticatedUserId(): Promise<string | null> {
    try {
        const supabase = await getAuthClient()
        const { data, error } = await supabase.auth.getUser()
        if (error) { console.error("[revision] getUser error:", error.message); return null }
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
    def_ar?: string | null
    def_tr?: string | null
    def_en?: string | null
    lastRating?: Answer | null
    theme_name?: string | null
}

export type Answer = 'again' | 'hard' | 'good' | 'easy'

export type SessionLog = {
    cardId: number | string
    word: string
    rating: Answer
    timeTaken: number
    level?: string
    theme?: string
}

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

/* ─────────────────────────────────────────────
   Build RevisionCard[] from raw rows
   (vocab/levels/themes come from RPC; only
    definitions & examples need extra lookups)
───────────────────────────────────────────── */
async function buildRevisionCards(
    progressRows: any[],
    nowISO: string
): Promise<RevisionCard[]> {
    if (progressRows.length === 0) return []

    const vocabIds = progressRows.map(r => r.vocab_id)

    // 1. Definitions
    const { data: defsData, error: defsErr } = await serviceClient
        .from('definitions')
        .select('vocab_id, meaning, pos, def_ar, def_tr, def_en')
        .in('vocab_id', vocabIds)
    if (defsErr) throw new Error(defsErr.message)

    // 2. Examples
    const { data: exData, error: exErr } = await serviceClient
        .from('examples')
        .select('vocab_id, ex_ar, ex_di, ex_en')
        .in('vocab_id', vocabIds)
    if (exErr) throw new Error(exErr.message)

    // Build lookup maps
    const defMap = new Map<number, { meaning: string; pos: string; def_ar: string | null; def_tr: string | null; def_en: string | null }[]>()
    ;(defsData ?? []).forEach((d: any) => {
        const list = defMap.get(d.vocab_id) || []
        list.push({ meaning: d.meaning, pos: d.pos, def_ar: d.def_ar, def_tr: d.def_tr, def_en: d.def_en })
        defMap.set(d.vocab_id, list)
    })

    const exMap = new Map<number, { ex_ar: string; ex_di: string; ex_en: string }[]>()
    ;(exData ?? []).forEach((e: any) => {
        const list = exMap.get(e.vocab_id) || []
        list.push({ ex_ar: e.ex_ar ?? '', ex_di: e.ex_di ?? '', ex_en: e.ex_en ?? '' })
        exMap.set(e.vocab_id, list)
    })

    return progressRows.map((row) => {
        const defs = defMap.get(row.vocab_id) ?? []
        const primaryDef = defs[0] ?? { meaning: '', pos: 'unknown', def_ar: null, def_tr: null, def_en: null }
        const examples = exMap.get(row.vocab_id) ?? []

        const isDue = row.next_review_at
            ? row.next_review_at <= nowISO
            : (row.repetitions === 0 && !row.last_review_at)

        return {
            id: row.vocab_id,
            word: row.word_ar ?? '',
            word_diacritic: row.word_di ?? '',
            transliteration: row.word_tr ?? '',
            definition: primaryDef.meaning,
            level: row.level_code ?? '',
            type: primaryDef.pos,
            root: row.root ?? null,
            ex_ar: examples.map(e => e.ex_ar).join(';') || null,
            ex_di: examples.map(e => e.ex_di).join(';') || null,
            ex_en: examples.map(e => e.ex_en).join(';') || null,
            theme_id: row.theme_id ?? 0,
            theme_name: row.theme_name ?? null,
            def_ar: primaryDef.def_ar ?? null,
            def_tr: primaryDef.def_tr ?? null,
            def_en: primaryDef.def_en ?? null,
            progress_word_id: row.vocab_id,
            repetitions: row.repetitions,
            interval_days: row.interval_days,
            ease_factor: row.ease_factor,
            last_review_at: row.last_review_at,
            next_review_at: row.next_review_at,
            isDue,
            lastRating: row.last_rating ?? null,
        }
    })
}

/* ─────────────────────────────────────────────
   Fetch today's FULL session (due + completed)
   Single RPC replaces 5 progress queries + 3
   related-data lookups.
───────────────────────────────────────────── */
export async function fetchRevisionSession(): Promise<{
    dueCards: RevisionCard[]
    completedCards: RevisionCard[]
}> {
    const userId = await getAuthenticatedUserId()
    if (!userId) return { dueCards: [], completedCards: [] }

    const now = new Date().toISOString()

    const { data: rpcData, error } = await serviceClient.rpc('get_revision_session', {
        p_user_id: userId,
    })

    if (error) throw new Error(error.message)
    if (!rpcData) return { dueCards: [], completedCards: [] }

    const dueProgress = rpcData.due_cards ?? []
    const completedProgress = rpcData.completed_today ?? []

    const dueCards = await buildRevisionCards(dueProgress, now)
    const completedCards = await buildRevisionCards(completedProgress, now)

    return { dueCards, completedCards }
}

/* ─────────────────────────────────────────────
   Submit answer
───────────────────────────────────────────── */
export async function submitRevisionAnswer(
    vocabId: number,
    answer: Answer,
    currentStep: number = 0
) {
    if (!Number.isFinite(vocabId) || vocabId <= 0) {
        throw new Error('Invalid vocabId')
    }
    if (!['again', 'hard', 'good', 'easy'].includes(answer)) {
        throw new Error('Invalid answer')
    }
    if (!Number.isFinite(currentStep) || currentStep < 0 || currentStep > 100) {
        throw new Error('Invalid currentStep')
    }
    const userId = await getAuthenticatedUserId()
    if (!userId) throw new Error('Not authenticated')

    const { data: progress, error: fetchError } = await serviceClient
        .from('progress')
        .select('repetitions, interval_days, ease_factor, last_review_at, next_review_at')
        .eq('user_id', userId)
        .eq('vocab_id', vocabId)
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
        last_rating: answer,
        ...(progress.last_review_at === null && { first_review_at: now }),
    }

    const { error: updateError } = await serviceClient
        .from('progress')
        .update(updates)
        .eq('user_id', userId)
        .eq('vocab_id', vocabId)

    if (updateError) throw new Error(updateError.message)

    revalidatePath('/revision')
    return { success: true, nextReview }
}

export async function toggleRevision(vocabId: number): Promise<{ success: boolean; inRevision: boolean }> {
    if (!Number.isFinite(vocabId) || vocabId <= 0) {
        throw new Error('Invalid vocabId')
    }

    const userId = await getAuthenticatedUserId()
    if (!userId) throw new Error('Not authenticated')

    const { data: existing, error: fetchErr } = await serviceClient
        .from('progress')
        .select('is_in_revision')
        .eq('user_id', userId)
        .eq('vocab_id', vocabId)
        .maybeSingle()

    if (fetchErr) throw new Error(fetchErr.message)

    if (existing?.is_in_revision) {
        const { error: delErr } = await serviceClient
            .from('progress')
            .delete()
            .eq('user_id', userId)
            .eq('vocab_id', vocabId)

        if (delErr) throw new Error(delErr.message)
        return { success: true, inRevision: false }
    }

    const now = new Date().toISOString()

    if (existing) {
        const { error: updErr } = await serviceClient
            .from('progress')
            .update({
                is_in_revision: true,
                repetitions: 0,
                interval_days: 0,
                ease_factor: 2.5,
                last_review_at: null,
                next_review_at: null,
                first_review_at: null,
                last_rating: null,
                created_at: now,
            })
            .eq('user_id', userId)
            .eq('vocab_id', vocabId)

        if (updErr) throw new Error(updErr.message)
        return { success: true, inRevision: true }
    }

    const { error: insErr } = await serviceClient
        .from('progress')
        .insert({
            user_id: userId,
            vocab_id: vocabId,
            is_in_revision: true,
            repetitions: 0,
            interval_days: 0,
            ease_factor: 2.5,
            last_review_at: null,
            next_review_at: null,
            first_review_at: null,
            last_rating: null,
            created_at: now,
        })

    if (insErr) throw new Error(insErr.message)
    return { success: true, inRevision: true }
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
        .gt('interval_days', 0)
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