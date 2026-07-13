// app/lib/display.ts — formatting helpers for POS, CEFR, etc.

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

export function formatConjugationType(type: string | undefined | null): string {
  return formatPos(type)
}
