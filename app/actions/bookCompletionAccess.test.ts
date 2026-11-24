// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ released: true, published: true, admin: true, signedIn: true, noColumn: false, chapterCount: 1, cache: new Map<string, unknown>(), sign: vi.fn() }))
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>, keys: string[]) => async (...args: unknown[]) => {
    const key = JSON.stringify([keys, args]); if (!state.cache.has(key)) state.cache.set(key, await fn(...args)); return state.cache.get(key)
  }, revalidatePath: vi.fn(), updateTag: vi.fn(),
}))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: async () => state.signedIn ? 'reader' : null, getAuthenticatedAccess: async () => state.signedIn ? { userId: 'reader', admin: state.admin } : null, guardAdmin: async () => { if(!state.admin)throw new Error('Admin required') } }))
vi.mock('@/app/actions/entitlements', () => ({ requireEntitlement: vi.fn() }))
vi.mock('@/app/lib/supabase', () => ({ hasServiceClientConfig: () => true, serviceClient: {
  storage: { from: () => ({ createSignedUrl: state.sign }) },
  from: (table: string) => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = []
    const read = () => ({ data: (table === 'books' ? [{ id: 'book', slug: 'book', title: 'Book metadata', is_completed: state.released }] : table === 'chapters' ? [{ id: 'chapter', book_id: 'book', is_published: state.published, slug: 'one', title: 'Secret chapter', chapter_number: 1, content: [{ tokens: [{ arabic: 'كتاب', english: 'book' }], translation: 'Secret prose' }] }] : [{ chapter_id: 'chapter', language: 'ar', is_published: true, source_type: 'supabase_storage', storage_path: 'ar/book/audio.wav' }]).flatMap<Record<string, unknown>>((row: Record<string, unknown>) => table === 'chapters' ? Array.from({ length: state.chapterCount }, (_, index) => ({ ...row, id: index ? `chapter${index}` : row.id, slug: index ? `chapter-${index+1}` : row.slug, chapter_number: index+1, is_published: state.published && index<5 })) : [row]).filter(row => filters.every(fn => fn(row))), error: null })
    let missing = false
    const query = {
      select: (columns: string) => { missing = state.noColumn && columns.includes('is_published'); return query }, order: () => query, range: () => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return query },
      maybeSingle: async () => missing ? { data: null, error: { code: '42703', message: 'column chapters.is_published does not exist' } } : ({ data: read().data[0] ?? null, error: null }), single: async () => ({ data: read().data[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(read()).then(resolve),
    }
    return query
  },
} }))
import { fetchBooksForPublic, fetchChapterForPublic, fetchChaptersForBookPublic, fetchExploreBookChapterPages, fetchChapterForAdminPreview, fetchChaptersForBookReader, fetchChapterForReader } from './books'
import { fetchBookIdsWithPublishedAudio, fetchPublishedChapterAudioForChapter, requestChapterAudio } from './audiobooks'
beforeEach(() => { state.released = true; state.signedIn=true; state.noColumn=false; state.chapterCount=1; state.published=true; state.admin=true; state.cache.clear(); state.sign.mockClear(); vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co') })

it('keeps metadata discoverable but hides chapters, practice and audio when incomplete', async () => {
  state.released = false
  expect(await fetchBooksForPublic()).toEqual([expect.objectContaining({ title: 'Book metadata', isCompleted: false, chapterCount: 0 })])
  expect(await fetchChaptersForBookPublic('book')).toEqual([])
  expect(await fetchChapterForPublic('book', 'one')).toBeNull()
  expect(await fetchExploreBookChapterPages('chapter')).toEqual([])
  expect(await fetchBookIdsWithPublishedAudio(['book'])).toEqual([])
  expect(await fetchPublishedChapterAudioForChapter('chapter')).toEqual({ ar: null, en: null })
})
it('blocks a previously cached chapter after Admin reopens the book without relying on cache expiry', async () => {
  expect((await fetchChapterForPublic('book', 'one'))?.content[0].translation).toBe('Secret prose')
  expect(await fetchChaptersForBookPublic('book')).toHaveLength(1)
  state.released = false
  expect(await fetchChapterForPublic('book', 'one')).toBeNull()
  expect(await fetchChaptersForBookPublic('book')).toEqual([])
})
it('denies a Plus listener before signing unreleased audio', async () => {
  state.released = false
  await expect(requestChapterAudio('chapter', 'ar')).rejects.toThrow('not released')
  expect(state.sign).not.toHaveBeenCalled()
})

it('blocks a cached chapter, navigation, feeds and audio immediately when only the chapter is unpublished',async()=>{
 expect(await fetchChapterForPublic('book','one')).not.toBeNull()
 state.published=false
 expect(await fetchChapterForPublic('book','one')).toBeNull()
 expect(await fetchChaptersForBookPublic('book')).toEqual([])
 expect(await fetchExploreBookChapterPages('chapter')).toEqual([])
 await expect(requestChapterAudio('chapter','ar')).rejects.toThrow('not released')
 expect(state.sign).not.toHaveBeenCalled()
})
it('Admin preview bypasses both release switches, while non-Admins are denied before content access',async()=>{
 state.released=false;state.published=false
 const result=await fetchChapterForAdminPreview('chapter')
 expect(result?.chapter.title).toBe('Secret chapter');expect(result?.chapters).toHaveLength(1)
 state.admin=false
 await expect(fetchChapterForAdminPreview('chapter')).rejects.toThrow('Admin required')
})

it.each(['guest','free','awm+','editor','admin'])('reader access for %s keeps draft access Admin-only', async role => {
 state.released=false; state.published=false; state.admin=role==='admin'; state.signedIn=role!=='guest'
 expect((await fetchChaptersForBookReader('book')).length).toBe(role==='admin'?1:0)
 expect(Boolean(await fetchChapterForReader('book','one'))).toBe(role==='admin')
 // Warm Admin caches cannot expose drafts on a later non-Admin request.
 state.admin=false
 expect(await fetchChapterForReader('book','one')).toBeNull()
})
it('Admin preview retains compatibility when the publication column is absent', async()=>{
 state.released=false; state.noColumn=true
 expect((await fetchChapterForAdminPreview('chapter'))?.chapter.title).toBe('Secret chapter')
})

it('lists all twelve stored chapters for Admin, only five published chapters for learners', async()=>{
 state.chapterCount=12
 expect(await fetchChaptersForBookReader('book')).toHaveLength(12)
 expect(await fetchChapterForReader('book','chapter-12')).not.toBeNull()
 for (const role of ['free','awm+','editor']) {
  state.admin=false
  expect(await fetchChaptersForBookReader('book'), role).toHaveLength(5)
  expect(await fetchChapterForReader('book','chapter-12'), role).toBeNull()
 }
})
