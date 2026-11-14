import { readChapterPublication, chapterPublished } from '@/app/lib/chapterPublicationRead'
import { serviceClient } from '@/app/lib/supabase'

/** Uncached content boundary: an already-open route or cached payload must not
 * bypass a book that Admin has moved back to preparation. Metadata stays public. */
export async function isBookReleased(bookId: string): Promise<boolean> {
  const { data, error } = await serviceClient.from('books').select('*').eq('id', bookId).maybeSingle()
  if (error) throw new Error('Unable to check book availability.')
  return Boolean(data && data.is_completed !== false)
}

export async function isChapterReleased(chapterId: string): Promise<boolean> {
  const { data, error } = await readChapterPublication(published => serviceClient.from('chapters').select(published ? 'book_id,is_published' : 'book_id').eq('id', chapterId).maybeSingle())
  if (error) throw new Error('Unable to check book availability.')
  return Boolean(data && chapterPublished(data) && await isBookReleased(String((data as unknown as { book_id: string }).book_id)))
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
  const chapters: {id:string;book_id:string;is_published?:boolean}[]=[]
  for(let start=0;start<chapterIds.length;start+=100){
    const {data,error}=await readChapterPublication(published => serviceClient.from('chapters').select(published ? 'id,book_id,is_published' : 'id,book_id').in('id',chapterIds.slice(start,start+100)))
    if(error)throw new Error('Unable to check book availability.')
    chapters.push(...(data ?? []) as unknown as typeof chapters)
  }
  const books = new Set(await releasedBookIds([...new Set(chapters.map(chapter => String(chapter.book_id)))]))
  return chapters.filter(chapter => chapterPublished(chapter) && books.has(String(chapter.book_id))).map(chapter => String(chapter.id))
}
