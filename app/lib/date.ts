// app/lib/date.ts — centralized date formatting.

const DEFAULT_LOCALE = "en-GB"

export function formatDate(
  date: string | number | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  return new Date(date).toLocaleDateString(DEFAULT_LOCALE, options)
}

export function formatDateShort(date: string | number | Date): string {
  return new Date(date).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short" })
}

export function formatMonthYear(date: string | number | Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 5) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDateShort(date)
}
