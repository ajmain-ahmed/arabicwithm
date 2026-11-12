/** Additive format detection. Token arrays always stay on the existing path. */
export type StructuredRecord = Record<string, unknown>
export type StructuredChapter = StructuredRecord & { schema_version: string; sections: unknown[] }
export type StructuredChapterResult =
  | { kind: 'structured'; chapter: StructuredChapter }
  | { kind: 'structured-error'; message: string }
  | { kind: 'legacy' }

export function record(value: unknown): StructuredRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as StructuredRecord : null
}
export function text(value: unknown): string { return typeof value === 'string' ? value : '' }
export function items(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }

export function detectChapterFormat(value: unknown): StructuredChapterResult {
  const chapter = record(value)
  // This discriminator is exclusive to the additional format, never a token array.
  if (!chapter || !('schema_version' in chapter) || !('sections' in chapter)) return { kind: 'legacy' }
  const version = text(chapter.schema_version).match(/^(\d+)\.(\d+)\.(\d+)(?:[-+][\w.-]+)?$/)
  if (!version) return { kind: 'structured-error', message: 'The structured chapter needs a valid schema version.' }
  if (Number(version[1]) !== 1) return { kind: 'structured-error', message: `Structured chapter schema ${text(chapter.schema_version)} is not supported yet. Please ask an administrator to review its version.` }
  if (!Array.isArray(chapter.sections)) return { kind: 'structured-error', message: 'The structured chapter sections must be a list.' }
  for (const field of ['activities', 'answers', 'references'] as const) {
    if (chapter[field] !== undefined && !Array.isArray(chapter[field])) return { kind: 'structured-error', message: `The structured chapter ${field} must be a list.` }
  }
  if (chapter.sections.length && !chapter.sections.some(section => Array.isArray(record(section)?.blocks))) return { kind: 'structured-error', message: 'The structured chapter has no readable section block lists.' }
  // Blocks are checked individually by the renderer, allowing partial recovery.
  return { kind: 'structured', chapter: chapter as StructuredChapter }
}

/** Runs alongside, never in place of, the existing token validator. */
export function validateAdditionalStructuredChapter(value: unknown): void {
  const result = detectChapterFormat(value)
  if (result.kind === 'structured-error') throw new Error(result.message)
}

export function structuredPageCount(chapter: StructuredChapter): number {
  return Math.max(1, chapter.sections.length) + ['activities', 'answers', 'references'].filter(key => items(chapter[key]).length > 0).length
}

/** Content links are never treated as markup or executable URL schemes. */
export function safeReferenceUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

export function structuredWarning(message: string): void {
  if (process.env.NODE_ENV === 'development') console.warn(`[structured chapter] ${message}`)
}
