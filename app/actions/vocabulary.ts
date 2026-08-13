"use server"

import { stripDiacritics } from "@/app/lib/arabic"
import { hasServiceClientConfig, serviceClient } from "@/app/lib/supabase"

export interface VocabularyEntry {
  id: number
  arabic: string
  english: string
  transliteration?: string
  isRoot: boolean
  root?: string
  quranOccurrence?: number
}

const ARABIC_PATTERN = /[\u0600-\u06ff]/
const ENGLISH_HEADWORD_HINTS: Record<string, string[]> = {
  book: ["كتاب"],
  books: ["كتاب"],
  travel: ["سفر", "سافر"],
  development: ["تطور"],
  progress: ["تقدم", "تطور"],
  house: ["بيت", "دار"],
  home: ["بيت", "دار"],
  learn: ["علم", "تعلم"],
  learning: ["علم", "تعلم"],
}

function cleanDefinition(value: string): string {
  const mainEntry = value.split("│")[0]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const verbMeaning = mainEntry.match(/\bto\s+[a-z][^;]*/i)?.[0]
  if (verbMeaning) return verbMeaning.trim().slice(0, 180)

  let withoutArabic = mainEntry
    .replace(/[\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (/\bpl\.\s/i.test(withoutArabic)) {
    withoutArabic = withoutArabic.replace(/^.*?\bpl\.\s+(?:\S+,\s+)*\S+\s+/i, "")
  } else {
    withoutArabic = withoutArabic.replace(/^\S+\s+/, "")
  }
  withoutArabic = withoutArabic
    .replace(/^(?:(?:f|m|coll|n)\.\s+\S+\s*)+/i, "")
    .replace(/^[-–—,;:\s]+/, "")

  const shortGloss = withoutArabic
    .split(";")
    .slice(0, 2)
    .map((part) => part.split(",").slice(0, 4).join(",").trim())
    .filter(Boolean)
    .join("; ")
  return (shortGloss || "Definition unavailable").slice(0, 180)
}

function extractTransliteration(value: string): string | undefined {
  const mainEntry = value.split("│")[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const afterArabic = mainEntry.replace(/^[\u0600-\u06ff\s]+/, "").trim()
  if (!afterArabic) return undefined
  const beforeGrammar = afterArabic.split(/\s+(?:pl|f|m|coll|n)\.\s/i)[0]
  const transliteration = beforeGrammar
    .split(/\s+/)[0]
    .replace(/[,;:]+$/, "")
    .trim()
  return transliteration || undefined
}

function dailyRandomOffset(dayKey: string, count: number): number {
  let hash = 2166136261
  for (const character of dayKey) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % count
}

function safeSearchTerm(value: string): string {
  return value.trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ").slice(0, 80)
}

export async function searchVocabulary(rawQuery: string): Promise<VocabularyEntry[]> {
  const query = safeSearchTerm(rawQuery)
  if (query.length < 2 || !hasServiceClientConfig()) return []

  const isArabic = ARABIC_PATTERN.test(query)
  const normalized = isArabic ? stripDiacritics(query) : query
  const columns = "id, word, definition, is_root, parent_id, quran_occurrence" as const
  let rows: Array<{ id: number; word: string; definition: string; is_root: boolean; parent_id: number; quran_occurrence: number | null }> = []
  if (isArabic) {
    const [direct, related] = await Promise.all([
      serviceClient.from("hanswehr_dictionary").select(columns).ilike("word", `%${normalized}%`).order("is_root", { ascending: false }).limit(18),
      serviceClient.from("hanswehr_dictionary").select(columns).textSearch("search_vector", normalized, { config: "simple", type: "websearch" }).order("is_root", { ascending: false }).limit(36),
    ])
    if (direct.error) throw new Error(direct.error.message)
    if (related.error) throw new Error(related.error.message)
    const seen = new Set<number>()
    rows = [...(direct.data ?? []), ...(related.data ?? [])].filter((row) => {
      if (seen.has(row.id)) return false
      seen.add(row.id)
      return true
    }).slice(0, 36)
  } else {
    const hints = ENGLISH_HEADWORD_HINTS[normalized.toLocaleLowerCase()] ?? []
    const [result, hinted] = await Promise.all([
      serviceClient.from("hanswehr_dictionary").select(columns).ilike("definition", `%${normalized}%`).limit(220),
      hints.length
        ? serviceClient.from("hanswehr_dictionary").select(columns).in("word", hints)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (result.error) throw new Error(result.error.message)
    if (hinted.error) throw new Error(hinted.error.message)
    const needle = normalized.toLocaleLowerCase()
    const ranked = [...(result.data ?? [])]
      .sort((left, right) => {
        const leftMatch = String(left.definition ?? "").replace(/<[^>]+>/g, " ").toLocaleLowerCase().indexOf(needle)
        const rightMatch = String(right.definition ?? "").replace(/<[^>]+>/g, " ").toLocaleLowerCase().indexOf(needle)
        const leftIndex = leftMatch < 0 ? Number.MAX_SAFE_INTEGER : leftMatch
        const rightIndex = rightMatch < 0 ? Number.MAX_SAFE_INTEGER : rightMatch
        return leftIndex - rightIndex || Number(right.quran_occurrence ?? 0) - Number(left.quran_occurrence ?? 0)
      })
    const seen = new Set<number>()
    rows = [...(hinted.data ?? []), ...ranked].filter((row) => {
      if (seen.has(row.id)) return false
      seen.add(row.id)
      return true
    }).slice(0, 36)
  }

  const parentIds = Array.from(new Set(rows.map((row) => Number(row.parent_id)).filter(Boolean)))
  const { data: roots, error: rootsError } = parentIds.length
    ? await serviceClient.from("hanswehr_dictionary").select("id, word").in("id", parentIds)
    : { data: [], error: null }
  if (rootsError) throw new Error(rootsError.message)
  const rootMap = new Map((roots ?? []).map((root) => [Number(root.id), String(root.word)]))

  return rows.map((row) => ({
    id: Number(row.id),
    arabic: String(row.word),
    english: cleanDefinition(String(row.definition ?? "")),
    transliteration: extractTransliteration(String(row.definition ?? "")),
    isRoot: Boolean(row.is_root),
    root: rootMap.get(Number(row.parent_id)),
    quranOccurrence: row.quran_occurrence == null ? undefined : Number(row.quran_occurrence),
  }))
}

export async function fetchWordOfTheDay(): Promise<VocabularyEntry | null> {
    if (!hasServiceClientConfig()) return null
    const dayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
    const { count, error: countError } = await serviceClient
      .from("hanswehr_dictionary")
      .select("id", { count: "exact", head: true })
      .eq("is_root", false)
    if (countError || !count) return null

    const offset = dailyRandomOffset(dayKey, count)
    const { data, error } = await serviceClient
      .from("hanswehr_dictionary")
      .select("id, word, definition, is_root, parent_id, quran_occurrence")
      .eq("is_root", false)
      .order("id")
      .range(offset, offset)
      .maybeSingle()
    if (error || !data) return null

    const { data: root } = await serviceClient
      .from("hanswehr_dictionary")
      .select("word")
      .eq("id", data.parent_id)
      .maybeSingle()

    return {
      id: Number(data.id),
      arabic: String(data.word),
      english: cleanDefinition(String(data.definition ?? "")),
      transliteration: extractTransliteration(String(data.definition ?? "")),
      isRoot: false,
      root: root?.word ? String(root.word) : undefined,
      quranOccurrence: data.quran_occurrence == null ? undefined : Number(data.quran_occurrence),
    }
}
