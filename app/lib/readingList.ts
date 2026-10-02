export interface ReadingListEntry { chapterSlug?: string; updatedAt?: string; hiddenFromList?: boolean; [key: string]: unknown }
export function parseReadingList(value: unknown): Record<string, ReadingListEntry> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([,entry]) => entry && typeof entry === 'object' && !Array.isArray(entry)))
}
export function hideReadingListEntry(value: unknown, slug: string): Record<string, ReadingListEntry> {
  const progress = parseReadingList(value)
  return progress[slug] ? { ...progress, [slug]: { ...progress[slug], hiddenFromList: true } } : progress
}
