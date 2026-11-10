// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'

const catalogue = vi.hoisted(() => ({ books: vi.fn(), shows: vi.fn(), episodes: vi.fn(), newShows: vi.fn(), newEpisodes: vi.fn(), spotlight:vi.fn() }))
vi.mock('@/app/actions/forYou',()=>({fetchHomeForYouSpotlight:vi.fn()}))
vi.mock('@/app/lib/homeSpotlight.server',()=>({loadHomeSpotlight:catalogue.spotlight}))
vi.mock('@/app/actions/books', () => ({ fetchBooksForPublic: catalogue.books }))
vi.mock('@/app/actions/cartoons', () => ({ fetchShowsForPublic: catalogue.shows }))
vi.mock('@/app/lib/homeFeatured',()=>({fetchHomeFeatured:vi.fn(async()=>[])}))
vi.mock('@/app/lib/homeCatalogue', () => ({ fetchHomeEpisodes: catalogue.episodes }))
vi.mock('@/app/components/home/catalogueRows', () => ({ fetchNewOnShows: catalogue.newShows, fetchNewOnEpisodes: catalogue.newEpisodes }))
vi.mock('@/app/components/home/HomeDashboard', () => ({ default: () => null }))
import HomePage from './page'

beforeEach(() => {
  vi.resetAllMocks()
  for (const read of Object.values(catalogue)) read.mockRejectedValue(new Error('Backend unavailable'))
  catalogue.spotlight.mockResolvedValue(null)
})

it('renders public home with safe defaults when every catalogue read fails', async () => {
  const page = await HomePage()
  expect(page.props).toMatchObject({ books: [], newShows: [], newEpisodes: [] })
})

it('starts independent homepage reads together instead of serialising their latency', async () => {
  let finish!: (books: []) => void
  catalogue.books.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const pending = HomePage()
  await Promise.resolve()
  expect(catalogue.shows).toHaveBeenCalledOnce()
  expect(catalogue.newShows).toHaveBeenCalledOnce()
  expect(catalogue.newEpisodes).toHaveBeenCalledOnce()
  finish([])
  await pending
})

it('passes the server-selected clip as initial data without a client discovery boundary',async()=>{
 const clip={video:{id:'selected'}};catalogue.spotlight.mockResolvedValue(clip)
 expect((await HomePage()).props.spotlight).toEqual({clip,error:false});expect(catalogue.spotlight).toHaveBeenCalledOnce()
})
it('returns an intentional failure state if Spotlight selection fails while Home remains available',async()=>{
 catalogue.spotlight.mockRejectedValue(new Error('Selection unavailable'))
 expect((await HomePage()).props.spotlight).toEqual({clip:null,error:true})
})
