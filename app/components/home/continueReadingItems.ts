import type { PublicBook, PublicChapter } from '@/app/actions/books'
import { READING_TRACK_MIN_PAGE, parseStoredPositions, type ReadingPosition } from '@/store/readingProgressStore'
import type { CatalogueRowItem } from './NewOnRow'

/* Homepage "Continue Reading" row: every book the reader has gone past the
   first page of, most recently read first. Metadata and live session
   positions are merged (session wins) so the first paint already has data. */
export function buildContinueReadingItems(
  books: PublicBook[],
  chaptersByBook: Record<string, PublicChapter[]>,
  metadataPositions: Record<string, ReadingPosition>,
  sessionPositions: Record<string, ReadingPosition>,
): CatalogueRowItem[] {
  const positions = { ...metadataPositions, ...sessionPositions }
  return Object.entries(positions)
    .filter(([, position]) => position.page >= READING_TRACK_MIN_PAGE)
    .flatMap(([bookSlug, position]) => {
      const book = books.find((candidate) => candidate.slug === bookSlug)
      const chapter = chaptersByBook[bookSlug]?.find((candidate) => candidate.slug === position.chapterSlug)
      if (!book || !chapter) return []
      const item: CatalogueRowItem = {
        key: book.id,
        href: `/books/${encodeURIComponent(bookSlug)}/${encodeURIComponent(position.chapterSlug)}?page=${position.page}${position.blockIndex!==undefined?`&block=${position.blockIndex}`:''}`,
        title: book.title,
        meta: `Page ${position.page} of ${position.totalPages}`,
        level: book.level,
        imageSrc: `/api/covers/books/${book.id}`,
        imageCrop: book.coverCrop,
      }
      return [{ item, updatedAt: position.updatedAt }]
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(({ item }) => item)
}

export function metadataReadingPositions(metadata: Record<string, unknown>): Record<string, ReadingPosition> {
  return parseStoredPositions(metadata)
}
