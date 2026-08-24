import { describe, expect, it } from 'vitest'
import { definitionCacheKey, nextExploreIndex, parseExploreSoundPreference } from './explore'

describe('Explore behavior helpers', () => {
  it('defaults sound on and preserves an explicit mute', () => {
    expect(parseExploreSoundPreference(null)).toBe(true)
    expect(parseExploreSoundPreference('sound')).toBe(true)
    expect(parseExploreSoundPreference('muted')).toBe(false)
  })

  it('advances to the next item and wraps once', () => {
    expect(nextExploreIndex(0, 3)).toBe(1)
    expect(nextExploreIndex(2, 3)).toBe(0)
    expect(nextExploreIndex(0, 1)).toBeNull()
  })

  it('keeps definition cache entries separate by context and entry type', () => {
    const word = { arabic: 'عَلَم', headword: 'علم', entry_type: 'word' as const }
    expect(definitionCacheKey('episode:a:line:1', word)).toBe('episode:a:line:1|word|علم')
    expect(definitionCacheKey('episode:b:line:1', word)).not.toBe(definitionCacheKey('episode:a:line:1', word))
    expect(definitionCacheKey('episode:a:line:1', { ...word, entry_type: 'phrase' })).not.toBe(definitionCacheKey('episode:a:line:1', word))
  })
})
