// app/actions/conjugations.ts

"use server"

import { serviceClient } from "@/app/lib/supabase"
import { isAdminUser } from "./vocab"

/* ── Types ─────────────────────────────────────────────────────────── */

export type VerbCandidate = {
  lemma: string
  lemma_diacritic: string
  root: string | null
}

export type GeneratedConjugation = {
  lemma: string
  root: string | null
  tense: string
  pronoun: string
  pronoun_label: string
  conjugation_diacritic: string
  transliteration: string | null
}

export type GenerateConjugationsResult =
  | {
      ok: true
      rows: GeneratedConjugation[]
      skipped: { lemma: string; reason: string }[]
    }
  | {
      ok: false
      error: string
    }

export type CommitConjugationsResult =
  | {
      ok: true
      inserted: number
    }
  | {
      ok: false
      error: string
    }

/* ── Helpers ───────────────────────────────────────────────────────── */

async function guardAdmin() {
  const ok = await isAdminUser()
  if (!ok) throw new Error("Forbidden")
}

const validTenses = new Set(["past", "present", "imperative"])
const validPronouns = new Set([
  "1sg",
  "1pl",
  "2ms",
  "2fs",
  "2dl",
  "2mp",
  "2fp",
  "3ms",
  "3fs",
  "3mdl",
  "3fdl",
  "3mp",
  "3fp",
])

const AWM_PYTHON_URL =
  process.env.AWM_PYTHON_URL ?? "https://awm-python.onrender.com/conjugate-verbs"

const GENERATION_TIMEOUT_MS = 90_000

/* ── Server Actions ────────────────────────────────────────────────── */

export async function fetchVerbConjugationCandidates(): Promise<
  | {
      ok: true
      candidates: VerbCandidate[]
      existingCount: number
    }
  | {
      ok: false
      error: string
    }
> {
  await guardAdmin()

  const [
    { data: lemmas, error: lemmasError },
    { data: definitions, error: defsError },
  ] = await Promise.all([
    serviceClient.from("vocab_lemmas").select("lemma, lemma_diacritic, arabic_root"),
    serviceClient
      .from("vocab_definitions")
      .select("lemma_diacritic, arabic_root, part_of_speech"),
  ])

  if (lemmasError) {
    console.error("[fetchVerbConjugationCandidates] lemmas error:", lemmasError.message)
    return { ok: false, error: lemmasError.message }
  }
  if (defsError) {
    console.error("[fetchVerbConjugationCandidates] definitions error:", defsError.message)
    return { ok: false, error: defsError.message }
  }

  const verbDefs = new Map<string, boolean>()
  for (const def of definitions ?? []) {
    const key = `${def.lemma_diacritic}|${def.arabic_root ?? ""}`
    if (String(def.part_of_speech).toLowerCase() === "verb") {
      verbDefs.set(key, true)
    }
  }

  const verbCandidates: VerbCandidate[] = []
  for (const row of lemmas ?? []) {
    const key = `${row.lemma_diacritic}|${row.arabic_root ?? ""}`
    if (verbDefs.has(key)) {
      verbCandidates.push({
        lemma: row.lemma,
        lemma_diacritic: row.lemma_diacritic,
        root: row.arabic_root,
      })
    }
  }

  const { data: existingConjugations, error: existingError } = await serviceClient
    .from("verb_conjugations")
    .select("lemma, root")

  if (existingError) {
    console.error("[fetchVerbConjugationCandidates] existing error:", existingError.message)
    return { ok: false, error: existingError.message }
  }

  const existingKeys = new Set<string>()
  for (const row of existingConjugations ?? []) {
    const key = `${row.lemma}|${row.root ?? ""}`
    existingKeys.add(key)
  }

  const candidates = verbCandidates.filter((c) => {
    const key = `${c.lemma}|${c.root ?? ""}`
    return !existingKeys.has(key)
  })

  return {
    ok: true,
    candidates,
    existingCount: verbCandidates.length - candidates.length,
  }
}

export async function generateConjugations(
  candidates: VerbCandidate[]
): Promise<GenerateConjugationsResult> {
  await guardAdmin()

  if (candidates.length === 0) {
    return { ok: true, rows: [], skipped: [] }
  }

  const requestRows = candidates.map((c) => ({
    lemma: c.lemma,
    arabic_root: c.root,
    pos: "verb",
  }))

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS)

  try {
    const response = await fetch(AWM_PYTHON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: requestRows }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error(
        `[generateConjugations] API error ${response.status}:`,
        text.slice(0, 500)
      )
      return {
        ok: false,
        error: `Conjugation service returned ${response.status}. ${text.slice(0, 200)}`,
      }
    }

    const data = (await response.json()) as {
      rows?: GeneratedConjugation[]
      skipped?: { lemma: string; reason: string }[]
      summary?: Record<string, unknown>
    }

    const rows = (data.rows ?? []).map((row) => ({
      lemma: row.lemma,
      root: row.root,
      tense: row.tense,
      pronoun: row.pronoun,
      pronoun_label: row.pronoun_label,
      conjugation_diacritic: row.conjugation_diacritic,
      transliteration: row.transliteration,
    }))

    const skipped = data.skipped ?? []

    console.log(
      `[generateConjugations] generated ${rows.length} rows, skipped ${skipped.length} verbs`
    )

    return { ok: true, rows, skipped }
  } catch (e: unknown) {
    clearTimeout(timeoutId)
    const message = e instanceof Error ? e.message : "Failed to generate conjugations"
    if (message.includes("abort")) {
      return {
        ok: false,
        error: "Conjugation service timed out. The API may be warming up — please try again.",
      }
    }
    console.error("[generateConjugations] error:", message)
    return { ok: false, error: message }
  }
}

export async function commitConjugations(
  rows: GeneratedConjugation[]
): Promise<CommitConjugationsResult> {
  await guardAdmin()

  if (rows.length === 0) {
    return { ok: false, error: "No rows to insert." }
  }

  const insertRows = []
  for (const row of rows) {
    if (!validTenses.has(row.tense)) {
      return { ok: false, error: `Invalid tense: ${row.tense}` }
    }
    if (!validPronouns.has(row.pronoun)) {
      return { ok: false, error: `Invalid pronoun: ${row.pronoun}` }
    }
    if (!row.conjugation_diacritic.trim()) {
      return { ok: false, error: `Missing conjugation_diacritic for ${row.lemma}` }
    }

    insertRows.push({
      lemma: row.lemma,
      root: row.root,
      tense: row.tense,
      pronoun: row.pronoun,
      pronoun_label: row.pronoun_label,
      conjugation_diacritic: row.conjugation_diacritic,
      transliteration: row.transliteration,
      is_active: true,
    })
  }

  const { error, count } = await serviceClient
    .from("verb_conjugations")
    .insert(insertRows)
    .select()

  if (error) {
    console.error("[commitConjugations] error:", error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true, inserted: count ?? insertRows.length }
}
