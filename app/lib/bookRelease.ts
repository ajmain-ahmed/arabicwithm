import { serviceClient } from '@/app/lib/supabase'

/** Uncached content boundary: an already-open route or cached payload must not
 * bypass a book that Admin has moved back to preparation. Metadata stays public. */
export async function isBookReleased(bookId: string): Promise<boolean> {
  const { data, error } = await serviceClient.from('books').select('*').eq('id', bookId).maybeSingle()
  if (error) throw new Error('Unable to check book availability.')
  return Boolean(data && data.is_completed !== false)
}

export async function isChapterReleased(chapterId: string): Promise<boolean> {
  const { data, error } = await serviceClient.from('chapters').select('book_id').eq('id', chapterId).maybeSingle()
  if (error) throw new Error('Unable to check book availability.')
  return Boolean(data && await isBookReleased(String(data.book_id)))
}

export async function releasedBookIds(bookIds: string[]): Promise<string[]> {
  const released: string[] = []
  for (let start = 0; start < bookIds.length; start += 100) {
    const { data, error } = await serviceClient.from('books').select('*').in('id', bookIds.slice(start, start + 100))
    if (error) throw new Error('Unable to check book availability.')
    released.push(...(data ?? []).filter(book => book.is_completed !== false).map(book => String(book.id)))
  }
  return released
}

export async function releasedChapterIds(chapterIds: string[]): Promise<string[]> {
  if (!chapterIds.length) return []
  const { data, error } = await serviceClient.from('chapters').select('id,book_id').in('id', chapterIds)
  if (error) throw new Error('Unable to check book availability.')
  const books = new Set(await releasedBookIds([...new Set((data ?? []).map(chapter => String(chapter.book_id)))]))
  return (data ?? []).filter(chapter => books.has(String(chapter.book_id))).map(chapter => String(chapter.id))
}
