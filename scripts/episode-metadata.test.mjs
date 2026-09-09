import { describe, expect, it } from 'vitest'
import { missingMetadataPatch } from './episode-metadata.mjs'
describe('metadata backfill', () => {
  const transcript = [{ translation: 'My father is going to school.' }]
  it('preserves good existing metadata', () => expect(missingMetadataPatch({ description: 'Existing', tags: ['Reviewed'], transcript })).toBeNull())
  it('fills only missing fields', () => expect(missingMetadataPatch({ description: 'Existing', tags: [], transcript })).toEqual({ tags: ['Family', 'School'] }))
  it('skips missing or unusable scripts', () => { expect(missingMetadataPatch({ transcript: [] })).toBeNull(); expect(missingMetadataPatch({ transcript: null })).toBeNull() })
  it('is idempotent', () => { const original = { transcript }; const patch = missingMetadataPatch(original); expect(missingMetadataPatch({ ...original, ...patch })).toBeNull() })
})
