import type { ContentSuggestion, ReviewType, SuggestionStatus } from '@/app/lib/reviews'
import type { Json } from '@/app/lib/supabase/database.types'

export interface ReviewExportScope {
 type: ReviewType; parent: string; target?: string; status?: SuggestionStatus; author?: string; since?: string; until?: string
}
export interface ExportSuggestion extends ContentSuggestion { author_name?: string; unit_title: string }
export interface ReviewExportData {
 title: string; filename: string; type: ReviewType; suggestions: ExportSuggestion[]
}
// Keep arbitrary persisted fields, including legacy transcript objects and future metadata.
export function sourceEnvelope(type: ReviewType, parent: Record<string, Json | undefined>, units: Record<string, Json | undefined>[], single: boolean) {
 return { format: 'awm-persisted-source-v1', version: 'Current saved content; original upload formatting is not archived.', content_type: type,
  [type === 'book' ? 'book' : 'show']: parent,
  [type === 'book' ? 'chapters' : 'episodes']: single ? units.slice(0, 1) : units }
}
export function exportFilename(parent: string, unit?: string) {
 const clean = (text: string) => text.normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 90) || 'content'
 return [clean(parent), unit && clean(unit)].filter(Boolean).join('_')
}
// UTF-8 BOM supports spreadsheet Arabic. Quote every cell and neutralize spreadsheet formulas.
export function suggestionsCsv(data: ReviewExportData) {
 const cell = (value: unknown) => {
  let text = value == null ? '' : String(value)
  if (/^[\s]*[=+@-]/u.test(text) || /^[\t\r]/u.test(text)) text = "'" + text
  return `"${text.replace(/"/g, '""')}"`
 }
 const headings = ['Content type','Book / Show','Chapter / Episode','Line (1-based)','Original Arabic','Original English','Proposed Arabic','Proposed English','Comment','Reason','Author','Status','Submitted (UTC)','Admin response','Original block JSON','Reviewed replacement tokens JSON']
 const rows = data.suggestions.map(s => [data.type,data.title,s.unit_title,s.line_index+1,s.original_arabic,s.original_english,s.suggested_arabic,s.suggested_english,s.comment,s.reason,s.author_name ?? 'Reviewer',s.status,s.created_at,s.admin_response,JSON.stringify(s.original_block),s.suggested_tokens == null ? '' : JSON.stringify(s.suggested_tokens)])
 return '\ufeff' + [headings, ...rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'
}
