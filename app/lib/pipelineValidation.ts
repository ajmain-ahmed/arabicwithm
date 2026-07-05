// app/lib/pipelineValidation.ts

import type { DefinitionOutputRow } from "@/app/actions/pipeline"

export const rootRegex = /^[ء-ي]-[ء-ي]-[ء-ي](-[ء-ي])?$/

export const validPosValues = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "particle",
  "pronoun",
  "proper_noun",
  "phrase",
  "interjection",
  "conjunction",
  "preposition",
  "numeral",
])

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function validateDefinitionRows(
  items: unknown[]
): { ok: true; rows: DefinitionOutputRow[] } | { ok: false; error: string } {
  const rows: DefinitionOutputRow[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!isPlainObject(item)) {
      return { ok: false, error: `Row ${i + 1} is not an object.` }
    }

    const lemmaDi = item.lemma_diacritic
    const gloss = item.gloss
    const pos = item.part_of_speech

    if (typeof lemmaDi !== "string" || !lemmaDi.trim()) {
      return { ok: false, error: `Row ${i + 1}: "lemma_diacritic" is required and must be a non-empty string.` }
    }
    if (typeof gloss !== "string" || !gloss.trim()) {
      return { ok: false, error: `Row ${i + 1}: "gloss" is required and must be a non-empty string.` }
    }
    if (typeof pos !== "string" || !validPosValues.has(pos)) {
      return {
        ok: false,
        error: `Row ${i + 1}: "part_of_speech" must be one of: ${Array.from(validPosValues).join(", ")}.`,
      }
    }

    let root: string | null = null
    if (item.arabic_root !== null && item.arabic_root !== undefined && item.arabic_root !== "") {
      if (typeof item.arabic_root !== "string" || !rootRegex.test(item.arabic_root)) {
        return { ok: false, error: `Row ${i + 1}: "arabic_root" must match the Arabic root format (e.g. "س-ر-ع") or be null.` }
      }
      root = item.arabic_root
    }

    rows.push({
      lemma_diacritic: lemmaDi.trim(),
      arabic_root: root,
      gloss: gloss.trim(),
      part_of_speech: pos,
      definition_en: typeof item.definition_en === "string" && item.definition_en.trim() ? item.definition_en.trim() : null,
      definition_ar: typeof item.definition_ar === "string" && item.definition_ar.trim() ? item.definition_ar.trim() : null,
      source: typeof item.source === "string" && item.source.trim() ? item.source.trim() : "",
    })
  }

  return { ok: true, rows }
}
