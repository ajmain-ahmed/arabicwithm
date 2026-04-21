// app/actions/vocab.ts

"use server"

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// ─── Service Role Client (bypasses RLS) ─────────────────────────────────────
const serviceUrl = process.env.SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_KEY!

const serviceClient = createServiceClient(serviceUrl, serviceKey)

// ─── Auth client (reads the session cookie to identify the user) ─────────────
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
        setAll() {
          // Server action — cookies are already set by the browser
        },
      },
    }
  )
}

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await getAuthClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.error("[auth] getUser error:", error.message)
      return null
    }
    return data.user?.id ?? null
  } catch (e) {
    console.error("[auth] unexpected error:", e)
    return null
  }
}

// ─── types ────────────────────────────────────────────────────────────────────

export type Theme = {
  id: number
  level: string
  display_name: string
  slug: string
}

export type Example = {
  ar: string;   // Arabic sentence
  di: string;   // Diacritic version
  en: string;   // English translation
}

export type ThemeProgress = {
  theme_id: number
  display_name: string
  total_words: number
  completed_count: number
  revision_count: number
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
  ex: Example[] | null   // JSONB column, parsed to array of objects
  theme_id: number
}

export type WordProgress = {
  word_id: number
  is_completed: boolean
  is_in_revision: boolean
}

// ─── fetchThemesWithProgress ──────────────────────────────────────────────────

export async function fetchThemesWithProgress(level: string): Promise<ThemeProgress[]> {
  const userId = await getAuthenticatedUserId()

  if (userId) {
    const { data, error } = await serviceClient.rpc("get_theme_progress", {
      p_user_id: userId,
      p_level: level,
    })

    if (error) throw new Error(error.message)

    return (data ?? []).map((row: any) => ({
      theme_id: Number(row.id),          // RPC returns 'id', map to 'theme_id'
      display_name: row.display_name,
      total_words: Number(row.total_words ?? 0),
      completed_count: Number(row.completed_count ?? 0),
      revision_count: Number(row.revision_count ?? 0),
    }))
  }

  // Fallback for unauthenticated users
  const { data: themes, error } = await serviceClient
    .from("themes")
    .select("id, display_name")
    .eq("level", level)
    .order("id")

  if (error) throw new Error(error.message)

  const counts = await Promise.all(
    (themes ?? []).map(async (t: any) => {
      const { count } = await serviceClient
        .from("vocab")
        .select("id", { count: "exact", head: true })
        .eq("theme_id", t.id)

      return {
        theme_id: Number(t.id),
        display_name: t.display_name,
        total_words: count ?? 0,
        completed_count: 0,
        revision_count: 0,
      }
    })
  )

  return counts
}

// ─── fetchThemeVocabWithProgress ──────────────────────────────────────────────

export async function fetchThemeVocabWithProgress(themeId: number): Promise<{
  vocab: VocabRow[]
  progress: WordProgress[]
}> {
  const userId = await getAuthenticatedUserId()

  const { data: vocab, error: vocabError } = await serviceClient
    .from("vocab")
    .select("*")
    .eq("theme_id", themeId)
    .order("id")

  if (vocabError) throw new Error(vocabError.message)

  if (!userId) {
    return { vocab: vocab ?? [], progress: [] }
  }

  const wordIds = (vocab ?? []).map((v) => v.id)
  if (wordIds.length === 0) return { vocab: [], progress: [] }

  // Progress now only has user_id and word_id (theme_id removed)
  const { data: progressData, error: progressError } = await serviceClient
    .from("progress")
    .select("word_id, is_completed, is_in_revision")
    .eq("user_id", userId)
    .in("word_id", wordIds)

  if (progressError) throw new Error(progressError.message)

  return {
    vocab: vocab ?? [],
    progress: (progressData ?? []) as WordProgress[],
  }
}

// ─── upsertWordProgress ───────────────────────────────────────────────────────

export async function upsertWordProgress({
  wordId,
  isCompleted,
  isInRevision,
}: {
  wordId: number
  isCompleted: boolean
  isInRevision: boolean
}): Promise<void> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return

  const { error } = await serviceClient.from("progress").upsert(
    {
      user_id: userId,
      word_id: wordId,
      is_completed: isCompleted,
      is_in_revision: isInRevision,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,word_id" }   // adjust if composite PK exists
  )

  if (error) throw new Error(error.message)
}