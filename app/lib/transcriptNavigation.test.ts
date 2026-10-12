import { describe, expect, it } from 'vitest'
import { transcriptOrigin, transcriptReturn, transcriptTime } from './transcriptNavigation'
describe('transcript route origins and timestamps',()=>{
  it('returns to explicit website context without browser history',()=>{
    expect(transcriptReturn('admin').href).toBe('/admin/transcripts')
    expect(transcriptReturn('explore').href).toBe('/explore')
    expect(transcriptReturn('search').href).toBe('/explore/search')
  })
  it('rejects arbitrary return destinations',()=>{
    expect(transcriptOrigin('https://example.com')).toBe('search')
    expect(transcriptOrigin(undefined)).toBe('search')
  })
  it('formats real millisecond timestamps',()=>{
    expect(transcriptTime(84200)).toBe('01:24')
    expect(transcriptTime(0)).toBe('00:00')
  })
})
