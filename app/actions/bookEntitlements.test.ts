// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({
  signedIn: true, premium: false, exempt: true, completed: true,
  book: 'ad76c3ab-177b-4180-99ce-bfd7facabb10', from: vi.fn(), sign: vi.fn(), positions: [] as Record<string, unknown>[],
}))
const chapter = '55555555-5555-4555-8555-555555555555', user = '11111111-1111-4111-8111-111111111111'
vi.mock('@/app/actions/premium', () => ({ fetchPremiumStatus: async () => ({ signedIn: state.signedIn, premium: state.premium }) }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedAccess: async () => state.signedIn ? { userId: user, role: 'user' } : null, getAuthenticatedUserId: async () => state.signedIn ? user : null, guardAdmin: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn, revalidatePath: vi.fn(), updateTag: vi.fn() }))
vi.mock('@/app/lib/supabase', () => ({ hasServiceClientConfig: () => true, serviceClient: {
  from: state.from,
  storage: { getBucket: async () => ({ data: { public: false }, error: null }), from: () => ({ createSignedUrl: state.sign }) },
} }))
import { fetchEntitlements } from './entitlements'
import { requestChapterAudio, saveAudioProgress } from './audiobooks'
import { fetchChapterForPublic, fetchChapterCardsForBookPublic } from './books'
import { GET } from '../api/books/[book]/download/route'
import { canAccessBookMedia } from '@/app/lib/entitlements'
import type { NextRequest } from 'next/server'

beforeEach(() => {
  state.signedIn = true; state.premium = false; state.exempt = true; state.completed = true; state.positions = []
  state.book = 'ad76c3ab-177b-4180-99ce-bfd7facabb10'
  vi.clearAllMocks(); vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  state.sign.mockImplementation(async path => ({ data: { signedUrl: `https://private.example/${path}` }, error: null }))
  state.from.mockImplementation((table: string) => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = []
    const rows = () => table === 'books' ? [{ id: state.book, slug: 'canonical', title: 'Canonical Book', author: 'Author', premium_exempt: state.exempt, is_completed: state.completed, free_chapter_count: 5 }] : table === 'chapters' ? [{ id: chapter, book_id: state.book, slug: 'late', title: 'Late chapter', chapter_number: 99, content: [{ tokens: [{ arabic: 'كتاب', english: 'book' }], translation: 'Protected passage' }] }] : table === 'book_chapter_audio' ? ['ar', 'en'].map(language => ({ chapter_id: chapter, language, is_published: true, source_type: 'supabase_storage', storage_path: `${language}/audio.wav` })) : state.positions
    const read = () => { const data = rows().filter(row => filters.every(fn => fn(row))); return { data, count: data.length, error: null } }
    const query = {
      select: () => query, order: () => query, range: () => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return query },
      lte: () => query,
      maybeSingle: async () => ({ data: read().data[0] ?? null, error: null }), single: async () => ({ data: read().data[0] ?? null, error: null }),
      upsert: async (row: Record<string, unknown>) => { state.positions = state.positions.filter(old => old.chapter_id !== row.chapter_id || old.language !== row.language); state.positions.push(row); return { error: null } },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(read()).then(resolve),
    }
    return query
  })
})

const ids = ['ad76c3ab-177b-4180-99ce-bfd7facabb10', 'e4ba3b2a-1a62-45ad-a2bb-1eff8a36fed7', 'f3b08eae-fdfc-4746-81b9-7b7d5088ff69', '6fb6426f-2d56-44e0-88f6-86c39e3d1f18']
it.each(ids)('uses parent Book exemption for full reading, both audio languages and PDF: %s', async id => {
  state.book = id
  expect(await fetchEntitlements(id)).toMatchObject({ canReadBooks: true, canDownloadBooks: true, canUseAudiobooks: true, premium: false })
  expect(await fetchEntitlements()).toMatchObject({ canDownloadBooks: false, canUseAudiobooks: false })
  expect(await fetchChapterForPublic(id, 'late')).not.toBeNull()
  for (const language of ['ar', 'en'] as const) expect(await requestChapterAudio(chapter, language)).toMatchObject({ url: `https://private.example/${language}/audio.wav`, expiresIn: 7200 })
  const response = await GET({ nextUrl: new URL('https://site.example/api/books/canonical/download?lang=en') } as NextRequest, { params: Promise.resolve({ book: 'canonical' }) })
  expect(response.status).toBe(200); expect(await response.text()).toContain('Protected passage')
})
it('allows saved audio progress and language-specific resume for a free exempt listener', async () => {
  await saveAudioProgress(chapter, 42, false, 'ar', user)
  expect(await requestChapterAudio(chapter, 'ar')).toMatchObject({ positionSeconds: 42 })
  expect(await requestChapterAudio(chapter, 'en')).toMatchObject({ positionSeconds: 0 })
  expect(state.positions[0]).toMatchObject({ user_id: user, language: 'ar', position_seconds: 42 })
})
it('retains normal-book signed-in reading rules while keeping normal audio/PDF paid', async () => {
  state.exempt = false
  expect(await fetchEntitlements(state.book)).toMatchObject({ canReadBooks: true, canUseAudiobooks: false, canDownloadBooks: false })
  await expect(requestChapterAudio(chapter)).rejects.toThrow('AWM+')
  expect(state.sign).not.toHaveBeenCalled()
  state.premium = true
  expect(await fetchEntitlements(state.book)).toMatchObject({ canUseAudiobooks: true, canDownloadBooks: true })
  expect(await requestChapterAudio(chapter)).toMatchObject({ expiresIn: 7200 })
})
it('rejects anonymous prose, teasers, PDF and audio without issuing private URLs', async () => {
  state.signedIn = false
  expect(await fetchEntitlements(state.book)).toMatchObject({ canReadBooks: false, canUseAudiobooks: false, canDownloadBooks: false })
  expect(await fetchChapterForPublic(state.book, 'late')).toBeNull()
  expect((await fetchChapterCardsForBookPublic(state.book))[0]).not.toHaveProperty('teaser')
  await expect(requestChapterAudio(chapter)).rejects.toThrow('Sign in')
  expect(state.sign).not.toHaveBeenCalled()
  expect((await GET({ nextUrl: new URL('https://site.example?lang=ar') } as NextRequest, { params: Promise.resolve({ book: 'canonical' }) })).status).toBe(401)
})
it('does not let exemption or Plus bypass completion and respects future flag edits without redeploy', async () => {
  state.completed = false; state.premium = true
  expect(await fetchEntitlements(state.book)).toMatchObject({ canReadBooks: false, canUseAudiobooks: false, canDownloadBooks: false })
  await expect(requestChapterAudio(chapter)).rejects.toThrow('not released')
  state.completed = true; state.premium = false; state.exempt = false
  expect((await fetchEntitlements(state.book)).canUseAudiobooks).toBe(false)
  state.exempt = true
  expect((await fetchEntitlements(state.book)).canUseAudiobooks).toBe(true)
})
it('implements the shared authenticated/exempt/Premium/released media truth table', () => {
  for (const signedIn of [false, true]) for (const premium of [false, true]) for (const exempt of [false, true]) for (const complete of [false, true]) {
    expect(canAccessBookMedia(signedIn, premium, exempt, complete)).toBe(signedIn && complete && (premium || exempt))
  }
})
