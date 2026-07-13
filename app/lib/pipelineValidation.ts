// app/lib/pipelineValidation.ts

import { stripDiacritics } from "@/app/lib/arabic"

export type PipelineItem = {
  timestamp: string
  arabic: string
  root: string | null
  entry_type: "word" | "phrase"
  pos: string
  cefr?: string
  transliteration: string
  contextualArabic?: string
  english?: string
  source?: string
}

export type TranscriptToken = {
  cefr?: string
  CEFR?: string
  pos: string
  root: string | null
  lemma: string
  arabic: string
  english: string
  entry_type: "word" | "phrase"
  transliteration: string
}

export type TranscriptEntry = {
  tokens: TranscriptToken[]
  timestamp?: string
  arabicPlain?: string
  arabicDiacritic?: string
  translation?: string
}

export type DefinitionOutputRow = {
  lemma: string
  lemma_plain: string
  root: string | null
  gloss: string
  part_of_speech: string
  definition_en: string | null
  definition_ar: string | null
  source: string
}

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

function hasDiacritics(value: string): boolean {
  return stripDiacritics(value) !== value
}

function hasArabicScript(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value)
}

const requiredFields = [
  "timestamp",
  "arabic",
  "root",
  "entry_type",
  "transliteration",
  "pos",
] as const

const cefrRegex = /^(A[0-2]|B[1-2]|C[1-2])$/i

export function validateTranscriptEntries(
  entries: unknown[]
): { ok: true; items: PipelineItem[] } | { ok: false; error: string } {
  const seen = new Set<string>()
  const valid: PipelineItem[] = []
  const errors: string[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!isPlainObject(entry)) {
      return { ok: false, error: `Entry ${i + 1} is not an object.` }
    }

    const tokens = entry.tokens
    if (!Array.isArray(tokens)) {
      return { ok: false, error: `Entry ${i + 1}: "tokens" must be an array.` }
    }

    if (typeof entry.timestamp !== "string" || !entry.timestamp.trim()) {
      return { ok: false, error: `Entry ${i + 1}: "timestamp" must be a non-empty string.` }
    }
    const timestamp = entry.timestamp

    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j]
      if (!isPlainObject(token)) {
        return { ok: false, error: `Entry ${i + 1}, token ${j + 1} is not an object.` }
      }

      const lemma = typeof token.lemma === "string" && token.lemma.trim() ? token.lemma : token.arabic
      const surface = token.arabic
      const root = token.root
      const entryType = token.entry_type
      const cefr = token.cefr ?? token.CEFR
      const transliteration = token.transliteration
      const english = token.english
      const pos = token.pos

      if (typeof lemma !== "string" || !lemma.trim()) {
        return { ok: false, error: `Entry ${i + 1}, token ${j + 1}: "lemma" must be a non-empty string.` }
      }
      if (typeof surface !== "string" || !surface.trim()) {
        return { ok: false, error: `Entry ${i + 1}, token ${j + 1}: "arabic" must be a non-empty string.` }
      }
      if (typeof transliteration !== "string" || !transliteration.trim()) {
        return { ok: false, error: `Entry ${i + 1}, token ${j + 1}: "transliteration" must be a non-empty string.` }
      }

      let normalizedCefr: string | undefined = undefined
      if (cefr !== undefined && cefr !== null && cefr !== "") {
        if (typeof cefr !== "string" || !cefrRegex.test(cefr)) {
          return { ok: false, error: `Entry ${i + 1}, token ${j + 1}: "cefr" must be one of A0–C2.` }
        }
        normalizedCefr = cefr.trim().toLowerCase()
      }

      if (typeof pos !== "string" || !pos.trim()) {
        return { ok: false, error: `Entry ${i + 1}, token ${j + 1}: "pos" is required and must be a non-empty string.` }
      }
      if (!validPosValues.has(pos.trim())) {
        errors.push(`Entry ${i + 1}, token ${j + 1}: "pos" must be one of: ${Array.from(validPosValues).join(", ")}.`)
        continue
      }

      if (entryType !== "word" && entryType !== "phrase") {
        return { ok: false, error: `Entry ${i + 1}, token ${j + 1}: "entry_type" must be "word" or "phrase".` }
      }

      let normalizedRoot: string | null = null
      if (root !== null && root !== undefined && root !== "") {
        if (typeof root !== "string" || !rootRegex.test(root)) {
          errors.push(`Entry ${i + 1}, token ${j + 1}: root "${root}" does not match the required Arabic root format (e.g. "س-ر-ع").`)
          continue
        }
        normalizedRoot = root
      }

      if (!hasArabicScript(lemma.trim()) || !hasDiacritics(lemma.trim())) {
        errors.push(`Entry ${i + 1}, token ${j + 1}: "lemma" must be Arabic text with diacritics.`)
        continue
      }
      if (!hasArabicScript(surface.trim()) || !hasDiacritics(surface.trim())) {
        errors.push(`Entry ${i + 1}, token ${j + 1}: "arabic" must be Arabic text with diacritics.`)
        continue
      }

      if (typeof english === "string" && english.trim() && hasArabicScript(english.trim())) {
        errors.push(`Entry ${i + 1}, token ${j + 1}: "english" must not contain Arabic script.`)
        continue
      }

      const normalized: PipelineItem = {
        timestamp: timestamp.trim(),
        arabic: lemma.trim(),
        root: normalizedRoot,
        entry_type: entryType,
        pos: pos.trim(),
        transliteration: transliteration.trim(),
        contextualArabic: surface.trim(),
        english: typeof english === "string" && english.trim() ? english.trim() : undefined,
      }
      if (normalizedCefr) normalized.cefr = normalizedCefr

      const key = `${normalized.arabic}|${normalized.root ?? ""}|${normalized.entry_type}`
      if (!seen.has(key)) {
        seen.add(key)
        valid.push(normalized)
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join("\n") }
  }

  return { ok: true, items: valid }
}

export function validateItems(items: unknown[]): { ok: true; items: PipelineItem[] } | { ok: false; error: string } {
  const seen = new Set<string>()
  const valid: PipelineItem[] = []
  const errors: string[] = []

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
    const cefr = item.cefr ?? item.CEFR
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

    let normalizedCefr: string | undefined = undefined
    if (cefr !== undefined && cefr !== null && cefr !== "") {
      if (typeof cefr !== "string" || !cefrRegex.test(cefr)) {
        return { ok: false, error: `Item ${i + 1}: "cefr" must be one of A0–C2.` }
      }
      normalizedCefr = cefr.trim().toLowerCase()
    }

    const pos = item.pos
    if (typeof pos !== "string" || !pos.trim()) {
      return { ok: false, error: `Item ${i + 1}: "pos" is required and must be a non-empty string.` }
    }
    if (!validPosValues.has(pos.trim())) {
      errors.push(`Item ${i + 1}: "pos" must be one of: ${Array.from(validPosValues).join(", ")}.`)
      continue
    }

    if (entryType !== "word" && entryType !== "phrase") {
      return { ok: false, error: `Item ${i + 1}: "entry_type" must be "word" or "phrase".` }
    }

    let normalizedRoot: string | null = null
    if (root !== null && root !== undefined && root !== "") {
      if (typeof root !== "string" || !rootRegex.test(root)) {
        errors.push(`Item ${i + 1}: root "${root}" does not match the required Arabic root format (e.g. "س-ر-ع").`)
        continue
      }
      normalizedRoot = root
    }

    if (!hasArabicScript(arabic.trim()) || !hasDiacritics(arabic.trim())) {
      errors.push(`Item ${i + 1}: "arabic" (lemma) must be Arabic text with diacritics.`)
      continue
    }

    const contextualArabic = typeof item.contextualArabic === "string" && item.contextualArabic.trim()
      ? item.contextualArabic.trim()
      : undefined
    if (contextualArabic && (!hasArabicScript(contextualArabic) || !hasDiacritics(contextualArabic))) {
      errors.push(`Item ${i + 1}: "contextualArabic" must be Arabic text with diacritics.`)
      continue
    }

    const english = typeof item.english === "string" && item.english.trim() ? item.english.trim() : undefined
    if (english && hasArabicScript(english)) {
      errors.push(`Item ${i + 1}: "english" must not contain Arabic script.`)
      continue
    }

    const normalized: PipelineItem = {
      timestamp: timestamp.trim(),
      arabic: arabic.trim(),
      root: normalizedRoot,
      entry_type: entryType,
      pos: pos.trim(),
      transliteration: transliteration.trim(),
      contextualArabic,
      english,
    }
    if (normalizedCefr) normalized.cefr = normalizedCefr

    const key = `${normalized.arabic}|${normalized.root ?? ""}|${normalized.entry_type}`
    if (!seen.has(key)) {
      seen.add(key)
      valid.push(normalized)
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join("\n") }
  }

  return { ok: true, items: valid }
}

export function itemKey(item: PipelineItem): string {
  return `${item.arabic}|${item.root ?? ""}|${item.entry_type}`
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

    const lemma = item.lemma
    const gloss = item.gloss
    const pos = item.part_of_speech

    if (typeof lemma !== "string" || !lemma.trim()) {
      return { ok: false, error: `Row ${i + 1}: "lemma" is required and must be a non-empty string.` }
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

    let normalizedRoot: string | null = null
    if (item.root !== null && item.root !== undefined && item.root !== "") {
      if (typeof item.root !== "string" || !rootRegex.test(item.root)) {
        return { ok: false, error: `Row ${i + 1}: "root" must match the Arabic root format (e.g. "س-ر-ع") or be null.` }
      }
      normalizedRoot = item.root
    }

    const lemmaDi = lemma.trim()
    rows.push({
      lemma: lemmaDi,
      lemma_plain: stripDiacritics(lemmaDi),
      root: normalizedRoot,
      gloss: gloss.trim(),
      part_of_speech: pos,
      definition_en: typeof item.definition_en === "string" && item.definition_en.trim() ? item.definition_en.trim() : null,
      definition_ar: typeof item.definition_ar === "string" && item.definition_ar.trim() ? item.definition_ar.trim() : null,
      source: typeof item.source === "string" && item.source.trim() ? item.source.trim() : "",
    })
  }

  return { ok: true, rows }
}
