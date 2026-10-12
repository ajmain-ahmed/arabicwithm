// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
  fetchEpisodeMetas: vi.fn(),
  fetchEpisode: vi.fn(),
  fetchBookMetas: vi.fn(),
  fetchBookPages: vi.fn(),
}))

vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: mocks.getAuthenticatedUserId }))
vi.mock('@/app/actions/cartoons', () => ({
  fetchExploreEpisodeMetasForPublic: mocks.fetchEpisodeMetas,
  fetchExploreEpisodeByIdPublic: mocks.fetchEpisode,
}))
vi.mock('@/app/actions/books', () => ({
  fetchExploreBookChapterMetasForPublic: mocks.fetchBookMetas,
  fetchExploreBookChapterPages: mocks.fetchBookPages,
}))
vi.mock('@/app/lib/supabase', () => ({
  serviceClient: { rpc: vi.fn(), from: vi.fn() },
}))

import { fetchPuzzleVocabulary } from './puzzles'

const episodeId = '11111111-1111-4111-8111-111111111111'
const chapterId = '22222222-2222-4222-8222-222222222222'
const vocabulary = [
  ['كِتَابٌ', 'كتاب', 'book', 'noun'],
  ['مَدْرَسَةٌ', 'مدرسة', 'school', 'noun'],
  ['جَمِيلٌ', 'جميل', 'beautiful', 'adjective'],
  ['سَرِيعٌ', 'سريع', 'fast', 'adjective'],
] as const

function words() {
  return vocabulary.map(([arabic, headword, english, pos]) => ({
    arabic,
    plain: headword,
    transliteration: '',
    english,
    headword,
    pos,
    cefr: 'a1',
  }))
}

describe('Word Search source selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchEpisodeMetas.mockResolvedValue([])
    mocks.fetchBookMetas.mockResolvedValue([])
    mocks.fetchBookPages.mockResolvedValue([])
  })

  it('builds a puzzle source from an episode transcript for signed-out users', async () => {
    mocks.getAuthenticatedUserId.mockResolvedValue(null)
    mocks.fetchEpisodeMetas.mockResolvedValue([{
      id: episodeId,
      slug: 'first-episode',
      title: 'First Episode',
      level: 'A1',
      tags: [],
      showSlug: 'sample-show',
      showTitle: 'Sample Show',
    }])
    mocks.fetchEpisode.mockResolvedValue({
      id: episodeId,
      transcriptLines: [{
        timestamp: 12,
        arabic: 'كِتَابٌ مَدْرَسَةٌ جَمِيلٌ سَرِيعٌ',
        arabicPlain: 'كتاب مدرسة جميل سريع',
        translation: 'A beautiful book reaches the school quickly.',
        words: words(),
      }],
    })

    const source = await fetchPuzzleVocabulary()

    expect(source).toMatchObject({
      type: 'episode',
      id: episodeId,
      title: 'Sample Show',
      subtitle: 'First Episode',
      href: '/cartoons/sample-show/first-episode',
    })
    expect(source?.words).toHaveLength(4)
    expect(source?.words[0].context).toMatchObject({ timestamp: 12 })
    expect(mocks.fetchBookMetas).not.toHaveBeenCalled()
  })

  it('builds a puzzle source from an authenticated book chapter with source context', async () => {
    mocks.getAuthenticatedUserId.mockResolvedValue('33333333-3333-4333-8333-333333333333')
    mocks.fetchBookMetas.mockResolvedValue([{
      bookId: '44444444-4444-4444-8444-444444444444',
      chapterId,
      bookSlug: 'sample-book',
      bookTitle: 'Sample Book',
      chapterSlug: 'chapter-one',
      chapterTitle: 'The Beginning',
      chapterNumber: 1,
      level: 'A1',
    }])
    mocks.fetchBookPages.mockResolvedValue([{
      id: 'page-1',
      bookSlug: 'sample-book',
      bookTitle: 'Sample Book',
      chapterSlug: 'chapter-one',
      chapterTitle: 'The Beginning',
      chapterNumber: 1,
      pageNumber: 1,
      level: 'A1',
      blocks: [{
        words: words(),
        translation: 'A beautiful book reaches the school quickly.',
        paragraphNumber: 7,
      }],
    }])

    const source = await fetchPuzzleVocabulary()

    expect(source).toMatchObject({
      type: 'book',
      id: chapterId,
      bookId: '44444444-4444-4444-8444-444444444444',
      chapterNumber: 1,
      title: 'Sample Book',
      subtitle: 'Chapter 1: The Beginning',
      href: '/books/sample-book/chapter-one',
    })
    expect(source?.words).toHaveLength(4)
    expect(source?.words.every((word) => word.context?.chapterNumber === 1)).toBe(true)
    expect(source?.words.every((word) => word.context?.paragraphNumber === 7)).toBe(true)
  })
})
