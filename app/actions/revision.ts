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
    def_ar?: string | null
    def_tr?: string | null
    def_en?: string | null
    lastRating?: Answer | null
    theme_name?: string | null
    learning_step?: number
    lapses?: number
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
        newEase = Math.max(1.3, easeFactor - 0.20)
    } else {
        if (answer === 'hard') {
            newEase = Math.max(1.3, easeFactor - 0.15)
        } else if (answer === 'easy') {
            newEase = easeFactor + 0.15
        }

        if (intervalDays === 0) {
            if (answer === 'hard' || answer === 'good') newInterval = 1
            else if (answer === 'easy') newInterval = Math.max(2, Math.round(1 * newEase))
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
    oldIntervalDays: number,
    newIntervalDays: number,
    answer: Answer
): { nextReview: Date; newStep: number; graduated: boolean } {
    const now = new Date()

    if (answer === 'again') {
        return {
            nextReview: new Date(now.getTime() + LEARNING_STEPS[0] * 60 * 1000),
            newStep: 0,
            graduated: false,
        }
    }

    if (oldIntervalDays === 0) {
        if (answer === 'easy') {
            const next = new Date(now)
            next.setDate(now.getDate() + newIntervalDays)
            return { nextReview: next, newStep: 0, graduated: true }
        }

        const nextStep = currentStep + 1
        if (nextStep < LEARNING_STEPS.length) {
            return {
                nextReview: new Date(now.getTime() + LEARNING_STEPS[nextStep] * 60 * 1000),
                newStep: nextStep,
                graduated: false,
            }
        }

        const next = new Date(now)
        next.setDate(now.getDate() + newIntervalDays)
        return { nextReview: next, newStep: 0, graduated: true }
    }

    const next = new Date(now)
    next.setDate(now.getDate() + newIntervalDays)
    return { nextReview: next, newStep: 0, graduated: true }
}

async function buildRevisionCards(
    progressRows: any[],
    nowISO: string
): Promise<RevisionCard[]> {
    if (progressRows.length === 0) return []

    const vocabIds = progressRows.map(r => r.vocab_id)

    const { data: defsData, error: defsErr } = await serviceClient
        .from('definitions')
        .select('vocab_id, meaning, pos, def_ar, def_tr, def_en')
        .in('vocab_id', vocabIds)
    if (defsErr) throw new Error(defsErr.message)

    const { data: exData, error: exErr } = await serviceClient
        .from('examples')
        .select('vocab_id, ex_ar, ex_di, ex_en')
        .in('vocab_id', vocabIds)
    if (exErr) throw new Error(exErr.message)

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
            learning_step: row.learning_step ?? 0,
            lapses: row.lapses ?? 0,
            last_review_at: row.last_review_at,
            next_review_at: row.next_review_at,
            lastRating: row.last_rating ?? null,
        }
    })
}

export async function fetchRevisionSession(): Promise<{
    dueCards: RevisionCard[]
    completedCards: RevisionCard[]
}> {
    const userId = await getAuthenticatedUserId()
    if (!userId) return { dueCards: [], completedCards: [] }

    const now = new Date().toISOString()

    const { data: rpcData, error } = await serviceClient.rpc('get_revision_session', {
        p_user_id: userId,
        p_daily_new_limit: DAILY_NEW_LIMIT,
    })

    if (error) throw new Error(error.message)
    if (!rpcData) return { dueCards: [], completedCards: [] }

    const dueCards = await buildRevisionCards(rpcData.due_cards ?? [], now)
    const completedCards = await buildRevisionCards(rpcData.completed_today ?? [], now)

    return { dueCards, completedCards }
}

export async function submitRevisionAnswer(
    vocabId: number,
    answer: Answer,
    currentStep: number = 0
) {
    if (!Number.isFinite(vocabId) || vocabId <= 0) throw new Error('Invalid vocabId')
    if (!['again', 'hard', 'good', 'easy'].includes(answer)) throw new Error('Invalid answer')
    if (!Number.isFinite(currentStep) || currentStep < 0 || currentStep > 100) throw new Error('Invalid currentStep')

    const userId = await getAuthenticatedUserId()
    if (!userId) throw new Error('Not authenticated')

    const { data: progress, error: fetchError } = await serviceClient
        .from('progress')
        .select('repetitions, interval_days, ease_factor, last_review_at, next_review_at, learning_step, lapses')
        .eq('user_id', userId)
        .eq('vocab_id', vocabId)
        .single()

    if (fetchError || !progress) throw new Error('Progress not found')

    const { repetitions, interval_days, ease_factor, lapses } = progress

    const { repetitions: newReps, intervalDays: newInterval, easeFactor: newEase } = applySM2(
        repetitions,
        interval_days,
        ease_factor,
        answer
    )

    const { nextReview, newStep } = calculateNextReview(
        currentStep,
        interval_days,
        newInterval,
        answer
    )

    const now = new Date().toISOString()

    const updates: any = {
        repetitions: newReps,
        interval_days: newInterval,
        ease_factor: newEase,
        learning_step: newStep,
        last_review_at: now,
        next_review_at: nextReview.toISOString(),
        last_rating: answer,
        updated_at: now,
        ...(answer === 'again' && { lapses: (lapses ?? 0) + 1 }),
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
    if (!Number.isFinite(vocabId) || vocabId <= 0) throw new Error('Invalid vocabId')

    const userId = await getAuthenticatedUserId()
    if (!userId) throw new Error('Not authenticated')

    const { data: existing, error: fetchErr } = await serviceClient
        .from('progress')
        .select('is_in_revision, is_completed')
        .eq('user_id', userId)
        .eq('vocab_id', vocabId)
        .maybeSingle()

    if (fetchErr) throw new Error(fetchErr.message)

    const now = new Date().toISOString()

    if (existing?.is_in_revision) {
        const { error: delErr } = await serviceClient
            .from('progress')
            .delete()
            .eq('user_id', userId)
            .eq('vocab_id', vocabId)

        if (delErr) throw new Error(delErr.message)
        return { success: true, inRevision: false }
    }

    if (existing) {
        const { error: updErr } = await serviceClient
            .from('progress')
            .update({ is_in_revision: true, is_completed: false, updated_at: now })
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
            is_completed: false,
            repetitions: 0,
            interval_days: 0,
            ease_factor: 2.5,
            learning_step: 0,
            last_review_at: null,
            next_review_at: null,
            first_review_at: null,
            last_rating: null,
            lapses: 0,
            created_at: now,
        })

    if (insErr) throw new Error(insErr.message)
    return { success: true, inRevision: true }
}

export async function getDueCounts(): Promise<{ reviews: number; new: number }> {
    const userId = await getAuthenticatedUserId()
    if (!userId) return { reviews: 0, new: 0 }

    const now = new Date().toISOString()
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)

    const { count: introducedToday } = await serviceClient
        .from('progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .gte('first_review_at', startOfDay.toISOString())

    const remainingNew = Math.max(0, DAILY_NEW_LIMIT - (introducedToday ?? 0))

    const { count: dueCount } = await serviceClient
        .from('progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .not('last_review_at', 'is', null)
        .lte('next_review_at', now)

    const { count: rawNewCount } = await serviceClient
        .from('progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_in_revision', true)
        .eq('repetitions', 0)
        .is('last_review_at', null)

    return {
        reviews: dueCount ?? 0,
        new: Math.min(remainingNew, rawNewCount ?? 0),
    }
}

export async function upsertWordProgress(
    vocabId: number,
    updates: { isCompleted?: boolean; isInRevision?: boolean }
) {
    const userId = await getAuthenticatedUserId()
    if (!userId) throw new Error('Not authenticated')

    const { data: existing } = await serviceClient
        .from('progress')
        .select('id')
        .eq('user_id', userId)
        .eq('vocab_id', vocabId)
        .maybeSingle()

    if (existing) {
        const patch: any = { updated_at: new Date().toISOString() }
        if (updates.isCompleted !== undefined) patch.is_completed = updates.isCompleted
        if (updates.isInRevision !== undefined) patch.is_in_revision = updates.isInRevision

        const { error } = await serviceClient
            .from('progress')
            .update(patch)
            .eq('user_id', userId)
            .eq('vocab_id', vocabId)
        if (error) throw new Error(error.message)
        return
    }

    const { error } = await serviceClient.from('progress').insert({
        user_id: userId,
        vocab_id: vocabId,
        is_completed: updates.isCompleted ?? false,
        is_in_revision: updates.isInRevision ?? false,
        repetitions: 0,
        interval_days: 0,
        ease_factor: 2.5,
        learning_step: 0,
        lapses: 0,
        created_at: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
}