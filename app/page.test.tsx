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
vi.mock('next/server', () => ({ connection: vi.fn(async () => {}) }))
vi.mock('@/app/lib/dailyPhrase.server', () => ({ loadDailyPhrase: vi.fn(async () => null) }))
import HomePage from './page'
import { CatalogueSection, FeaturedSection } from '@/app/components/home/HomeSections'

async function dashboard() {
  const page = await HomePage()
  return CatalogueSection(page.props.children[2].props.children.props)
}


beforeEach(() => {
  vi.resetAllMocks()
  for (const read of Object.values(catalogue)) read.mockRejectedValue(new Error('Backend unavailable'))
  catalogue.spotlight.mockResolvedValue(null)
})

it('renders public home with safe defaults when every catalogue read fails', async () => {
  const page = await dashboard()
  expect(page.props).toMatchObject({ books: [], newShows: [], newEpisodes: [] })
})

it('starts independent homepage reads together instead of serialising their latency', async () => {
  let finish!: (books: []) => void
  catalogue.books.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const pending = HomePage()
  await Promise.resolve()
  await Promise.resolve()
  expect(catalogue.shows).toHaveBeenCalledOnce()
  expect(catalogue.newShows).toHaveBeenCalledOnce()
  expect(catalogue.newEpisodes).toHaveBeenCalledOnce()
  finish([])
  await pending
})

it('keeps Spotlight discovery out of initial HTML and does not query it twice', async () => {
  const page = await dashboard()
  expect(catalogue.spotlight).not.toHaveBeenCalled()
  expect(page.props.spotlightArea.props.discover).toBe(true)
  expect(page.props.showFeatured).toBe(false)
})

it('shuffles full home pools on the server while retaining latest episode order and library order', async () => {
 vi.useFakeTimers()
 try {
  vi.setSystemTime(new Date('2026-11-13T12:00:00Z'))
  const books=Array.from({length:20},(_,index)=>({id:String(index),isCompleted:index!==19}))
  const shows=Array.from({length:20},(_,index)=>({id:String(index)}))
  const latest=[{id:'newest'},{id:'older'}]
  catalogue.books.mockResolvedValue(books);catalogue.newShows.mockResolvedValue(shows)
  catalogue.newEpisodes.mockResolvedValue(latest)
  const first=(await dashboard()).props
  expect(first.books).toEqual(books)
  expect(first.homepageBooks).toHaveLength(19)
  expect(first.homepageBooks.some((book:{id:string})=>book.id==='19')).toBe(false)
  expect(first.newEpisodes).toEqual(latest)
  expect(first.newShows).toHaveLength(20)
  for(let refresh=0;refresh<10;refresh++) {
   const again=(await dashboard()).props
   expect(again.homepageBooks).toEqual(first.homepageBooks)
   expect(again.newShows).toEqual(first.newShows)
  }
  vi.setSystemTime(new Date('2026-11-14T12:00:00Z'))
  const next=(await dashboard()).props
  expect(next.newShows).not.toEqual(first.newShows)
  expect(next.homepageBooks).not.toEqual(first.homepageBooks)
  expect(next.newEpisodes).toEqual(latest)
 } finally { vi.useRealTimers() }
})

it('streams Featured and catalogue without waiting for Spotlight', async () => {
  catalogue.spotlight.mockImplementation(() => new Promise(() => {}))
  const page = await HomePage()
  const featured = await FeaturedSection(page.props.children[1].props.children.props)
  expect(featured.props.items).toEqual([])
  expect((await CatalogueSection(page.props.children[2].props.children.props)).props.books).toEqual([])
})
