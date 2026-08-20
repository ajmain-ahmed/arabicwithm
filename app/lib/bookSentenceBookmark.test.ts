import { describe, expect, it } from 'vitest'
import {
  bookSentenceBookmarkHref,
  latestBookSentenceBookmark,
  parseBookSentenceBookmark,
} from './bookSentenceBookmark'

const bookmark = {
  bookSlug: 'graded-reader',
  bookTitle: 'Graded Reader',
  chapterSlug: 'chapter-one',
  chapterTitle: 'Chapter One',
  blockIndex: 3,
  arabic: 'هَذِهِ جُمْلَةٌ.',
  translation: 'This is a sentence.',
  savedAt: '2026-08-20T12:00:00.000Z',
}

describe('book sentence bookmarks', () => {
  it('parses valid objects and JSON strings', () => {
    expect(parseBookSentenceBookmark(bookmark)).toEqual(bookmark)
    expect(parseBookSentenceBookmark(JSON.stringify(bookmark))).toEqual(bookmark)
  })

  it('rejects incomplete or invalid bookmarks', () => {
    expect(parseBookSentenceBookmark('{broken')).toBeNull()
    expect(parseBookSentenceBookmark({ ...bookmark, blockIndex: -1 })).toBeNull()
    expect(parseBookSentenceBookmark({ ...bookmark, arabic: '' })).toBeNull()
  })

  it('selects the newest bookmark and builds its sentence link', () => {
    const newer = { ...bookmark, blockIndex: 4, savedAt: '2026-08-21T12:00:00.000Z' }
    expect(latestBookSentenceBookmark(bookmark, newer)).toEqual(newer)
    expect(bookSentenceBookmarkHref(newer)).toBe('/books/graded-reader/chapter-one#sentence-4')
  })
})
