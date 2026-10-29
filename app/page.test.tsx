// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'

const catalogue = vi.hoisted(() => ({ books: vi.fn(), chapters: vi.fn(), shows: vi.fn(), episodes: vi.fn(), newShows: vi.fn(), newEpisodes: vi.fn() }))
vi.mock('@/app/actions/books', () => ({ fetchBooksForPublic: catalogue.books, fetchChapterNavigationForPublic: catalogue.chapters }))
vi.mock('@/app/actions/cartoons', () => ({ fetchShowsForPublic: catalogue.shows }))
vi.mock('@/app/lib/homeFeatured',()=>({fetchHomeFeatured:vi.fn(async()=>null)}))
vi.mock('@/app/lib/homeCatalogue', () => ({ fetchHomeEpisodes: catalogue.episodes }))
vi.mock('@/app/components/home/catalogueRows', () => ({ fetchNewOnShows: catalogue.newShows, fetchNewOnEpisodes: catalogue.newEpisodes }))
vi.mock('@/app/components/home/HomeDashboard', () => ({ default: () => null }))
import HomePage from './page'

beforeEach(() => {
  vi.resetAllMocks()
  for (const read of Object.values(catalogue)) read.mockRejectedValue(new Error('Backend unavailable'))
})

it('renders public home with safe defaults when every catalogue read fails', async () => {
  const page = await HomePage()
  expect(page.props).toMatchObject({ books: [], chaptersByBook: {}, featuredBook: null, featuredEpisode: null, newShows: [], newEpisodes: [] })
})

it('starts independent homepage reads together instead of serialising their latency', async () => {
  let finish!: (books: []) => void
  catalogue.books.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const pending = HomePage()
  expect(catalogue.chapters).toHaveBeenCalledOnce()
  expect(catalogue.newShows).toHaveBeenCalledOnce()
  expect(catalogue.newEpisodes).toHaveBeenCalledOnce()
  finish([])
  await pending
})
