import {describe,it,expect} from 'vitest'
import type {TranscriptRow} from '@/app/actions/transcripts'
import {isAppImport,isAppImportsGroup,hasDownloadableTranscript,canEditTranscript} from './appImportTranscripts'
import {transcriptGenerationStatus} from './transcriptStatus'
const row={source_origin:'user_import',provider:'gemini',status:'ready',has_saved_transcript:true,can_edit:true,searchable:false} as TranscriptRow
describe('automatic Imports capability rules',()=>{
 it('uses canonical origin/key rather than provider, title or group name',()=>{
  expect(isAppImport(row)).toBe(true)
  expect(isAppImport({...row,source_origin:'website_admin_transcript'})).toBe(false)
  expect(isAppImportsGroup({id:'id',system_key:'app_imports'})).toBe(true)
  expect(isAppImportsGroup({id:'id',system_key:null})).toBe(false)
 })
 it.each(['queued','processing','indexing','failed'])('keeps %s diagnostics without completed transcript actions',status=>{
  expect(hasDownloadableTranscript({...row,status})).toBe(false);expect(canEditTranscript({...row,status})).toBe(false)
 })
 it('offers normal actions only for saved JSON and applicable edit capability',()=>{
  expect(hasDownloadableTranscript(row)).toBe(true);expect(canEditTranscript(row)).toBe(true)
  expect(hasDownloadableTranscript({...row,has_saved_transcript:false})).toBe(false)
  expect(canEditTranscript({...row,can_edit:false})).toBe(false)
 })
 it('does not call Gemini failures Supadata failures',()=>{
  expect(transcriptGenerationStatus({...row,status:'failed',error_code:'request_uncertain'})).toContain('Gemini')
  expect(transcriptGenerationStatus({...row,status:'failed',error_code:'request_uncertain'})).not.toContain('Supadata')
 })
})
