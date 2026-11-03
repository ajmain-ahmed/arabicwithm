// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ released: true, cache: new Map<string, unknown>(), sign: vi.fn() }))
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>, keys: string[]) => async (...args: unknown[]) => {
    const key = JSON.stringify([keys, args]); if (!state.cache.has(key)) state.cache.set(key, await fn(...args)); return state.cache.get(key)
  }, revalidatePath: vi.fn(), updateTag: vi.fn(),
}))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: async () => 'plus-reader', guardAdmin: vi.fn() }))
vi.mock('@/app/actions/entitlements', () => ({ requireEntitlement: vi.fn() }))
vi.mock('@/app/lib/supabase', () => ({ hasServiceClientConfig: () => true, serviceClient: {
  storage: { from: () => ({ createSignedUrl: state.sign }) },
  from: (table: string) => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = []
    const read = () => ({ data: (table === 'books' ? [{ id: 'book', slug: 'book', title: 'Book metadata', is_completed: state.released }] : table === 'chapters' ? [{ id: 'chapter', book_id: 'book', slug: 'one', title: 'Secret chapter', chapter_number: 1, content: [{ tokens: [{ arabic: 'كتاب', english: 'book' }], translation: 'Secret prose' }] }] : [{ chapter_id: 'chapter', language: 'ar', is_published: true, source_type: 'supabase_storage', storage_path: 'ar/book/audio.wav' }]).filter(row => filters.every(fn => fn(row))), error: null })
    const query = {
      select: () => query, order: () => query, range: () => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return query },
      maybeSingle: async () => ({ data: read().data[0] ?? null, error: null }), single: async () => ({ data: read().data[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(read()).then(resolve),
    }
    return query
  },
} }))
import { fetchBooksForPublic, fetchChapterForPublic, fetchChaptersForBookPublic, fetchExploreBookChapterPages } from './books'
import { fetchBookIdsWithPublishedAudio, fetchPublishedChapterAudioForChapter, requestChapterAudio } from './audiobooks'
beforeEach(() => { state.released = true; state.cache.clear(); state.sign.mockClear(); vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co') })

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
