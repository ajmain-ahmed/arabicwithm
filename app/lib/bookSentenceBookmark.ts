export const BOOK_SENTENCE_BOOKMARK_STORAGE_KEY = 'awm-book-sentence-bookmark-v1'
export const BOOK_SENTENCE_BOOKMARK_EVENT = 'awm-book-sentence-bookmark-change'

export interface BookSentenceBookmark {
  bookSlug: string
  bookTitle: string
  chapterSlug: string
  chapterTitle: string
  blockIndex: number
  arabic: string
  translation: string
  savedAt: string
}

export function parseBookSentenceBookmark(value: unknown): BookSentenceBookmark | null {
  let candidate = value

  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value)
    } catch {
      return null
    }
  }

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null

  const bookmark = candidate as Record<string, unknown>
  if (
    typeof bookmark.bookSlug !== 'string' || !bookmark.bookSlug.trim() ||
    typeof bookmark.bookTitle !== 'string' || !bookmark.bookTitle.trim() ||
    typeof bookmark.chapterSlug !== 'string' || !bookmark.chapterSlug.trim() ||
    typeof bookmark.chapterTitle !== 'string' || !bookmark.chapterTitle.trim() ||
    typeof bookmark.blockIndex !== 'number' || !Number.isInteger(bookmark.blockIndex) || bookmark.blockIndex < 0 ||
    typeof bookmark.arabic !== 'string' || !bookmark.arabic.trim() ||
    typeof bookmark.translation !== 'string' ||
    typeof bookmark.savedAt !== 'string' || Number.isNaN(Date.parse(bookmark.savedAt))
  ) {
    return null
  }

  return {
    bookSlug: bookmark.bookSlug,
    bookTitle: bookmark.bookTitle,
    chapterSlug: bookmark.chapterSlug,
    chapterTitle: bookmark.chapterTitle,
    blockIndex: bookmark.blockIndex,
    arabic: bookmark.arabic,
    translation: bookmark.translation,
    savedAt: bookmark.savedAt,
  }
}

export function latestBookSentenceBookmark(
  first: BookSentenceBookmark | null,
  second: BookSentenceBookmark | null,
): BookSentenceBookmark | null {
  if (!first) return second
  if (!second) return first
  return Date.parse(first.savedAt) >= Date.parse(second.savedAt) ? first : second
}

export function bookSentenceBookmarkHref(bookmark: BookSentenceBookmark): string {
  return `/books/${encodeURIComponent(bookmark.bookSlug)}/${encodeURIComponent(bookmark.chapterSlug)}#sentence-${bookmark.blockIndex}`
}
