// app/lib/display.ts — formatting helpers for POS, CEFR, etc.

/* Long-form membership date, e.g. "5 December 2026". Returns '' for missing
   or unparseable values so call sites can skip the line entirely. */
export function formatMembershipDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }).format(date)
}

export function formatCefr(cefr: string | undefined | null): string {
  return (cefr ?? "").trim().toUpperCase()
}

export function formatPos(pos: string | undefined | null): string {
  return (pos ?? "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}


