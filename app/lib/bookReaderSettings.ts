export const DEFAULT_BOOK_TEXT_SCALE = 1
export const MIN_BOOK_TEXT_SCALE = 0.8
export const MAX_BOOK_TEXT_SCALE = 1.3
export const BOOK_TEXT_SCALE_STEP = 0.1

export function normalizeBookTextScale(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_BOOK_TEXT_SCALE

  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return DEFAULT_BOOK_TEXT_SCALE

  const clampedValue = Math.min(MAX_BOOK_TEXT_SCALE, Math.max(MIN_BOOK_TEXT_SCALE, numericValue))
  return Math.round(clampedValue * 10) / 10
}
