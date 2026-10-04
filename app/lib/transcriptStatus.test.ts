import { describe, expect, it } from 'vitest'
import type { TranscriptRow } from '@/app/actions/transcripts'
import { transcriptGenerationStatus, transcriptGenerationPending } from './transcriptStatus'
describe('generation progress and provider errors',()=>{
  const row={website_generation:true,status:'ready',translation_status:'queued',searchable:false,error_code:null} as TranscriptRow
  it('does not describe saved Arabic alone as ready',()=>{
    expect(transcriptGenerationPending(row)).toBe(true)
    expect(transcriptGenerationStatus(row)).toBe('Generating English translation')
    expect(transcriptGenerationStatus({...row,translation_status:'ready',searchable:true})).toBe('Ready')
  })
  it('surfaces a provider plan failure and incomplete translation clearly',()=>{
    expect(transcriptGenerationStatus({...row,error_code:'provider_upgrade_required'})).toContain('Supadata requires a plan or credit upgrade')
    expect(transcriptGenerationStatus({...row,translation_status:'partial'})).toContain('has not been published')
  })
})
