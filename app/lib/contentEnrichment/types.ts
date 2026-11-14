export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Cefr = (typeof CEFR_LEVELS)[number]
export type SourceKind = 'chapter' | 'episode' | 'transcript' | 'vocabulary'
export type Analyser = 'phrases' | 'grammar'
export type JsonRecord = Record<string, unknown>
export interface EnrichmentSource {
  kind: SourceKind
  id: string
  title: string
  parentId?: string
  parentTitle?: string
  url: string
  originalUrl?: string
  language: 'ar' | 'en'
  content: unknown
  level?: string
  unitKeys?: string[]
}
export interface CanonicalUnit {
  key: string
  sourceOrder?: number
  arabic: string
  english: string
  tokens: JsonRecord[]
  timestamp?: string
  exampleCefr?: Cefr
  ruleHints: string[]
  grammarEligible?: boolean
  authoredLessonExample?: boolean
  chapterRuleHints?: string[]
  explanation?: string
  authoredHighlight?: string
}
export interface PhraseCandidate {
  arabic: string
  transliteration: string
  english: string
  cefr: Cefr | null
  existingId?: string
  confidence: number
  evidence: string
  unit: CanonicalUnit
}
export interface GrammarCandidate {
  ruleKey: string
  titleEn: string
  titleAr: string
  cefr: Cefr
  category: 'nahw' | 'sarf' | 'balaghah'
  explanation: string
  detail: string
  mechanics?: string
  recognitionTip?: string
  transformations?: string[]
  exampleExplanation?: string
  confidence: number
  highlight: string
  unit: CanonicalUnit
}
export const asRecord = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
export const string = (value: unknown): string => (typeof value === 'string' ? value : '')
export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
export function cefr(value: unknown): Cefr | undefined {
  const normalized = string(value).toUpperCase()
  return CEFR_LEVELS.includes(normalized as Cefr) ? (normalized as Cefr) : undefined
}
