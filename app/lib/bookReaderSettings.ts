export const DEFAULT_BOOK_TEXT_SCALE = 1
export const MIN_BOOK_TEXT_SCALE = 0.8
export const MAX_BOOK_TEXT_SCALE = 1.3
export const BOOK_TEXT_SCALE_STEP = 0.1
export const BOOK_READER_FONTS = ['naskh', 'sans', 'amiri'] as const
export type BookReaderFont = (typeof BOOK_READER_FONTS)[number]
export const DEFAULT_BOOK_READER_FONT: BookReaderFont = 'naskh'

export function normalizeBookTextScale(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_BOOK_TEXT_SCALE

  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return DEFAULT_BOOK_TEXT_SCALE

  const clampedValue = Math.min(MAX_BOOK_TEXT_SCALE, Math.max(MIN_BOOK_TEXT_SCALE, numericValue))
  return Math.round(clampedValue * 10) / 10
}

export function normalizeBookReaderFont(value: unknown): BookReaderFont {
  return typeof value === 'string' && BOOK_READER_FONTS.includes(value as BookReaderFont)
    ? value as BookReaderFont
    : DEFAULT_BOOK_READER_FONT
}
