'use server'
import { z } from 'zod'
import { getAuthenticatedUserId } from '@/app/actions/auth'
import { enrichmentRpc } from '@/app/lib/contentEnrichment/service'
import { grammarTerminology } from '@/app/lib/grammarTerminology'
import { normalizeGrammarNote } from '@/app/lib/grammarNote'
import { serviceClient } from '@/app/lib/supabase'
import { assertPublicRead } from '@/app/lib/publicRead'
import type { RenderableGrammarNote } from '@/app/components/grammar/GrammarNoteRenderer'

/** Shared approved-note boundary; source visibility is resolved in the existing RPC. */
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
  return normalizeGrammarNote(row)
}

export async function fetchPublicGrammarNotes(filter: { level?: string; page?: number; episodeId?: string } = {}) {
  const input = z.object({ level: z.enum(['A1','A2','B1','B2','C1','C2']).optional(), page: z.number().int().min(0).max(10000).default(0), episodeId: z.string().uuid().optional() }).strict().parse(filter)
  let ids: string[] | undefined
  if (input.episodeId) {
    const { data, error } = await serviceClient.from('content_enrichment_examples' as never)
      .select('grammar_note_id').eq('source_kind', 'episode').eq('source_id', input.episodeId)
      .eq('active', true).eq('review_status', 'approved').not('grammar_note_id', 'is', null)
    assertPublicRead(error, 'episode grammar associations')
    ids = [...new Set((data as unknown as { grammar_note_id: string }[] ?? []).map(row => row.grammar_note_id))]
    if (!ids.length) return { notes: [], hasMore: false }
  }
  let query = serviceClient.from('grammar_notes' as never).select('id,title_en,title_ar,rule_cefr,status')
    .eq('status', 'approved').is('merged_into', null).order('title_en').order('id')
  if (input.level) query = query.eq('rule_cefr', input.level)
  if (ids) query = query.in('id', ids)
  const { data, error } = await query.range(input.page * 24, input.page * 24 + 24)
  assertPublicRead(error, 'public grammar notes')
  const rows = data as unknown as { id: string; title_en: string; title_ar: string; rule_cefr: string; status: string }[] ?? []
  return { notes: rows.slice(0, 24).filter(row => row.status === 'approved').map(row => ({ id: row.id, title_en: grammarTerminology(row.title_en), title_ar: row.title_ar ?? '', rule_cefr: row.rule_cefr })), hasMore: rows.length > 24 }
}
