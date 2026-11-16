/** A failed catalogue read must never become a cached empty result or 404. */
export function assertPublicRead(error: unknown, context: string): void {
  if (!error) return
  const diagnostic = error as { code?: string; message?: string }
  console.error(`[${context}] read failed`, { code: diagnostic.code, message: diagnostic.message })
  throw new Error('Unable to load this content. Please reload the page.')
}
