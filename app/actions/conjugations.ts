// app/actions/conjugations.ts

"use server"

import { serviceClient } from "@/app/lib/supabase"
import { isAdminUser } from "./vocab"
import {
  buildConjugationsPrompt,
  validateConjugationRows as validateConjugationRowsLib,
  validConjugationTypes,
  type ConjugationsPromptResult as LibConjugationsPromptResult,
  type ValidateConjugationsResult as LibValidateConjugationsResult,
  type VerbCandidate,
  type GeneratedConjugation,
} from "@/app/lib/conjugations"

/* ── Types ─────────────────────────────────────────────────────────── */

export type ConjugationsPromptResult = LibConjugationsPromptResult
export type ValidateConjugationsResult = LibValidateConjugationsResult
export type { VerbCandidate, GeneratedConjugation } from "@/app/lib/conjugations"

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

export async function fetchConjugationCandidatesForSource(source: string): Promise<
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

  const trimmedSource = source.trim()
  if (!trimmedSource) {
    return { ok: false, error: "Source is required" }
  }

  const [
    { data: lemmas, error: lemmasError },
    { data: definitions, error: defsError },
  ] = await Promise.all([
    serviceClient
      .from("vocab_lemmas")
      .select("lemma, lemma_diacritic, arabic_root")
      .eq("source", trimmedSource),
    serviceClient
      .from("vocab_definitions")
      .select("lemma_diacritic, arabic_root, part_of_speech")
      .eq("source", trimmedSource),
  ])

  if (lemmasError) {
    console.error("[fetchConjugationCandidatesForSource] lemmas error:", lemmasError.message)
    return { ok: false, error: lemmasError.message }
  }
  if (defsError) {
    console.error("[fetchConjugationCandidatesForSource] definitions error:", defsError.message)
    return { ok: false, error: defsError.message }
  }

  const verbDefKeys = new Set<string>()
  for (const def of definitions ?? []) {
    if (String(def.part_of_speech).toLowerCase() === "verb") {
      verbDefKeys.add(`${def.lemma_diacritic}|${def.arabic_root ?? ""}`)
    }
  }

  const verbCandidates: VerbCandidate[] = []
  for (const row of lemmas ?? []) {
    const key = `${row.lemma_diacritic}|${row.arabic_root ?? ""}`
    if (verbDefKeys.has(key)) {
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
    console.error("[fetchConjugationCandidatesForSource] existing error:", existingError.message)
    return { ok: false, error: existingError.message }
  }

  const existingKeys = new Set<string>()
  for (const row of existingConjugations ?? []) {
    existingKeys.add(`${row.lemma}|${row.root ?? ""}`)
  }

  const candidates = verbCandidates.filter((c) => {
    return !existingKeys.has(`${c.lemma}|${c.root ?? ""}`)
  })

  return {
    ok: true,
    candidates,
    existingCount: verbCandidates.length - candidates.length,
  }
}

export async function buildConjugationsPromptData(
  candidates: VerbCandidate[],
  source?: string
): Promise<ConjugationsPromptResult> {
  await guardAdmin()
  return buildConjugationsPrompt(candidates, source)
}

export async function validateConjugationRows(parsed: unknown): Promise<ValidateConjugationsResult> {
  await guardAdmin()
  return validateConjugationRowsLib(parsed)
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
    if (!validConjugationTypes.has(row.type)) {
      return { ok: false, error: `Invalid conjugation type: ${row.type}` }
    }
    if (!row.conjugation_ar.trim()) {
      return { ok: false, error: `Missing conjugation_ar for ${row.lemma}` }
    }
    if (!row.conjugation_diacritic.trim()) {
      return { ok: false, error: `Missing conjugation_diacritic for ${row.lemma}` }
    }

    insertRows.push({
      lemma: row.lemma,
      root: row.root,
      form_number: row.form_number,
      type: row.type,
      conjugation_ar: row.conjugation_ar,
      conjugation_diacritic: row.conjugation_diacritic,
      transliteration: row.transliteration,
      english_translation: row.english_translation,
      source: row.source ?? null,
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
