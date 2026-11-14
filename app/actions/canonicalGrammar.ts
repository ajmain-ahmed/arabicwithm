'use server'
import { z } from 'zod'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { enrichmentRpc } from '@/app/lib/contentEnrichment/service'
import { grammarTerminology } from '@/app/lib/grammarTerminology'
import type { RenderableGrammarNote } from '@/app/components/grammar/GrammarNoteRenderer'

/** Shared read boundary for future Episode, Learn, Memory and Book consumers. */
export async function fetchCanonicalGrammarNote(
  id: string,
  filter: {
    kind?: 'chapter' | 'episode' | 'transcript' | 'vocabulary'
    sourceId?: string
    page?: number
  } = {},
): Promise<RenderableGrammarNote | null> {
  const input = z
    .object({
      kind: z.enum(['chapter', 'episode', 'transcript', 'vocabulary']).optional(),
      sourceId: z.string().max(100).optional(),
      page: z.number().int().min(0).max(10000).optional(),
    })
    .strict()
    .parse(filter)
  const userId = await getAuthenticatedUserId()
  const row = (await enrichmentRpc('website_read_canonical_grammar', {
    p_id: z.string().uuid().parse(id),
    p_signed_in: Boolean(userId),
    p_kind: input.kind ?? null,
    p_source: input.sourceId ?? null,
    p_page: input.page ?? 0,
  })) as (RenderableGrammarNote & { related_ids: string[] }) | null
  if (!row || row.status !== 'approved') return null
  return {
    ...row,
    title_en: grammarTerminology(row.title_en),
    explanation: grammarTerminology(row.explanation),
    detail: grammarTerminology(row.detail),
    mechanics: grammarTerminology(row.mechanics ?? ''),
    recognition_tip: grammarTerminology(row.recognition_tip ?? ''),
    transformations: row.transformations?.map(grammarTerminology),
    examples: row.examples?.map((example) => ({
      ...example,
      explanation: grammarTerminology(example.explanation),
    })),
  }
}
