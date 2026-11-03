// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  cache: new Map<string, unknown>(),
  tag: vi.fn(), path: vi.fn(), failure: '',
}))
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>, key: string[]) => async (...args: unknown[]) => {
    const id = JSON.stringify([key, args])
    if (!state.cache.has(id)) state.cache.set(id, await fn(...args))
    return state.cache.get(id)
  },
  updateTag: (tag: string) => { state.tag(tag); state.cache.clear() },
  revalidatePath: state.path,
}))
vi.mock('@/app/actions/auth', () => ({ guardAdmin: vi.fn(), getAuthenticatedUserId: vi.fn() }))
vi.mock('@/app/actions/entitlements', () => ({ requireEntitlement: vi.fn() }))
vi.mock('@/app/lib/verifyAudioObject', () => ({ verifyAudioObject: vi.fn() }))
vi.mock('@/app/lib/supabase', () => ({ serviceClient: { from: (table: string) => {
  const filters: Array<(row: Record<string, unknown>) => boolean> = []
  let start = 0, end = Infinity, deleting = false
  const read = () => {
    if (state.failure === table) return { data: null, error: { message: 'offline' } }
    const data = (state.tables[table] ?? []).filter(row => filters.every(fn => fn(row)))
    if (deleting) state.tables[table] = state.tables[table].filter(row => !data.includes(row))
    return { data: data.slice(start, end + 1), error: null }
  }
  const query = {
    select: () => query, order: () => query,
    eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query },
    in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return query },
    range: (from: number, to: number) => { start = from; end = to; return query },
    delete: () => { deleting = true; return query },
    upsert: async (row: Record<string, unknown>) => {
      state.tables[table] = state.tables[table].filter(old => old.chapter_id !== row.chapter_id || old.language !== row.language)
      state.tables[table].push(row)
      return { error: null }
    },
    maybeSingle: async () => { const result = read(); return { ...result, data: result.data?.[0] ?? null } },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(read()).then(resolve),
  }
  return query
} } }))

import { deleteChapterAudioForAdmin, fetchBookIdsWithPublishedAudio, fetchPublishedAudioForBook, fetchPublishedChapterAudioForChapter, saveChapterAudioForAdmin } from './audiobooks'
const chapter = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const save = (language: 'ar' | 'en', chapterId = chapter, isPublished = true) => saveChapterAudioForAdmin({ chapterId, language, isPublished, sourceType: 'supabase_storage', storagePath: `fixture/${language}/audio.wav` })

beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  state.cache.clear(); state.failure = ''
  state.tables = { books: [{ id: 'book', slug: 'book' }], chapters: [{ id: chapter, book_id: 'book', slug: 'one' }, { id: second, book_id: 'book', slug: 'two' }], book_chapter_audio: [] }
})

it.each(['ar', 'en'] as const)('discovers the first %s audio after Admin save despite a warm empty cache', async language => {
  expect(await fetchBookIdsWithPublishedAudio(['book'])).toEqual([])
  expect(await fetchPublishedAudioForBook('book')).toEqual([])
  await save(language)
  expect(await fetchBookIdsWithPublishedAudio(['book'])).toEqual(['book'])
  expect(await fetchPublishedAudioForBook('book')).toEqual([expect.objectContaining({ chapterId: chapter, language })])
  expect(state.tag).toHaveBeenCalledWith('books-public')
  expect(state.path).toHaveBeenCalledWith('/books')
  expect(state.path).toHaveBeenCalledWith('/listen/book')
})

it('discovers later chapters, preserves partial audio and removes the book only after the last published source goes', async () => {
  await save('ar'); await fetchPublishedAudioForBook('book')
  await save('en', second)
  expect(await fetchPublishedAudioForBook('book')).toHaveLength(2)
  expect(await fetchPublishedChapterAudioForChapter(chapter)).toMatchObject({ ar: { chapterId: chapter }, en: null })
  expect(await fetchPublishedChapterAudioForChapter(second)).toMatchObject({ ar: null, en: { chapterId: second } })
  await save('ar', chapter, false)
  expect(await fetchBookIdsWithPublishedAudio(['book'])).toEqual(['book'])
  await deleteChapterAudioForAdmin(second, 'en')
  expect(await fetchBookIdsWithPublishedAudio(['book'])).toEqual([])
  expect(await fetchPublishedAudioForBook('book')).toEqual([])
})

it('excludes invalid, unpublished and foreign-book sources without requiring both languages', async () => {
  state.tables.book_chapter_audio = [
    { chapter_id: chapter, language: 'ar', source_type: 'supabase_storage', storage_path: '../bad', is_published: true },
    { chapter_id: second, language: 'en', source_type: 'external_url', external_url: 'https://example.com/image.png', is_published: true },
    { chapter_id: 'foreign', language: 'ar', source_type: 'youtube', external_video_id: 'abcdefghij0', is_published: true },
  ]
  expect(await fetchBookIdsWithPublishedAudio(['book'])).toEqual([])
  expect(await fetchPublishedChapterAudioForChapter(chapter)).toEqual({ ar: null, en: null })
})

it('does not silently turn query failures into an empty catalogue', async () => {
  state.failure = 'book_chapter_audio'
  await expect(fetchBookIdsWithPublishedAudio(['book'])).rejects.toThrow('availability')
})

it('pages chapters past the API row limit and reuses full Storage URLs through the canonical resolver', async () => {
  state.tables.chapters = Array.from({ length: 1001 }, (_, i) => ({ id: String(i), book_id: 'book' }))
  state.tables.book_chapter_audio = [{ chapter_id: '1000', language: 'en', source_type: 'supabase_storage', storage_path: 'https://example.supabase.co/storage/v1/object/public/audiobooks/english/book/audio.wav', is_published: true }]
  expect(await fetchBookIdsWithPublishedAudio(['book'])).toEqual(['book'])
})
