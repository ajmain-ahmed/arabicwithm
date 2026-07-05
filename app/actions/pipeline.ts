// app/actions/pipeline.ts

"use server"

import { serviceClient } from "@/app/lib/supabase"
import { isAdminUser } from "./vocab"
import { validateDefinitionRows, rootRegex } from "@/app/lib/pipelineValidation"

/* ── Types ─────────────────────────────────────────────────────────── */

export type PipelineItem = {
  timestamp: string
  arabic: string
  root: string | null
  entry_type: "word" | "phrase"
  CEFR: string
  transliteration: string
}

export type PipelinePreviewResult = {
  ok: true
  existing: PipelineItem[]
  new: PipelineItem[]
} | {
  ok: false
  error: string
}

export type PipelineCommitResult = {
  ok: true
  inserted: number
} | {
  ok: false
  error: string
}

export type DefinitionOutputRow = {
  lemma_diacritic: string
  arabic_root: string | null
  gloss: string
  part_of_speech: string
  definition_en: string | null
  definition_ar: string | null
  source: string
}

export type DefinitionCommitResult = {
  ok: true
  inserted: number
} | {
  ok: false
  error: string
}

/* ── Helpers ───────────────────────────────────────────────────────── */

async function guardAdmin() {
  const ok = await isAdminUser()
  if (!ok) throw new Error("Forbidden")
}

const requiredFields = [
  "timestamp",
  "arabic",
  "root",
  "entry_type",
  "CEFR",
  "transliteration",
] as const

const cefrRegex = /^(A[0-2]|B[1-2]|C[1-2])$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function validateItems(items: unknown[]): { ok: true; items: PipelineItem[] } | { ok: false; error: string } {
  const seen = new Set<string>()
  const valid: PipelineItem[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!isPlainObject(item)) {
      return { ok: false, error: `Item ${i + 1} is not an object.` }
    }

    for (const field of requiredFields) {
      if (!(field in item)) {
        return { ok: false, error: `Item ${i + 1} is missing field "${field}".` }
      }
    }

    const timestamp = item.timestamp
    const arabic = item.arabic
    const root = item.root
    const entryType = item.entry_type
    const cefr = item.CEFR
    const transliteration = item.transliteration

    if (typeof timestamp !== "string" || !timestamp.trim()) {
      return { ok: false, error: `Item ${i + 1}: "timestamp" must be a non-empty string.` }
    }
    if (typeof arabic !== "string" || !arabic.trim()) {
      return { ok: false, error: `Item ${i + 1}: "arabic" must be a non-empty string.` }
    }
    if (typeof transliteration !== "string" || !transliteration.trim()) {
      return { ok: false, error: `Item ${i + 1}: "transliteration" must be a non-empty string.` }
    }
    if (typeof cefr !== "string" || !cefrRegex.test(cefr)) {
      return { ok: false, error: `Item ${i + 1}: "CEFR" must be one of A0–C2.` }
    }
    if (entryType !== "word" && entryType !== "phrase") {
      return { ok: false, error: `Item ${i + 1}: "entry_type" must be "word" or "phrase".` }
    }

    let normalizedRoot: string | null = null
    if (root !== null && root !== undefined && root !== "") {
      if (typeof root !== "string" || !rootRegex.test(root)) {
        return { ok: false, error: `Item ${i + 1}: "root" must match the Arabic root format (e.g. "س-ر-ع").` }
      }
      normalizedRoot = root
    }

    const normalized: PipelineItem = {
      timestamp: timestamp.trim(),
      arabic: arabic.trim(),
      root: normalizedRoot,
      entry_type: entryType,
      CEFR: cefr.trim(),
      transliteration: transliteration.trim(),
    }

    const key = `${normalized.arabic}|${normalized.root ?? ""}|${normalized.entry_type}`
    if (!seen.has(key)) {
      seen.add(key)
      valid.push(normalized)
    }
  }

  return { ok: true, items: valid }
}

function itemKey(item: PipelineItem): string {
  return `${item.arabic}|${item.root ?? ""}|${item.entry_type}`
}

/* ── Server Actions ────────────────────────────────────────────────── */

export async function previewPipeline(
  _source: string,
  jsonText: string
): Promise<PipelinePreviewResult> {
  await guardAdmin()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { ok: false, error: "Invalid JSON. Please check the file contents and try again." }
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "JSON must be an array of objects." }
  }

  const validation = validateItems(parsed)
  if (!validation.ok) return { ok: false, error: validation.error }
  const items = validation.items

  if (items.length === 0) {
    return { ok: false, error: "No valid entries found in the uploaded file." }
  }

  const { data, error } = await serviceClient
    .from("vocab_lemmas")
    .select("lemma_diacritic, arabic_root, entry_type")

  if (error) {
    console.error("[previewPipeline] error:", error.message)
    return { ok: false, error: error.message }
  }

  const dbKeys = new Set<string>()
  for (const row of data ?? []) {
    const di = String(row.lemma_diacritic ?? "")
    const r = row.arabic_root ? String(row.arabic_root) : ""
    const t = String(row.entry_type ?? "")
    if (di) dbKeys.add(`${di}|${r}|${t}`)
  }

  const existing: PipelineItem[] = []
  const newItems: PipelineItem[] = []

  for (const item of items) {
    if (dbKeys.has(itemKey(item))) {
      existing.push(item)
    } else {
      newItems.push(item)
    }
  }

  return { ok: true, existing, new: newItems }
}

export async function commitPipeline(
  source: string,
  items: PipelineItem[]
): Promise<PipelineCommitResult> {
  await guardAdmin()

  const sourceTrimmed = source.trim()
  if (!sourceTrimmed) {
    return { ok: false, error: "Source is required." }
  }

  const validation = validateItems(items)
  if (!validation.ok) return { ok: false, error: validation.error }
  const validItems = validation.items

  if (validItems.length === 0) {
    return { ok: false, error: "No new rows to insert." }
  }

  const rows = validItems.map((item) => ({
    lemma: item.arabic,
    lemma_diacritic: item.arabic,
    transliteration: item.transliteration,
    arabic_root: item.root,
    entry_type: item.entry_type,
    source: sourceTrimmed,
    CEFR: item.CEFR,
    is_active: true,
  }))

  const { error, count } = await serviceClient
    .from("vocab_lemmas")
    .insert(rows)
    .select()

  if (error) {
    console.error("[commitPipeline] error:", error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true, inserted: count ?? rows.length }
}

/* ── Definitions prompt step ───────────────────────────────────────── */

export type ExistingLemmaDefinition = {
  gloss: string
  part_of_speech: string
  definition_en: string | null
}

export type ExistingLemmaWithDefs = {
  lemma_diacritic: string
  arabic_root: string | null
  entry_type: "word" | "phrase"
  CEFR: string
  transliteration: string
  definitions: ExistingLemmaDefinition[]
}

export type ExampleDefinitionRow = {
  lemma_diacritic: string
  arabic_root: string | null
  gloss: string
  part_of_speech: string
  definition_en: string | null
  definition_ar: string | null
}

export type DefinitionsPromptData = {
  source: string
  transcriptJson: string
  newLemmas: PipelineItem[]
  existingLemmas: ExistingLemmaWithDefs[]
  exampleDefinitions: ExampleDefinitionRow[]
}

export async function buildDefinitionsPromptData(
  source: string,
  transcriptJson: string,
  existing: PipelineItem[],
  newLemmas: PipelineItem[]
): Promise<{ ok: true; data: DefinitionsPromptData } | { ok: false; error: string }> {
  await guardAdmin()

  const sourceTrimmed = source.trim()
  if (!sourceTrimmed) {
    return { ok: false, error: "Source is required." }
  }

  if (!transcriptJson.trim()) {
    return { ok: false, error: "Transcript JSON is required." }
  }

  const validationExisting = validateItems(existing)
  if (!validationExisting.ok) return { ok: false, error: validationExisting.error }

  const validationNew = validateItems(newLemmas)
  if (!validationNew.ok) return { ok: false, error: validationNew.error }

  const existingItems = validationExisting.items
  const newItems = validationNew.items

  // Fetch definitions for existing lemmas
  const existingLemmaDiacritics = Array.from(
    new Set(existingItems.map((i) => i.arabic).filter(Boolean))
  )

  const existingDefsRes = await serviceClient
    .from("vocab_definitions")
    .select("lemma_diacritic, arabic_root, gloss, part_of_speech, definition_en")
    .in("lemma_diacritic", existingLemmaDiacritics)

  if (existingDefsRes.error) {
    console.error("[buildDefinitionsPromptData] existing defs error:", existingDefsRes.error.message)
    return { ok: false, error: existingDefsRes.error.message }
  }

  const defsByLemmaRoot = new Map<string, ExistingLemmaDefinition[]>()
  for (const row of (existingDefsRes.data ?? []) as Record<string, unknown>[]) {
    const di = String(row.lemma_diacritic ?? "")
    const r = row.arabic_root ? String(row.arabic_root) : ""
    const key = `${di}|${r}`
    const def: ExistingLemmaDefinition = {
      gloss: String(row.gloss ?? ""),
      part_of_speech: String(row.part_of_speech ?? ""),
      definition_en: row.definition_en ? String(row.definition_en) : null,
    }
    const list = defsByLemmaRoot.get(key) ?? []
    list.push(def)
    defsByLemmaRoot.set(key, list)
  }

  const existingLemmas: ExistingLemmaWithDefs[] = existingItems.map((item) => {
    const key = `${item.arabic}|${item.root ?? ""}`
    return {
      lemma_diacritic: item.arabic,
      arabic_root: item.root,
      entry_type: item.entry_type,
      CEFR: item.CEFR,
      transliteration: item.transliteration,
      definitions: defsByLemmaRoot.get(key) ?? [],
    }
  })

  // Fetch example definition rows (top 3)
  const examplesRes = await serviceClient
    .from("vocab_definitions")
    .select("lemma_diacritic, arabic_root, gloss, part_of_speech, definition_en, definition_ar")
    .order("definition_id", { ascending: true })
    .limit(3)

  if (examplesRes.error) {
    console.error("[buildDefinitionsPromptData] examples error:", examplesRes.error.message)
    return { ok: false, error: examplesRes.error.message }
  }

  const exampleDefinitions: ExampleDefinitionRow[] = ((examplesRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      lemma_diacritic: String(row.lemma_diacritic ?? ""),
      arabic_root: row.arabic_root ? String(row.arabic_root) : null,
      gloss: String(row.gloss ?? ""),
      part_of_speech: String(row.part_of_speech ?? ""),
      definition_en: row.definition_en ? String(row.definition_en) : null,
      definition_ar: row.definition_ar ? String(row.definition_ar) : null,
    })
  )

  return {
    ok: true,
    data: {
      source: sourceTrimmed,
      transcriptJson,
      newLemmas: newItems,
      existingLemmas: existingLemmas,
      exampleDefinitions,
    },
  }
}

/* ── Definition commit ─────────────────────────────────────────────── */

export async function commitDefinitions(
  source: string,
  rows: DefinitionOutputRow[]
): Promise<DefinitionCommitResult> {
  await guardAdmin()

  const sourceTrimmed = source.trim()
  if (!sourceTrimmed) {
    return { ok: false, error: "Source is required." }
  }

  const validation = validateDefinitionRows(rows)
  if (!validation.ok) return { ok: false, error: validation.error }
  const validRows = validation.rows

  if (validRows.length === 0) {
    return { ok: false, error: "No rows to insert." }
  }

  const insertRows = validRows.map((row) => ({
    lemma_diacritic: row.lemma_diacritic,
    arabic_root: row.arabic_root,
    gloss: row.gloss,
    part_of_speech: row.part_of_speech,
    definition_en: row.definition_en,
    definition_ar: row.definition_ar,
    source: row.source || sourceTrimmed,
    is_active: true,
  }))

  const { error, count } = await serviceClient
    .from("vocab_definitions")
    .insert(insertRows)
    .select()

  if (error) {
    console.error("[commitDefinitions] error:", error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true, inserted: count ?? insertRows.length }
}
