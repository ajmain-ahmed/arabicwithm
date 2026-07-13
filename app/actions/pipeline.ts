// app/actions/pipeline.ts

"use server"

import { serviceClient } from "@/app/lib/supabase"
import { stripDiacritics } from "@/app/lib/arabic"
import { isAdminUser } from "./vocab"
import {
  validateDefinitionRows,
  validateTranscriptEntries,
  validateItems,
  itemKey,
  type PipelineItem,
  type DefinitionOutputRow,
} from "@/app/lib/pipelineValidation"

/* ── Types ─────────────────────────────────────────────────────────── */

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
    return { ok: false, error: "JSON must be an array of transcript entries." }
  }

  const validation = validateTranscriptEntries(parsed)
  if (!validation.ok) return { ok: false, error: validation.error }
  const items = validation.items

  if (items.length === 0) {
    return { ok: false, error: "No valid entries found in the uploaded file." }
  }

  const { data, error } = await serviceClient
    .from("vocab_lemmas")
    .select("lemma, root, entry_type, source")

  if (error) {
    console.error("[previewPipeline] error:", error.message)
    return { ok: false, error: error.message }
  }

  const dbSourceMap = new Map<string, string>()
  for (const row of data ?? []) {
    const lemma = String(row.lemma ?? "")
    const r = row.root ? String(row.root) : ""
    const t = String(row.entry_type ?? "")
    if (lemma) dbSourceMap.set(`${lemma}|${r}|${t}`, row.source ? String(row.source) : "")
  }

  const existing: PipelineItem[] = []
  const newItems: PipelineItem[] = []

  for (const item of items) {
    if (dbSourceMap.has(itemKey(item))) {
      existing.push({ ...item, source: dbSourceMap.get(itemKey(item)) || undefined })
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
    lemma_plain: stripDiacritics(item.arabic),
    transliteration: item.transliteration,
    root: item.root,
    entry_type: item.entry_type,
    source: sourceTrimmed,
    CEFR: item.cefr,
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
  lemma: string
  lemma_plain: string
  root: string | null
  entry_type: "word" | "phrase"
  cefr?: string
  transliteration: string
  definitions: ExistingLemmaDefinition[]
}

export type ExampleDefinitionRow = {
  lemma: string
  lemma_plain: string
  root: string | null
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
  const existingLemmasList = Array.from(
    new Set(existingItems.map((i) => i.arabic).filter(Boolean))
  )

  const existingDefsRes = await serviceClient
    .from("vocab_definitions")
    .select("lemma, lemma_plain, root, gloss, part_of_speech, definition_en")
    .in("lemma", existingLemmasList)

  if (existingDefsRes.error) {
    console.error("[buildDefinitionsPromptData] existing defs error:", existingDefsRes.error.message)
    return { ok: false, error: existingDefsRes.error.message }
  }

  const defsByLemmaRoot = new Map<string, ExistingLemmaDefinition[]>()
  for (const row of (existingDefsRes.data ?? []) as Record<string, unknown>[]) {
    const lemma = String(row.lemma ?? "")
    const r = row.root ? String(row.root) : ""
    const key = `${lemma}|${r}`
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
      lemma: item.arabic,
      lemma_plain: stripDiacritics(item.arabic),
      root: item.root,
      entry_type: item.entry_type,
      cefr: item.cefr,
      transliteration: item.transliteration,
      definitions: defsByLemmaRoot.get(key) ?? [],
    }
  })

  // Fetch example definition rows (top 3)
  const examplesRes = await serviceClient
    .from("vocab_definitions")
    .select("lemma, lemma_plain, root, gloss, part_of_speech, definition_en, definition_ar")
    .order("definition_id", { ascending: true })
    .limit(3)

  if (examplesRes.error) {
    console.error("[buildDefinitionsPromptData] examples error:", examplesRes.error.message)
    return { ok: false, error: examplesRes.error.message }
  }

  const exampleDefinitions: ExampleDefinitionRow[] = ((examplesRes.data ?? []) as Record<string, unknown>[]).map(
    (row) => ({
      lemma: String(row.lemma ?? ""),
      lemma_plain: String(row.lemma_plain ?? stripDiacritics(String(row.lemma ?? ""))),
      root: row.root ? String(row.root) : null,
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

/* ── Definition existence check ────────────────────────────────────── */

export async function checkExistingDefinitions(
  rows: DefinitionOutputRow[]
): Promise<{ ok: true; existingKeys: string[] } | { ok: false; error: string }> {
  await guardAdmin()

  const validation = validateDefinitionRows(rows)
  if (!validation.ok) return { ok: false, error: validation.error }
  const validRows = validation.rows

  if (validRows.length === 0) {
    return { ok: true, existingKeys: [] }
  }

  const lemmas = Array.from(new Set(validRows.map((r) => r.lemma)))

  const { data, error } = await serviceClient
    .from("vocab_definitions")
    .select("lemma, root")
    .in("lemma", lemmas)

  if (error) {
    console.error("[checkExistingDefinitions] error:", error.message)
    return { ok: false, error: error.message }
  }

  const existingKeys = new Set<string>()
  for (const row of data ?? []) {
    const lemma = String(row.lemma ?? "")
    const r = row.root ? String(row.root) : ""
    existingKeys.add(`${lemma}|${r}`)
  }

  const result: string[] = []
  for (const row of validRows) {
    const key = `${row.lemma}|${row.root ?? ""}`
    if (existingKeys.has(key)) {
      result.push(key)
    }
  }

  return { ok: true, existingKeys: result }
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
    lemma: row.lemma,
    lemma_plain: row.lemma_plain,
    root: row.root,
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
