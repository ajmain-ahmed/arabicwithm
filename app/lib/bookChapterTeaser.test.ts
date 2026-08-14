import { describe, expect, it } from 'vitest'
import { extractChapterTeaser } from './bookChapterTeaser'

describe('extractChapterTeaser', () => {
  it('selects a substantial sentence from the saved chapter', () => {
    expect(extractChapterTeaser([
      { translation: 'A short opening.' },
      { translation: 'The stranger stopped at the doorway, as though he already knew what waited inside.' },
    ])).toBe('The stranger stopped at the doorway, as though he already knew what waited inside.')
  })

  it('normalizes whitespace and safely shortens long excerpts', () => {
    const teaser = extractChapterTeaser([{ translation: `  ${'mystery '.repeat(30)}  ` }])
    expect(teaser?.endsWith('…')).toBe(true)
    expect(teaser?.length).toBeLessThanOrEqual(171)
    expect(teaser).not.toContain('  ')
  })

  it('returns no teaser for malformed or untranslated content', () => {
    expect(extractChapterTeaser(null)).toBeUndefined()
    expect(extractChapterTeaser([{ tokens: [] }])).toBeUndefined()
  })
})
