import type { RenderableGrammarNote } from '@/app/components/grammar/GrammarNoteRenderer'
import { grammarTerminology } from '@/app/lib/grammarTerminology'

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown) => typeof value === 'string' ? value : ''

/** Optional legacy fields are normalized at the read boundary, without writing content. */
export function normalizeGrammarNote(value: unknown): RenderableGrammarNote | null {
  const row = record(value)
  if (row.status !== 'approved' || typeof row.id !== 'string') return null
  return {
    id: row.id, status: 'approved', title_en: grammarTerminology(text(row.title_en)),
    title_ar: text(row.title_ar), rule_cefr: text(row.rule_cefr),
    explanation: grammarTerminology(text(row.explanation)), detail: grammarTerminology(text(row.detail)),
    mechanics: grammarTerminology(text(row.mechanics)), recognition_tip: grammarTerminology(text(row.recognition_tip)),
    transformations: Array.isArray(row.transformations) ? row.transformations.filter((v): v is string => typeof v === 'string').map(grammarTerminology) : [],
    related_ids: Array.isArray(row.related_ids) ? row.related_ids.filter((v): v is string => typeof v === 'string') : [],
    examples: (Array.isArray(row.examples) ? row.examples : []).flatMap((value, index) => {
      const example = record(value)
      if (!text(example.arabic)) return []
      return [{ id: text(example.id) || `example-${index}`, arabic: text(example.arabic),
        english: text(example.english), highlight: text(example.highlight), explanation: grammarTerminology(text(example.explanation)),
        source_title: text(example.source_title), parent_title: text(example.parent_title),
        source_timestamp: text(example.source_timestamp), example_cefr: text(example.example_cefr) }]
    }),
  }
}
