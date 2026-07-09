// app/lib/pipelineValidation.ts

export type PipelineItem = {
  timestamp: string
  arabic: string
  root: string | null
  entry_type: "word" | "phrase"
  CEFR?: string
  transliteration: string
  contextualArabic?: string
  english?: string
}

export type TranscriptToken = {
  CEFR?: string
  root: string | null
  lemma: string
  arabic: string
  arabicPlain?: string
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
  lemma_diacritic: string
  arabic_root: string | null
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

const requiredFields = [
  "timestamp",
  "arabic",
  "root",
  "entry_type",
  "transliteration",
] as const

const cefrRegex = /^(A[0-2]|B[1-2]|C[1-2])$/

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

      const lemma = token.lemma
      const surface = token.arabic
      const root = token.root
      const entryType = token.entry_type
      const cefr = token.CEFR
      const transliteration = token.transliteration
      const english = token.english

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
          return { ok: false, error: `Entry ${i + 1}, token ${j + 1}: "CEFR" must be one of A0–C2.` }
        }
        normalizedCefr = cefr.trim()
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

      const normalized: PipelineItem = {
        timestamp: timestamp.trim(),
        arabic: lemma.trim(),
        root: normalizedRoot,
        entry_type: entryType,
        transliteration: transliteration.trim(),
        contextualArabic: surface.trim(),
        english: typeof english === "string" && english.trim() ? english.trim() : undefined,
      }
      if (normalizedCefr) normalized.CEFR = normalizedCefr

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

    let normalizedCefr: string | undefined = undefined
    if (cefr !== undefined && cefr !== null && cefr !== "") {
      if (typeof cefr !== "string" || !cefrRegex.test(cefr)) {
        return { ok: false, error: `Item ${i + 1}: "CEFR" must be one of A0–C2.` }
      }
      normalizedCefr = cefr.trim()
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

    const normalized: PipelineItem = {
      timestamp: timestamp.trim(),
      arabic: arabic.trim(),
      root: normalizedRoot,
      entry_type: entryType,
      transliteration: transliteration.trim(),
      contextualArabic: typeof item.contextualArabic === "string" && item.contextualArabic.trim()
        ? item.contextualArabic.trim()
        : undefined,
      english: typeof item.english === "string" && item.english.trim() ? item.english.trim() : undefined,
    }
    if (normalizedCefr) normalized.CEFR = normalizedCefr

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
