// app/actions/revision.ts
'use server'

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { computeAnswerResult } from '@/app/lib/sm2'

const serviceUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!serviceUrl || !serviceKey) {
    throw new Error('Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_KEY')
}
const serviceClient = createServiceClient(serviceUrl, serviceKey)

/* ── Auth helper with corrected cookie handling ── */
async function getAuthClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options)
                    })
                },
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

/* ── JSONB helpers ── */

function getPos(formsJson: any): string {
    if (!Array.isArray(formsJson) || formsJson.length === 0) return 'unknown'
    return formsJson[0]?.type ?? 'unknown'
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
    theme_id: string
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
    queue?: string
}

const DAILY_NEW_LIMIT = 20

/* ── Build revision cards from RPC rows ───────────────────────────── */

async function buildRevisionCards(
    progressRows: any[]
): Promise<RevisionCard[]> {
    if (progressRows.length === 0) return []

    const vocabIds = progressRows.map(r => r.vocab_id)

    const { data: vocabData, error: vocabErr } = await serviceClient
        .from('vocabulary')
        .select('word_id, word_ar, word_di, word_tr, level, definitions, examples, forms, root, theme')
        .in('word_id', vocabIds)

    if (vocabErr) throw new Error(vocabErr.message)

    const vocabMap = new Map<number, {
        word: string
        word_diacritic: string
        transliteration: string
        definition: string
        def_ar: string | null
        def_tr: string | null
        def_en: string | null
        type: string
        level: string
        root: string | null
        ex_ar: string | null
        ex_di: string | null
        ex_en: string | null
        theme: string
    }>()

    for (const v of vocabData ?? []) {
        const definitions = Array.isArray(v.definitions) ? v.definitions : []
        const primary = definitions[0] ?? null
        const examples = Array.isArray(v.examples) ? v.examples : []
        const exAr = examples.map((e: any) => e.ar).join(';') || null
        const exDi = examples.map((e: any) => e.ar_di).join(';') || null
        const exEn = examples.map((e: any) => e.en).join(';') || null

        vocabMap.set(v.word_id, {
            word: v.word_ar ?? '',
            word_diacritic: v.word_di ?? '',
            transliteration: v.word_tr ?? '',
            definition: primary?.direct_english ?? primary?.english ?? '',
            def_ar: primary?.simple_ar ?? null,
            def_tr: primary?.simple_ar_tr ?? null,
            def_en: primary?.english ?? null,
            type: getPos(v.forms),
            level: v.level ?? '',
            root: v.root ?? null,
            ex_ar: exAr,
            ex_di: exDi,
            ex_en: exEn,
            theme: v.theme ?? '',
        })
    }

    return progressRows.map((row) => {
        const v = vocabMap.get(row.vocab_id)

        return {
            id: row.vocab_id,
            word: v?.word ?? '',
            word_diacritic: v?.word_diacritic ?? '',
            transliteration: v?.transliteration ?? '',
            definition: v?.definition ?? '',
            level: v?.level ?? '',
            type: v?.type ?? 'unknown',
            root: v?.root ?? null,
            ex_ar: v?.ex_ar ?? null,
            ex_di: v?.ex_di ?? null,
            ex_en: v?.ex_en ?? null,
            theme_id: v?.theme ?? '',
            theme_name: v?.theme ?? null,
            def_ar: v?.def_ar ?? null,
            def_tr: v?.def_tr ?? null,
            def_en: v?.def_en ?? null,
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

/* ── Fetch session ─────────────────────────────────────────────────── */

export async function fetchRevisionSession(): Promise<{
    dueCards: RevisionCard[]
    completedCards: RevisionCard[]
}> {
    const userId = await getAuthenticatedUserId()
    if (!userId) return { dueCards: [], completedCards: [] }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    // 1. Get all progress rows in revision for this user
    const { data: progressData, error: progErr } = await serviceClient
        .from('progress')
        .select('vocab_id, repetitions, interval_days, ease_factor, learning_step, lapses, last_review_at, next_review_at, last_rating')
        .eq('user_id', userId)
        .eq('is_in_revision', true)

    if (progErr) throw new Error(progErr.message)
    if (!progressData || progressData.length === 0) {
        return { dueCards: [], completedCards: [] }
    }

    // 2. Classify into due / completed today / new candidates
    const dueProgress: any[] = []
    const completedToday: any[] = []
    const newCandidates: any[] = []

    for (const p of progressData) {
        const reviewedToday = p.last_review_at && new Date(p.last_review_at) >= startOfDay
        if (reviewedToday) {
            completedToday.push(p)
            continue
        }

        const isDue = !p.next_review_at || new Date(p.next_review_at) <= new Date()
        if (!isDue) continue

        const isNew = p.repetitions === 0 && p.interval_days === 0 && !p.last_review_at
        if (isNew) {
            newCandidates.push(p)
        } else {
            dueProgress.push(p)
        }
    }

    // 3. Apply daily new-card limit
    const shuffledNew = newCandidates.sort(() => Math.random() - 0.5)
    const limitedNew = shuffledNew.slice(0, DAILY_NEW_LIMIT)
    const allDue = [...dueProgress, ...limitedNew]

    // 4. Build cards
    const dueCards = await buildRevisionCards(allDue)
    const completedCards = await buildRevisionCards(completedToday)

    return { dueCards, completedCards }
}

/* ── Submit answers batch (deduplicated) ───────────────────────────── */

export async function submitRevisionAnswersBatch(
    answers: { vocabId: number; answer: Answer }[]
): Promise<void> {
    if (!answers.length) return

    const userId = await getAuthenticatedUserId()
    if (!userId) throw new Error('Not authenticated')

    /* ── CRITICAL FIX: deduplicate by vocabId, keep last answer only ── */
    const lastAnswerMap = new Map<number, Answer>()
    for (const a of answers) {
        lastAnswerMap.set(a.vocabId, a.answer)
    }
    const uniqueAnswers = Array.from(lastAnswerMap.entries()).map(
        ([vocabId, answer]) => ({ vocabId, answer })
    )

    const vocabIds = uniqueAnswers.map(a => a.vocabId)

    // 1. Fetch all existing progress rows in ONE query
    const { data: allProgress, error: fetchError } = await serviceClient
        .from('progress')
        .select('vocab_id, repetitions, interval_days, ease_factor, learning_step, lapses, last_review_at, first_review_at')
        .eq('user_id', userId)
        .in('vocab_id', vocabIds)

    if (fetchError) {
        console.error('Batch fetch failed:', fetchError.message)
        throw new Error(fetchError.message)
    }

    const progressMap = new Map((allProgress ?? []).map(p => [p.vocab_id, p]))
    const now = new Date().toISOString()

    // 2. Build upsert rows locally
    const rows = uniqueAnswers.map(({ vocabId, answer }) => {
        const progress = progressMap.get(vocabId)

        if (!progress) {
            // Fallback: card somehow lacks a progress row — create one
            const result = computeAnswerResult({
                repetitions: 0,
                interval_days: 0,
                ease_factor: 2.5,
                learning_step: 0,
                lapses: 0,
            }, answer)

            return {
                user_id: userId,
                vocab_id: vocabId,
                is_in_revision: true,
                is_completed: false,
                repetitions: result.repetitions,
                interval_days: result.interval_days,
                ease_factor: result.ease_factor,
                learning_step: result.learning_step,
                lapses: answer === 'again' ? 1 : 0,
                last_review_at: now,
                last_rating: answer,
                next_review_at: result.nextReview?.toISOString() ?? null,
                first_review_at: now,
                updated_at: now,
                created_at: now,
            }
        }

        const result = computeAnswerResult(progress, answer)
        const nextReview = result.nextReview?.toISOString() ?? null
        const newLapses = answer === 'again' ? (progress.lapses ?? 0) + 1 : (progress.lapses ?? 0)

        return {
            user_id: userId,
            vocab_id: vocabId,
            is_in_revision: true,
            is_completed: false,
            repetitions: result.repetitions,
            interval_days: result.interval_days,
            ease_factor: result.ease_factor,
            learning_step: result.learning_step,
            last_review_at: now,
            last_rating: answer,
            next_review_at: nextReview,
            lapses: newLapses,
            updated_at: now,
            ...(progress.last_review_at === null && { first_review_at: now }),
        }
    })

    // 3. ONE bulk upsert
    const { error } = await serviceClient
        .from('progress')
        .upsert(rows, { onConflict: 'user_id,vocab_id' })

    if (error) {
        console.error('Batch upsert failed:', error.message)
        throw new Error(error.message)
    }

    revalidatePath('/revision')
}

/* ── Toggle revision (preserves SRS state) ─────────────────────────── */

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
        const { error: updErr } = await serviceClient
            .from('progress')
            .update({ is_in_revision: false, updated_at: now })
            .eq('user_id', userId)
            .eq('vocab_id', vocabId)

        if (updErr) throw new Error(updErr.message)
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

/* ── Upsert progress ───────────────────────────────────────────────── */

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

/* ── Custom session metadata ───────────────────────────────────────── */

const LABEL_MAP: Record<string, string> = {
    A0: 'Beginner | A0',
    A1: 'Apprentice | A1',
    A2: 'Competent | A2',
    B1: 'Proficient | B1',
    B2: 'Highly Proficient | B2',
    C1: 'Expert | C1',
    C2: 'Native | C2',
}

const LEVEL_ORDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export type LevelMeta = {
    code: string
    label: string
    themes: {
        theme_id: string
        display_name: string
        total_words: number
    }[]
}

export async function fetchCustomSessionMetadata(): Promise<LevelMeta[]> {
    const { data: vocabData, error: vocabErr } = await serviceClient
        .from('vocabulary')
        .select('level, theme')

    if (vocabErr || !vocabData) {
        console.error('[fetchCustomSessionMetadata] vocab error:', vocabErr?.message)
        return []
    }

    const levelThemesMap = new Map<string, Map<string, number>>()

    for (const v of vocabData) {
        const level = v.level
        const theme = v.theme
        if (!level || !theme) continue
        if (!levelThemesMap.has(level)) {
            levelThemesMap.set(level, new Map())
        }
        const themeMap = levelThemesMap.get(level)!
        themeMap.set(theme, (themeMap.get(theme) ?? 0) + 1)
    }

    const result: LevelMeta[] = []

    for (const level of LEVEL_ORDER) {
        const themeMap = levelThemesMap.get(level)
        if (!themeMap) continue

        const themes: LevelMeta['themes'] = []
        for (const [themeName, count] of themeMap) {
            themes.push({
                theme_id: themeName,
                display_name: themeName,
                total_words: count,
            })
        }

        themes.sort((a, b) => a.display_name.localeCompare(b.display_name))

        result.push({
            code: level,
            label: level,
            themes,
        })
    }

    return result
}

/* ── Custom session cards ───────────────────── */

export async function fetchCustomSessionCards(settings: {
    levelCodes: string[]
    themeIds: string[]
    cardCount: number
}): Promise<RevisionCard[]> {
    const { levelCodes, themeIds, cardCount } = settings

    let builder = serviceClient
        .from('vocabulary')
        .select('word_id, word_ar, word_di, word_tr, theme, level, definitions, examples, forms, root')

    if (levelCodes.length > 0) {
        builder = builder.in('level', levelCodes)
    }

    if (themeIds.length > 0) {
        builder = builder.in('theme', themeIds)
    }

    const { data: vocabData, error } = await builder.limit(Math.max(cardCount * 2, 50))
    if (error) throw new Error(error.message)
    if (!vocabData || vocabData.length === 0) return []

    const shuffled = [...vocabData].sort(() => Math.random() - 0.5).slice(0, cardCount)

    return shuffled.map((v) => {
        const definitions = Array.isArray(v.definitions) ? v.definitions : []
        const primary = definitions[0] ?? null
        const examples = Array.isArray(v.examples) ? v.examples : []

        return {
            id: v.word_id,
            word: v.word_ar ?? '',
            word_diacritic: v.word_di ?? '',
            transliteration: v.word_tr ?? '',
            definition: primary?.direct_english ?? primary?.english ?? '',
            level: v.level ?? '',
            type: getPos(v.forms),
            root: v.root ?? null,
            ex_ar: examples.map((e: any) => e.ar).join(';') || null,
            ex_di: examples.map((e: any) => e.ar_di).join(';') || null,
            ex_en: examples.map((e: any) => e.en).join(';') || null,
            theme_id: v.theme ?? '',
            theme_name: v.theme ?? null,
            def_ar: primary?.simple_ar ?? null,
            def_tr: primary?.simple_ar_tr ?? null,
            def_en: primary?.english ?? null,
            progress_word_id: v.word_id,
            repetitions: 0,
            interval_days: 0,
            ease_factor: 2.5,
            learning_step: 0,
            lapses: 0,
            last_review_at: null,
            next_review_at: null,
            lastRating: null,
        }
    })
}
