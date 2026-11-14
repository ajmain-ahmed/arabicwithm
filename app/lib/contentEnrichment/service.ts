import 'server-only'
import { createHash } from 'node:crypto'
import { serviceClient } from '@/app/lib/supabase'
import { canonicalUnits } from './canonical'
import { authoredGrammar, validateGrammarOutput } from './grammar'
import { extractPhrases } from './phrases'
import { sourcePhraseGlosses } from '@/app/lib/dailyPhrase'
import { analysisProviderConfigured, requestGrammar } from './provider'
import { loadEnrichmentSource } from './sources'
import {
  asRecord,
  string,
  type Analyser,
  type CanonicalUnit,
  type EnrichmentSource,
  type SourceKind,
} from './types'

export async function enrichmentRpc(
  name: string,
  parameters: Record<string, unknown> = {},
): Promise<unknown> {
  const { data, error } = await serviceClient.rpc(name as never, parameters as never)
  if (error) throw new Error('enrichment_storage_unavailable')
  return data
}

async function grammarForChunk(units: CanonicalUnit[]) {
  if (!analysisProviderConfigured())
    return { notes: authoredGrammar(units), warning: 'analysis_provider_not_configured' }
  const indexed = units.map((unit, index) => ({ ...unit, key: `u${index}` }))
  const hash = createHash('sha256')
    .update(
      JSON.stringify({
        version: 'awm-grammar-v4',
        provider: process.env.CONTENT_ANALYSIS_URL,
        units: indexed.map(({ arabic, english, ruleHints, chapterRuleHints, explanation }) => ({
          arabic,
          english,
          ruleHints,
          chapterRuleHints,
          explanation,
        })),
      }),
    )
    .digest('hex')
  const cache = await enrichmentRpc('website_enrichment_cache', { p_hash: hash, p_result: null })
  let generated = cache
  let lease: unknown = null
  if (generated === null) {
    lease = await enrichmentRpc('website_claim_enrichment_analysis', { p_hash: hash })
    if (typeof lease !== 'string') throw new Error('analysis_in_progress')
    generated = await requestGrammar(indexed, hash)
  }
  if (generated === null)
    return { notes: authoredGrammar(units), warning: 'analysis_provider_not_configured' }
  const validated = validateGrammarOutput(generated, indexed)
  if (cache === null)
    await enrichmentRpc('website_enrichment_cache', {
      p_hash: hash,
      p_result: generated,
      p_lease: lease,
    })
  return {
    notes: validated.map((note) => ({ ...note, unit: units[Number(note.unit.key.slice(1))] })),
    warning: null,
  }
}

function provenance(source: EnrichmentSource, unit: CanonicalUnit) {
  return {
    unitKey: unit.key,
    sourceArabic: unit.arabic,
    sourceEnglish: unit.english,
    sourceTitle: source.title,
    parentId: source.parentId,
    parentTitle: source.parentTitle,
    sourceUrl: source.url,
    originalUrl: source.originalUrl,
    timestamp: unit.timestamp,
    exampleCefr: unit.exampleCefr,
    sourceOrder: unit.sourceOrder ?? 0,
    sourceExplanation: unit.explanation,
  }
}

/** Each claim processes one bounded chunk. Durable cursors survive restarts. */
export async function enrichArabicContent(): Promise<{
  processed: boolean
  analyser?: Analyser
  warning?: string
}> {
  const claimed = await enrichmentRpc('website_claim_enrichment')
  const job = Array.isArray(claimed) ? asRecord(claimed[0]) : null
  if (!job) return { processed: false }
  const jobId = string(job.id),
    lease = string(job.lease_id)
  const analyser = string(job.analyser) as Analyser
  try {
    const source = await loadEnrichmentSource(
      string(job.source_kind) as SourceKind,
      string(job.source_id),
    )
    if (!source) throw new Error('source_unavailable')
    const units = canonicalUnits(source)
    let end = Number(job.cursor),
      characters = 0
    while (end < units.length && end - Number(job.cursor) < 12) {
      const length =
        units[end].arabic.length +
        units[end].english.length +
        JSON.stringify([units[end].ruleHints, units[end].chapterRuleHints, units[end].explanation])
          .length
      if (characters + length > 18000 && end > Number(job.cursor)) break
      if (length > 18000) throw new Error('source_unit_too_large')
      characters += length
      end++
    }
    const chunk = units.slice(Number(job.cursor), end)
    let warning: string | null = null
    let items: Record<string, unknown>[]
    if (analyser === 'phrases') {
      items = extractPhrases(chunk).map((candidate) => ({
        ...candidate,
        wordGlosses: sourcePhraseGlosses(candidate.arabic, candidate.unit.tokens),
        unit: undefined,
        highlight: candidate.unit.arabic.includes(candidate.arabic)
          ? candidate.arabic
          : candidate.unit.arabic,
        ...provenance(source, candidate.unit),
      }))
    } else {
      const sentences = chunk.filter((unit) => unit.grammarEligible !== false)
      const result = sentences.length
        ? await grammarForChunk(sentences)
        : { notes: [], warning: null }
      warning = result.warning
      items = result.notes.map((candidate) => ({
        ...candidate,
        unit: undefined,
        ...provenance(source, candidate.unit),
      }))
    }
    if (JSON.stringify(items).length > 1000000) throw new Error('analysis_result_too_large')
    const committed = await enrichmentRpc('website_commit_enrichment', {
      p_job: jobId,
      p_lease: lease,
      p_cursor: end,
      p_done: end >= units.length,
      p_items: items,
      p_warning: warning,
    })
    if (committed !== true)
      return { processed: false, analyser, warning: 'source_changed_or_lease_expired' }
    return { processed: true, analyser, warning: warning ?? undefined }
  } catch (error) {
    const code =
      error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : 'analysis_failed'
    await enrichmentRpc('website_fail_enrichment', { p_job: jobId, p_lease: lease, p_error: code })
    return { processed: false, analyser, warning: code }
  }
}
