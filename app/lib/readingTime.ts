export function normalizeReadingTimeMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) return null
  return Math.round(minutes)
}

export function formatReadingTime(minutes: number): string {
  const wholeMinutes = Math.max(1, Math.round(minutes))
  if (wholeMinutes < 60) return `${wholeMinutes} min read`

  const hours = Math.floor(wholeMinutes / 60)
  const remainder = wholeMinutes % 60
  return remainder === 0 ? `${hours} hr read` : `${hours} hr ${remainder} min read`
}
