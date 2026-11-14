'use server'

import { z } from 'zod'
import { guardAdmin } from '@/app/actions/auth'
import { enrichmentRpc, enrichArabicContent } from '@/app/lib/contentEnrichment/service'
import { CEFR_LEVELS } from '@/app/lib/contentEnrichment/types'
import { grammarTerminology } from '@/app/lib/grammarTerminology'

const filterSchema = z.object({
  status: z.enum(['', 'candidate', 'approved', 'rejected']).default('candidate'),
  cefr: z.enum(['', ...CEFR_LEVELS]).default(''),
  category: z.enum(['', 'nahw', 'sarf', 'balaghah']).default(''),
  search: z.string().max(120).default(''),
  page: z.number().int().min(0).max(10000).default(0),
})
const noteSchema = z.object({
  id: z.string().uuid(),
  rule_key: z.string(),
  title_en: z.string(),
  title_ar: z.string(),
  rule_cefr: z.enum(CEFR_LEVELS),
  category: z.enum(['nahw', 'sarf', 'balaghah']),
  explanation: z.string(),
  detail: z.string(),
  mechanics: z.string().default(''),
  recognition_tip: z.string().default(''),
  transformations: z.array(z.string()).default([]),
  related_ids: z.array(z.string().uuid()).default([]),
  status: z.enum(['candidate', 'approved', 'rejected']),
  confidence: z.coerce.number(),
  example_count: z.coerce.number(),
  pending_examples: z.coerce.number().default(0),
})
const jobSchema = z.object({
  id: z.string().uuid(),
  source_kind: z.string(),
  source_id: z.string(),
  source_title: z.string(),
  analyser: z.string(),
  status: z.string(),
  error_code: z.string().nullable(),
  cursor: z.number(),
})
const dashboardSchema = z.object({
  notes: z.array(noteSchema),
  jobs: z.array(jobSchema),
  distribution: z.record(z.string(), z.coerce.number()),
  job_counts: z.record(z.string(), z.coerce.number()),
})
const exampleSchema = z.object({
  id: z.string().uuid(),
  arabic: z.string(),
  english: z.string(),
  explanation: z.string(),
  highlight: z.string(),
  source_title: z.string(),
  parent_title: z.string().nullable(),
  source_kind: z.string(),
  source_id: z.string(),
  source_url: z.string(),
  original_url: z.string().nullable(),
  source_timestamp: z.string().nullable(),
  example_cefr: z.string().nullable(),
  review_status: z.enum(['candidate', 'approved', 'rejected']),
  grammar_note_id: z.string().uuid(),
  source_order: z.number().default(0),
})
export type GrammarNote = z.infer<typeof noteSchema>
export type GrammarDashboard = z.infer<typeof dashboardSchema> & { providerConfigured: boolean }
export type GrammarExample = z.infer<typeof exampleSchema>

export async function fetchGrammarNotes(
  filter: z.input<typeof filterSchema> = {},
): Promise<GrammarDashboard> {
  await guardAdmin()
  const dashboard = dashboardSchema.parse(
    await enrichmentRpc('website_admin_grammar', {
      p_action: 'list',
      p_filter: filterSchema.parse(filter),
    }),
  )
  return {
    ...dashboard,
    providerConfigured: Boolean(
      process.env.CONTENT_ANALYSIS_URL && process.env.CONTENT_ANALYSIS_TOKEN,
    ),
  }
}
export async function fetchGrammarExamples(id: string, page = 0): Promise<GrammarExample[]> {
  await guardAdmin()
  z.string().uuid().parse(id)
  z.number().int().min(0).max(10000).parse(page)
  return z.array(exampleSchema).parse(
    await enrichmentRpc('website_admin_grammar', {
      p_action: 'examples',
      p_id: id,
      p_filter: { page },
    }),
  )
}
const editSchema = z
  .object({
    title_en: z.string().trim().min(3).max(240).optional(),
    title_ar: z.string().trim().min(2).max(240).optional(),
    rule_cefr: z.enum(CEFR_LEVELS).optional(),
    category: z.enum(['nahw', 'sarf', 'balaghah']).optional(),
    explanation: z.string().trim().min(20).max(2400).optional(),
    detail: z.string().max(4000).optional(),
    mechanics: z.string().max(4000).optional(),
    recognition_tip: z.string().max(2400).optional(),
    transformations: z.array(z.string().max(1000)).max(30).optional(),
    related_ids: z.array(z.string().uuid()).max(50).optional(),
    status: z.enum(['candidate', 'approved', 'rejected']).optional(),
    reviewed_examples: z.array(z.string().uuid()).max(1000).optional(),
  })
  .strict()
export async function editGrammarNote(
  id: string,
  fields: z.infer<typeof editSchema>,
): Promise<void> {
  await guardAdmin()
  const validated = editSchema.parse(fields)
  for (const field of [
    'title_en',
    'explanation',
    'detail',
    'mechanics',
    'recognition_tip',
  ] as const) {
    if (validated[field]) validated[field] = grammarTerminology(validated[field])
  }
  await enrichmentRpc('website_edit_canonical_grammar', {
    p_id: z.string().uuid().parse(id),
    p_fields: validated,
  })
}
export async function fetchGrammarRelatedIds(id: string): Promise<string[]> {
  await guardAdmin()
  return z
    .array(z.string().uuid())
    .parse(await enrichmentRpc('website_grammar_related', { p_id: z.string().uuid().parse(id) }))
}
export async function editGrammarExample(
  id: string,
  fields: { highlight: string; explanation: string; grammar_note_id: string },
): Promise<void> {
  await guardAdmin()
  const input = z
    .object({
      highlight: z.string().min(1).max(3000),
      explanation: z.string().max(4000),
      grammar_note_id: z.string().uuid(),
    })
    .strict()
    .parse(fields)
  await enrichmentRpc('website_edit_grammar_example', {
    p_id: z.string().uuid().parse(id),
    p_fields: { ...input, explanation: grammarTerminology(input.explanation) },
  })
}
export async function mergeGrammarNotes(source: string, target: string): Promise<void> {
  await guardAdmin()
  await enrichmentRpc('website_admin_grammar', {
    p_action: 'merge',
    p_id: z.string().uuid().parse(source),
    p_fields: { target: z.string().uuid().parse(target) },
  })
}
export async function reviewGrammarExample(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  await guardAdmin()
  await enrichmentRpc('website_admin_grammar', {
    p_action: 'example_status',
    p_id: z.string().uuid().parse(id),
    p_fields: { status: z.enum(['approved', 'rejected']).parse(status) },
  })
}
export async function retryContentEnrichment(id: string): Promise<void> {
  await guardAdmin()
  await enrichmentRpc('website_admin_grammar', {
    p_action: 'retry',
    p_id: z.string().uuid().parse(id),
  })
}
export async function scanContentEnrichment(mode: 'new' | 'all', after = '') {
  await guardAdmin()
  const result = await enrichmentRpc('website_scan_enrichment', {
    p_mode: z.enum(['new', 'all']).parse(mode),
    p_after: z.string().max(200).parse(after),
    p_limit: 100,
  })
  return z
    .object({ scanned: z.number(), queued: z.number(), after: z.string(), done: z.boolean() })
    .parse(result)
}
export async function processContentEnrichmentBatch() {
  await guardAdmin()
  return Promise.all([enrichArabicContent(), enrichArabicContent()])
}
