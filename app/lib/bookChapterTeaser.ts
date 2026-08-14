const MAX_TEASER_LENGTH = 170

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function shortenAtWord(text: string): string {
  if (text.length <= MAX_TEASER_LENGTH) return text

  const shortened = text.slice(0, MAX_TEASER_LENGTH + 1)
  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastSpace > 110 ? lastSpace : MAX_TEASER_LENGTH).trimEnd()}…`
}

/** Picks a substantial translated sentence from a chapter for progress cards. */
export function extractChapterTeaser(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined

  const translations = content
    .map((block) => block && typeof block === 'object' && !Array.isArray(block)
      ? cleanText((block as Record<string, unknown>).translation)
      : '')
    .filter(Boolean)

  const teaser = translations.find((translation) => translation.length >= 45) ?? translations[0]
  return teaser ? shortenAtWord(teaser) : undefined
}
