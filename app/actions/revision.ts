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
    queue?: string
}

const DAILY_NEW_LIMIT = 20

/* ── Build revision cards from RPC rows ───────────────────────────── */

async function buildRevisionCards(
    progressRows: any[],
    nowISO: string
): Promise<RevisionCard[]> {
    if (progressRows.length === 0) return []

    const vocabIds = progressRows.map(r => r.vocab_id)

    const [{ data: defsData, error: defsErr }, { data: exData, error: exErr }] = await Promise.all([
        serviceClient.from('definitions').select('vocab_id, meaning, pos, def_ar, def_tr, def_en').in('vocab_id', vocabIds),
        serviceClient.from('examples').select('vocab_id, ex_ar, ex_di, ex_en').in('vocab_id', vocabIds),
    ])

    if (defsErr) throw new Error(defsErr.message)
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

/* ── Fetch session ─────────────────────────────────────────────────── */

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
        theme_id: number
        display_name: string
        total_words: number
    }[]
}

export async function fetchCustomSessionMetadata(): Promise<LevelMeta[]> {
    const { data: levels, error: levelsErr } = await serviceClient
        .from('levels')
        .select('id, code')
        .order('id')

    if (levelsErr || !levels) {
        console.error('[fetchCustomSessionMetadata] levels error:', levelsErr?.message)
        return []
    }

    const levelIds = levels.map(l => l.id)

    const { data: themes, error: themesErr } = await serviceClient
        .from('themes')
        .select('id, display_name')
        .order('id')

    if (themesErr || !themes) {
        console.error('[fetchCustomSessionMetadata] themes error:', themesErr?.message)
        return []
    }

    const { data: vocabData, error: vocabErr } = await serviceClient
        .from('vocab')
        .select('level_id, theme_id')
        .in('level_id', levelIds)

    if (vocabErr) {
        console.error('[fetchCustomSessionMetadata] vocab error:', vocabErr.message)
    }

    const result: LevelMeta[] = []

    for (const level of levels) {
        const themeCountMap = new Map<number, number>()
        for (const v of vocabData ?? []) {
            if (v.level_id === level.id) {
                themeCountMap.set(v.theme_id, (themeCountMap.get(v.theme_id) ?? 0) + 1)
            }
        }

        const levelThemes: LevelMeta['themes'] = []
        for (const theme of themes) {
            const count = themeCountMap.get(theme.id)
            if (count && count > 0) {
                levelThemes.push({
                    theme_id: theme.id,
                    display_name: theme.display_name,
                    total_words: count,
                })
            }
        }

        result.push({
            code: level.code,
            label: level.code,
            themes: levelThemes,
        })
    }

    result.sort((a, b) => {
        const idxA = LEVEL_ORDER.indexOf(a.code)
        const idxB = LEVEL_ORDER.indexOf(b.code)
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
    })

    return result
}

/* ── Custom session cards ───────────────────── */

export async function fetchCustomSessionCards(settings: {
    levelCodes: string[]
    themeIds: number[]
    cardCount: number
}): Promise<RevisionCard[]> {
    const { levelCodes, themeIds, cardCount } = settings

    let builder = serviceClient
        .from('vocab')
        .select('word_id, word_ar, word_di, word_tr, theme_id, level_id')

    if (levelCodes.length > 0) {
        const { data: levelData } = await serviceClient
            .from('levels')
            .select('id')
            .in('code', levelCodes)
        const ids = levelData?.map(l => l.id) ?? []
        if (ids.length > 0) {
            builder = builder.in('level_id', ids)
        }
    }

    if (themeIds.length > 0) {
        builder = builder.in('theme_id', themeIds)
    }

    const { data: vocabData, error } = await builder.limit(Math.max(cardCount * 2, 50))
    if (error) throw new Error(error.message)
    if (!vocabData || vocabData.length === 0) return []

    const shuffled = [...vocabData].sort(() => Math.random() - 0.5).slice(0, cardCount)
    const vocabIds = shuffled.map(v => v.word_id)

    const levelIds = [...new Set(shuffled.map(v => v.level_id))]
    const themeIdsSet = [...new Set(shuffled.map(v => v.theme_id))]

    const [{ data: levelsData }, { data: themesData }] = await Promise.all([
        serviceClient.from('levels').select('id, code').in('id', levelIds),
        serviceClient.from('themes').select('id, display_name').in('id', themeIdsSet),
    ])

    const levelCodeMap = new Map((levelsData ?? []).map(l => [l.id, l.code]))
    const themeNameMap = new Map((themesData ?? []).map(t => [t.id, t.display_name]))

    const [{ data: defsData, error: defsErr }, { data: exData, error: exErr }] = await Promise.all([
        serviceClient.from('definitions').select('vocab_id, meaning, pos, def_ar, def_tr, def_en').in('vocab_id', vocabIds),
        serviceClient.from('examples').select('vocab_id, ex_ar, ex_di, ex_en').in('vocab_id', vocabIds),
    ])

    if (defsErr) throw new Error(defsErr.message)
    if (exErr) throw new Error(exErr.message)

    const defMap = new Map<number, { meaning: string; pos: string; def_ar: string | null; def_tr: string | null; def_en: string | null }[]>()
    for (const d of defsData ?? []) {
        const list = defMap.get(d.vocab_id) ?? []
        list.push({ meaning: d.meaning, pos: d.pos, def_ar: d.def_ar, def_tr: d.def_tr, def_en: d.def_en })
        defMap.set(d.vocab_id, list)
    }

    const exMap = new Map<number, { ex_ar: string; ex_di: string; ex_en: string }[]>()
    for (const e of exData ?? []) {
        const list = exMap.get(e.vocab_id) ?? []
        list.push({ ex_ar: e.ex_ar ?? '', ex_di: e.ex_di ?? '', ex_en: e.ex_en ?? '' })
        exMap.set(e.vocab_id, list)
    }

    return shuffled.map((v) => {
        const defs = defMap.get(v.word_id) ?? []
        const primaryDef = defs[0] ?? { meaning: '', pos: 'unknown', def_ar: null, def_tr: null, def_en: null }
        const examples = exMap.get(v.word_id) ?? []

        return {
            id: v.word_id,
            word: v.word_ar ?? '',
            word_diacritic: v.word_di ?? '',
            transliteration: v.word_tr ?? '',
            definition: primaryDef.meaning,
            level: levelCodeMap.get(v.level_id) ?? '',
            type: primaryDef.pos,
            root: null,
            ex_ar: examples.map(e => e.ex_ar).join(';') || null,
            ex_di: examples.map(e => e.ex_di).join(';') || null,
            ex_en: examples.map(e => e.ex_en).join(';') || null,
            theme_id: v.theme_id ?? 0,
            theme_name: themeNameMap.get(v.theme_id) ?? null,
            def_ar: primaryDef.def_ar ?? null,
            def_tr: primaryDef.def_tr ?? null,
            def_en: primaryDef.def_en ?? null,
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