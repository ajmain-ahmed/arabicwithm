// @vitest-environment node
import { expect,it } from 'vitest'
import { formatCorrection,formatCorrectionCollection,orderedCorrections } from './correctionClipboard'
import type { BookCorrection } from './reviews'
const record:BookCorrection={id:'first',author_id:'private-author',parent_id:'private-book',target_id:'private-chapter',line_index:2,original_arabic:'  نَصّ الكتاب\nكما هو  ',comment:'Suggested wording\nSecond paragraph',status:'pending',created_at:'2026-10-03T12:00:00Z',admin_response:null}
it('copies only the exact original passage and comment, preserving whitespace and Arabic',()=>{
 expect(formatCorrection(record)).toBe('Original:\n  نَصّ الكتاب\nكما هو  \n\nSuggestion:\nSuggested wording\nSecond paragraph')
 expect(formatCorrection(record)).not.toContain('private-');expect(formatCorrection(record)).not.toContain(record.created_at)
})
it('uses a stored selected passage when supplied, rather than substituting the full line',()=>{
 expect(formatCorrection({...record,selected_text:'العبارة المحددة'})).toBe('Original:\nالعبارة المحددة\n\nSuggestion:\nSuggested wording\nSecond paragraph')
})
it('orders by line then creation time and retains multiple comments and source versions',()=>{
 const rows=[{...record,id:'late',line_index:25,comment:'Later page'}, {...record,id:'second',original_arabic:'Earlier version',created_at:'2026-10-03T12:01:00Z',comment:'Another comment'},record]
 expect(orderedCorrections(rows).map(row=>row.id)).toEqual(['first','second','late'])
 const copied=formatCorrectionCollection(rows)
 expect(copied).toBe(`### Correction 1\n\n${formatCorrection(record)}\n\n### Correction 2\n\n${formatCorrection(rows[1])}\n\n### Correction 3\n\n${formatCorrection(rows[0])}`)
 expect(rows[0].id).toBe('late')
})
it('reports an empty collection instead of overwriting the clipboard with blank output',()=>{
 expect(()=>formatCorrectionCollection([])).toThrow('no comments to copy')
})
