/** The optional chapter-publication migration has not reached every deployment.
 * Retry only its exact missing-column error, retaining the existing Book gate.
 * Network, permissions and all other query failures remain failures. */
export async function readChapterPublication<T extends { error: unknown }>(
  query: (hasPublication: boolean) => PromiseLike<T>,
): Promise<T> {
  const result = await query(true)
  const error = result.error as { code?: string; message?: string } | null
  if (
    error &&
    ['42703', 'PGRST204'].includes(error.code ?? '') &&
    /(?:chapters\.)?is_published/i.test(error.message ?? '')
  )
    return query(false)
  return result
}

export function chapterPublished(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false
  const value = (row as { is_published?: unknown }).is_published
  return value === undefined || value === true
}
