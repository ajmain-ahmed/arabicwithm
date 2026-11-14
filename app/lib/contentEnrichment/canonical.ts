import {
  asRecord,
  cefr,
  list,
  string,
  type CanonicalUnit,
  type EnrichmentSource,
  type JsonRecord,
} from './types'
import { parseJsonb } from '@/app/lib/jsonb'

const hasArabic = (value: string) => /[\u0621-\u064a]/u.test(value)

/** Explicit format adapters keep administrative JSON and answer keys out. */
export function canonicalUnits(source: EnrichmentSource): CanonicalUnit[] {
  source = { ...source, content: parseJsonb(source.content) }
  const units: CanonicalUnit[] = []
  const rootMetadata = asRecord(source.content)
  const chapterRuleHints = rootMetadata?.schema_version
    ? [string(rootMetadata.title_ar), string(rootMetadata.title_en)].filter(Boolean)
    : []
  function add(
    value: JsonRecord,
    key: string,
    hints: string[] = [],
    authoredLessonExample = false,
  ) {
    const tokens = list(value.tokens ?? value.words).flatMap((token) =>
      asRecord(token) ? [asRecord(token)!] : [],
    )
    const tokenArabic = tokens
      .map((token) => `${string(token.prefix)}${string(token.arabic)}${string(token.suffix)}`)
      .join(' ')
    const punctuation = string(value.punctuation)
    const displayedArabic =
      tokenArabic + (punctuation && !tokenArabic.endsWith(punctuation) ? punctuation : '')
    const arabic =
      source.language === 'en'
        ? string(value.translation)
        : string(value.arabic ?? value.ar_di ?? value.text_ar ?? value.arabicDiacritic) ||
          displayedArabic
    if (!hasArabic(arabic) || /https?:\/\//i.test(arabic)) return
    const english =
      source.language === 'en'
        ? tokens.map((token) => string(token.english)).join(' ')
        : string(value.translation ?? value.english ?? value.en ?? value.translation_en)
    const annotations = list(value.analysis ?? value.segments).flatMap((entry) =>
      asRecord(entry) ? [asRecord(entry)!] : [],
    )
    const roles = annotations
      .flatMap((entry) => [string(entry.role_ar), string(entry.role_en)])
      .filter(Boolean)
    const targets = annotations
      .filter(
        (entry) =>
          ['governor', 'raised-subject'].includes(string(entry.highlight_key)) ||
          /صفة مشبهة عاملة|^فاعل(?: |$)/u.test(normalizePhrase(string(entry.role_ar))),
      )
      .map((entry) => string(entry.text_ar))
      .filter((part) => part && arabic.includes(part))
    const start = targets.length ? Math.min(...targets.map((part) => arabic.indexOf(part))) : -1
    const end = targets.length
      ? Math.max(...targets.map((part) => arabic.indexOf(part) + part.length))
      : -1
    units.push({
      key,
      sourceOrder: units.length,
      arabic,
      english,
      tokens: source.language === 'en' ? [] : tokens,
      timestamp: value.timestamp == null ? undefined : String(value.timestamp),
      exampleCefr: cefr(value.cefr ?? source.level),
      ruleHints: [...hints, ...roles, ...list(value.grammar_rules).map(string)].filter(Boolean),
      authoredLessonExample,
      chapterRuleHints,
      explanation: string(value.explanation_en),
      authoredHighlight: start >= 0 ? arabic.slice(start, end) : undefined,
    })
  }
  function blocks(values: unknown[], prefix: string, hints: string[] = [], depth = 0) {
    if (depth > 20) return
    values.forEach((raw, index) => {
      const block = asRecord(raw)
      if (!block) return
      const key = `${prefix}/${string(block.id) || index}`
      const type = string(block.type)
      if (type === 'collapsible') blocks(list(block.content), key, hints, depth + 1)
      else if (['example', 'paragraph'].includes(type)) add(block, key, hints, type === 'example')
      else if (type === 'highlighted-sentence') {
        const arabic = list(block.segments)
          .map((segment) => string(asRecord(segment)?.text_ar))
          .join(' ')
        add({ ...block, arabic }, key, hints, true)
      }
      // Tables and diagram labels often contain fragments or reconstructions.
      // Only explicit example blocks are admitted as grammar source sentences.
    })
  }
  const root = asRecord(source.content)
  if (source.kind === 'vocabulary' && root) {
    list(root.examples).forEach((raw, index) => {
      const example = asRecord(raw)
      if (example)
        add({ arabic: example.ar_di ?? example.ar, english: example.en }, `example/${index}`)
    })
    const arabic = string(root.word_di)
    const meanings = [
      ...new Set(
        list(root.definitions)
          .map((value) => string(asRecord(value)?.direct_english))
          .filter(Boolean),
      ),
    ]
    if (
      hasArabic(arabic) &&
      normalizePhrase(arabic).split(' ').length > 1 &&
      !/[/\\|…()\[\]]|[ـ…]$/u.test(arabic) &&
      meanings.length === 1 &&
      string(root.word_tr)
    ) {
      units.push({
        key: 'lexical-entry',
        arabic,
        english: meanings[0],
        tokens: [
          { arabic, english: meanings[0], transliteration: root.word_tr, entry_type: 'phrase' },
        ],
        exampleCefr: cefr(root.level),
        ruleHints: [],
        grammarEligible: false,
      })
    }
    return units
  }
  if (root?.schema_version && Array.isArray(root.sections)) {
    root.sections.forEach((raw, index) => {
      const section = asRecord(raw)
      if (!section) return
      const hints = [string(section.title_ar), string(section.title_en)]
      blocks(list(section.blocks), `section/${string(section.id) || index}`, hints)
    })
    list(root.activities).forEach((raw, index) => {
      const activity = asRecord(raw)
      const stimulus = string(activity?.stimulus_ar)
      if (stimulus && !stimulus.includes('{{')) add({ arabic: stimulus }, `activity/${index}`)
    })
    return units
  }
  const content = Array.isArray(source.content)
    ? source.content
    : list(root?.content ?? root?.scriptBlocks ?? root?.segments)
  content.forEach((raw, index) => {
    const block = asRecord(raw)
    if (block) add(block, source.unitKeys?.[index] ?? `sentence/${index}`)
  })
  return units
}

export function normalizePhrase(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/(^|\s)و\s+(?=[\u0621-\u064a])/gu, '$1و')
}
