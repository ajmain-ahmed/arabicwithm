import { expect, it } from 'vitest'
import { buildContinueReadingItems } from './continueReadingItems'
import type { PublicBook, PublicChapter } from '@/app/actions/books'
import type { ReadingPosition } from '@/store/readingProgressStore'

const books = [
  { id: 'b1', slug: 'alpha', title: 'Alpha', level: 'A1', coverCrop: { x: 50, y: 50, zoom: 1 } },
  { id: 'b2', slug: 'beta', title: 'Beta', level: 'B1', coverCrop: { x: 50, y: 50, zoom: 1 } },
] as unknown as PublicBook[]
const chapters: Record<string, PublicChapter[]> = {
  alpha: [{ id: 'c1', slug: 'one', title: 'One', chapterNumber: 1, blockCount: 0 }],
  beta: [{ id: 'c2', slug: 'two', title: 'Two', chapterNumber: 2, blockCount: 0 }],
}
const position = (page: number, updatedAt: string): ReadingPosition => ({ chapterSlug: 'one', page, totalPages: 9, updatedAt })

it('includes only books past the first page, newest first, deep-linked to the page', () => {
  const items = buildContinueReadingItems(books, chapters, {
    alpha: position(4, '2026-10-20T10:00:00Z'),
    beta: { chapterSlug: 'two', page: 2, totalPages: 5, updatedAt: '2026-10-25T10:00:00Z' },
  }, {})
  expect(items.map((item) => item.href)).toEqual([
    '/books/beta/two?page=2',
    '/books/alpha/one?page=4',
  ])
  expect(items[0].meta).toBe('Page 2 of 5')
})

it('excludes page-1 positions and books/chapters that no longer exist', () => {
  const items = buildContinueReadingItems(books, chapters, {
    alpha: position(1, '2026-10-25T10:00:00Z'),
    gone: { chapterSlug: 'one', page: 3, totalPages: 5, updatedAt: '2026-10-25T10:00:00Z' },
    beta: { chapterSlug: 'missing', page: 3, totalPages: 5, updatedAt: '2026-10-25T10:00:00Z' },
  }, {})
  expect(items).toEqual([])
})

it('live session positions win over the metadata snapshot', () => {
  const items = buildContinueReadingItems(books, chapters, {
    alpha: position(3, '2026-10-25T10:00:00Z'),
  }, {
    alpha: position(7, '2026-10-26T09:00:00Z'),
  })
  expect(items[0].href).toBe('/books/alpha/one?page=7')
})
