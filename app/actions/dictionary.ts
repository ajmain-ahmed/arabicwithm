// app/actions/dictionary.ts

"use server"

import { z } from "zod"
import { serviceClient } from "@/app/lib/supabase"
import { isAdminUser } from "./vocab"

/* ── Row shapes ──────────────────────────────────────────────────────── */

export type VocabLemmaRow = {
  word_id: number
  lemma: string
  lemma_diacritic: string
  transliteration: string | null
  arabic_root: string | null
  entry_type: string | null
  source: string | null
  CEFR: string | null
  is_active: boolean
}

export type VocabDefinitionRow = {
  definition_id: number
  lemma_diacritic: string
  arabic_root: string | null
  gloss: string | null
  part_of_speech: string | null
  definition_en: string | null
  definition_ar: string | null
  source: string | null
  is_active: boolean
}

export type VerbConjugationRow = {
  conjugation_id: number
  lemma: string
  root: string | null
  tense: string
  pronoun: string
  pronoun_label: string | null
  conjugation_diacritic: string
  transliteration: string | null
  is_active: boolean
}

export type DictionaryDetailsResult = {
  lemma: string
  root: string | null
  lemmas: VocabLemmaRow[]
  definitions: VocabDefinitionRow[]
  conjugations: VerbConjugationRow[]
}

/* ── Input validation ────────────────────────────────────────────────── */

const LookupSchema = z.object({
  lemma: z.string().min(1).max(200),
  root: z.string().max(50).nullable(),
  surfaceArabic: z.string().max(200).optional(),
})

/* ── Helpers ─────────────────────────────────────────────────────────── */

function buildFormFilter(
  column: string,
  lemma: string,
  surfaceArabic: string | undefined
): string {
  const forms = new Set<string>([lemma])
  if (surfaceArabic && surfaceArabic !== lemma) {
    forms.add(surfaceArabic)
  }
  return Array.from(forms)
    .map((form) => `${column}.eq.${form}`)
    .join(",")
}

/* ── Server Action ───────────────────────────────────────────────────── */

export async function fetchDictionaryDetails(
  lemma: string,
  root: string | null,
  surfaceArabic?: string
): Promise<DictionaryDetailsResult> {
  const parsed = LookupSchema.safeParse({ lemma, root, surfaceArabic })
  if (!parsed.success) {
    throw new Error(`Invalid lookup: ${parsed.error.message}`)
  }

  const normalizedLemma = parsed.data.lemma
  const normalizedRoot = parsed.data.root?.trim() || null
  const normalizedSurface = parsed.data.surfaceArabic?.trim() || undefined

  const lemmasFilter = buildFormFilter(
    "lemma",
    normalizedLemma,
    normalizedSurface
  )
  const lemmasQuery = serviceClient
    .from("vocab_lemmas")
    .select(
      "word_id, lemma, lemma_diacritic, transliteration, arabic_root, entry_type, source, CEFR, is_active"
    )
    .or(lemmasFilter)
    .eq("is_active", true)
  if (normalizedRoot === null || normalizedRoot === "") {
    lemmasQuery.is("arabic_root", null)
  } else {
    lemmasQuery.eq("arabic_root", normalizedRoot)
  }

  const definitionsFilter = buildFormFilter(
    "lemma_diacritic",
    normalizedLemma,
    normalizedSurface
  )
  const definitionsQuery = serviceClient
    .from("vocab_definitions")
    .select(
      "definition_id, lemma_diacritic, arabic_root, gloss, part_of_speech, definition_en, definition_ar, source, is_active"
    )
    .or(definitionsFilter)
    .eq("is_active", true)
  if (normalizedRoot === null || normalizedRoot === "") {
    definitionsQuery.is("arabic_root", null)
  } else {
    definitionsQuery.eq("arabic_root", normalizedRoot)
  }

  const conjugationsQuery = serviceClient
    .from("verb_conjugations")
    .select(
      "conjugation_id, lemma, root, tense, pronoun, pronoun_label, conjugation_diacritic, transliteration, is_active"
    )
    .eq("lemma", normalizedLemma)
    .eq("is_active", true)
    .order("tense", { ascending: true })
    .order("pronoun", { ascending: true })
  if (normalizedRoot === null || normalizedRoot === "") {
    conjugationsQuery.is("root", null)
  } else {
    conjugationsQuery.eq("root", normalizedRoot)
  }

  const [
    { data: lemmaRows, error: lemmaError },
    { data: definitionRows, error: definitionError },
    { data: conjugationRows, error: conjugationError },
  ] = await Promise.all([lemmasQuery, definitionsQuery, conjugationsQuery])

  if (lemmaError) {
    console.error("[fetchDictionaryDetails] vocab_lemmas error:", lemmaError.message)
    throw new Error(lemmaError.message)
  }
  if (definitionError) {
    console.error("[fetchDictionaryDetails] vocab_definitions error:", definitionError.message)
    throw new Error(definitionError.message)
  }
  if (conjugationError) {
    console.error("[fetchDictionaryDetails] verb_conjugations error:", conjugationError.message)
    throw new Error(conjugationError.message)
  }

  const lemmas = (lemmaRows ?? []) as unknown as VocabLemmaRow[]
  const definitions = (definitionRows ?? []) as unknown as VocabDefinitionRow[]
  const conjugations = (conjugationRows ?? []) as unknown as VerbConjugationRow[]

  // Dedupe in case lemma and surfaceArabic happen to return the same rows.
  const seenLemmas = new Set<number>()
  const uniqueLemmas = lemmas.filter((row) => {
    if (seenLemmas.has(row.word_id)) return false
    seenLemmas.add(row.word_id)
    return true
  })

  const seenDefinitions = new Set<number>()
  const uniqueDefinitions = definitions.filter((row) => {
    if (seenDefinitions.has(row.definition_id)) return false
    seenDefinitions.add(row.definition_id)
    return true
  })

  const seenConjugations = new Set<number>()
  const uniqueConjugations = conjugations.filter((row) => {
    if (seenConjugations.has(row.conjugation_id)) return false
    seenConjugations.add(row.conjugation_id)
    return true
  })

  return {
    lemma: normalizedLemma,
    root: normalizedRoot,
    lemmas: uniqueLemmas,
    definitions: uniqueDefinitions,
    conjugations: uniqueConjugations,
  }
}

/* ── Admin edits ─────────────────────────────────────────────────────── */

const DefinitionUpdateSchema = z.object({
  definitionId: z.number().int().positive(),
  gloss: z.string().max(500).optional(),
  definitionEn: z.string().max(2000).optional(),
  definitionAr: z.string().max(2000).optional(),
})

export async function updateVocabDefinition(input: {
  definitionId: number
  gloss?: string
  definitionEn?: string
  definitionAr?: string
}): Promise<void> {
  const admin = await isAdminUser()
  if (!admin) throw new Error('Forbidden')

  const parsed = DefinitionUpdateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`)
  }

  const payload: Record<string, unknown> = {}
  if (input.gloss !== undefined) payload.gloss = input.gloss
  if (input.definitionEn !== undefined) payload.definition_en = input.definitionEn
  if (input.definitionAr !== undefined) payload.definition_ar = input.definitionAr

  const { error } = await serviceClient
    .from('vocab_definitions')
    .update(payload)
    .eq('definition_id', input.definitionId)

  if (error) {
    console.error('[updateVocabDefinition] error:', error.message)
    throw new Error(error.message)
  }
}

const LemmaUpdateSchema = z.object({
  wordId: z.number().int().positive(),
  transliteration: z.string().max(200).optional(),
  cefr: z.string().max(10).optional(),
})

export async function updateVocabLemma(input: {
  wordId: number
  transliteration?: string
  cefr?: string
}): Promise<void> {
  const admin = await isAdminUser()
  if (!admin) throw new Error('Forbidden')

  const parsed = LemmaUpdateSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.message}`)
  }

  const payload: Record<string, unknown> = {}
  if (input.transliteration !== undefined) payload.transliteration = input.transliteration
  if (input.cefr !== undefined) payload.CEFR = input.cefr

  const { error } = await serviceClient
    .from('vocab_lemmas')
    .update(payload)
    .eq('word_id', input.wordId)

  if (error) {
    console.error('[updateVocabLemma] error:', error.message)
    throw new Error(error.message)
  }
}
