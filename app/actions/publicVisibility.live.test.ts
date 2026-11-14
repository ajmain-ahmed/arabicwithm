// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
const identity = vi.hoisted(() => vi.fn(async () => null as string | null))
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedUserId: identity }))
import { fetchBooksForPublic, fetchBookBySlugPublic, fetchExploreBookChapterMetasForPublic } from './books'
import { fetchExploreEpisodeMetasForPublic } from './cartoons'
import { fetchExploreFeedPage } from './explore'
it.skipIf(process.env.RUN_PUBLIC_VISIBILITY_AUDIT !== '1')(
  'traces actual production data through canonical public loaders without content writes',
  async () => {
    process.loadEnvFile('.env.local')
    const books = await fetchBooksForPublic()
    const detail = await fetchBookBySlugPublic(books[0].slug)
    expect(detail?.id).toBe(books[0].id)
    const episodes = await fetchExploreEpisodeMetasForPublic()
    const guest = await fetchExploreFeedPage('visibility-audit', 0)
    identity.mockResolvedValue('11111111-1111-4111-8111-111111111111')
    const chapterMetas = await fetchExploreBookChapterMetasForPublic()
    const signed = await fetchExploreFeedPage('visibility-audit', 0)
    const report = {
      books: books.length,
      completedBooks: books.filter((book) => book.isCompleted).length,
      exploreEpisodeMetas: episodes.length,
      guestRenderedItems: guest.items.length,
      signedChapterMetas: chapterMetas.length,
      signedRenderedItems: signed.items.length,
      bookTitles: books.map((book) => book.title),
      guestItems: guest.items.map((item) =>
        item.kind === 'video' ? item.episode.title : item.page.bookTitle,
      ),
    }
    mkdirSync('artifacts/public-visibility', { recursive: true })
    writeFileSync('artifacts/public-visibility/loader-trace.json', JSON.stringify(report, null, 2))
    expect(books.length).toBeGreaterThan(0)
    expect(guest.items.length).toBeGreaterThan(0)
    expect(signed.items.length).toBeGreaterThan(0)
  },
  120000,
)
