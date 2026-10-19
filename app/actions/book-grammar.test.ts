// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { groupChapterBlocks } from '@/app/lib/bookParagraphs'
import type { BookTokenGrammar } from '@/app/lib/bookTokenGrammar'

const mocks = vi.hoisted(() => ({ guard: vi.fn(), from: vi.fn() }))
vi.mock('@/app/actions/auth', () => ({ guardAdmin: mocks.guard, getAuthenticatedUserId: async () => 'user' }))
vi.mock('@/app/lib/supabase', () => ({ hasServiceClientConfig: () => true, serviceClient: { from: mocks.from } }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn, updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ unstable_rethrow: vi.fn() }))
import { createChapter, fetchChapterForAdmin, updateChapter, updateChapterContent } from './admin'
import { fetchChapterForPublic } from './books'

let db: PGlite
const token = { pos: 'noun', cefr: 'A1', arabic: 'كِتَابًا', english: 'a book', headword: 'كتاب', entry_type: 'word', transliteration: 'kitāban' }
const role = { arabic: 'مَفْعُولٌ بِهِ', english: 'Direct object' }
const grammaticalCase = { arabic: 'مَنْصُوبٌ', english: 'Accusative' }
const input = { book_id: 'book', slug: 'chapter', title: 'Chapter', chapter_number: 1 }
const chapter = (grammar: Record<string, unknown> = {}) => [{
  tokens: [{ ...token, ...grammar }], translation: 'A book.', timestamp: '', paragraph: 2,
  paragraph_start: true, paragraph_end: false, paragraph_break_after: true,
}]

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create table books(id text primary key, slug text, title text);
    insert into books values('book','book','Book');
    create table chapters(id uuid primary key default gen_random_uuid(), book_id text references books(id), slug text, title text, chapter_number integer, content jsonb);`)
}, 30000)
afterAll(async () => { await db?.close() })
beforeEach(async () => {
  vi.clearAllMocks()
  mocks.guard.mockResolvedValue(undefined)
  await db.exec('delete from chapters')
  // Use real PostgreSQL JSONB storage, with a small Supabase query adapter.
  mocks.from.mockImplementation((table: string) => {
    if (!['books', 'chapters'].includes(table)) throw new Error('Unexpected table')
    let payload: Record<string, unknown> | undefined, update = false
    const filters: [string, unknown][] = []
    const run = async (single = false) => {
      const values: unknown[] = []
      const bind = (value: unknown) => { values.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : value); return `$${values.length}` }
      let sql = `select * from ${table}`
      if (payload) {
        const keys = Object.keys(payload)
        sql = update
          ? `update ${table} set ${keys.map(key => `${key}=${bind(payload![key])}`).join(',')}`
          : `insert into ${table} (${keys.join(',')}) values (${keys.map(key => bind(payload![key])).join(',')})`
      }
      if (filters.length) sql += ` where ${filters.map(([key, value]) => `${key}=${bind(value)}`).join(' and ')}`
      if (payload) sql += ' returning *'
      const { rows } = await db.query(sql, values)
      return { data: single ? rows[0] ?? null : rows, error: null, count: rows.length }
    }
    const query = {
      select: () => query, order: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query },
      insert: (value: Record<string, unknown>) => { payload = value; return query },
      update: (value: Record<string, unknown>) => { payload = value; update = true; return query },
      single: () => run(true), maybeSingle: () => run(true),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => run().then(resolve, reject),
    }
    return query
  })
})

it.each<[string, BookTokenGrammar]>([
  ['old seven-field token', {}],
  ['both labels', { syntactic_role: role, grammatical_case: grammaticalCase }],
  ['explicit nulls', { syntactic_role: null, grammatical_case: null }],
  ['partial grammar', { syntactic_role: role }],
])('preserves %s through Admin import, JSONB, Admin retrieval and reader retrieval', async (_, grammar) => {
  const content = chapter(grammar)
  const id = await createChapter({ ...input, content })
  expect((await fetchChapterForAdmin(id))?.content).toEqual(content)
  const reader = await fetchChapterForPublic('book', 'chapter')
  const { entry_type: entryType, ...readerToken } = token
  expect(reader?.content[0]).toMatchObject({ ...content[0], tokens: [expect.objectContaining({
    ...readerToken, entryType, syntactic_role: grammar.syntactic_role ?? null, grammatical_case: grammar.grammatical_case ?? null,
  })] })
  // entry_type already maps to the reader's established camelCase entryType.
  expect(reader?.content[0].tokens[0].entryType).toBe('word')
  expect(groupChapterBlocks('chapter', reader!.content).map(p => p.length)).toEqual([1])
})

it('preserves enriched JSON through both update paths and JSON export', async () => {
  const id = await createChapter({ ...input, content: chapter() })
  const content = chapter({ syntactic_role: role, grammatical_case: grammaticalCase })
  await updateChapter(id, { content })
  expect((await fetchChapterForAdmin(id))?.content).toEqual(content)
  await updateChapterContent(id, content)
  expect(JSON.parse(JSON.stringify((await fetchChapterForAdmin(id))?.content))).toEqual(content)
  expect((await fetchChapterForPublic('book', 'chapter'))?.content[0].tokens[0]).toMatchObject({ syntactic_role: role, grammatical_case: grammaticalCase })
})

it('retains paragraph numbering and boundary flags without changing grouping', async () => {
  const first = chapter({ syntactic_role: role, grammatical_case: grammaticalCase })[0]
  const content = [first, { ...first, paragraph_start: false }, { ...first, paragraph: 3, paragraph_end: true }]
  const id = await createChapter({ ...input, content })
  expect((await fetchChapterForAdmin(id))?.content).toEqual(content)
  const reader = (await fetchChapterForPublic('book', 'chapter'))!.content
  reader.forEach((block, index) => {
    expect(block.paragraph).toBe(content[index].paragraph)
    expect(block.paragraph_start).toBe(content[index].paragraph_start)
    expect(block.paragraph_end).toBe(content[index].paragraph_end)
    expect(block.paragraph_break_after).toBe(content[index].paragraph_break_after)
    expect(block.timestamp).toBe('')
  })
  expect(groupChapterBlocks('chapter', reader).map(p => p.length)).toEqual([2, 1])
})

it.each(['syntactic_role', 'grammatical_case'])('rejects malformed %s on every write path before database access', async field => {
  for (const value of ['noun', 1, [], {}, { arabic: 'نَصّ' }, { arabic: 1, english: 'Label' }, { arabic: 'نَصّ', english: null }]) {
    const content = chapter({ [field]: value })
    const error = new RegExp(`Sentence 1, token 1: ${field}`)
    await expect(createChapter({ ...input, content })).rejects.toThrow(error)
    await expect(updateChapter('id', { content })).rejects.toThrow(error)
    await expect(updateChapterContent('id', content)).rejects.toThrow(error)
  }
  expect(mocks.from).not.toHaveBeenCalled()
})

it('keeps Admin authorization ahead of validation and storage', async () => {
  mocks.guard.mockRejectedValue(new Error('Forbidden'))
  await expect(createChapter({ ...input, content: chapter() })).rejects.toThrow('Forbidden')
  await expect(updateChapter('id', { content: chapter() })).rejects.toThrow('Forbidden')
  await expect(updateChapterContent('id', chapter())).rejects.toThrow('Forbidden')
  expect(mocks.from).not.toHaveBeenCalled()
})
