import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import ChapterLoading from '@/app/books/[book]/[chapter]/loading'
import ProfileLoading from '@/app/profile/[user]/loading'
import { BooksPageLoading, CataloguePageLoading, ExplorePageLoading, HomePageLoading, MemoryPageLoading, ShowPageLoading, WatchPageLoading } from './PageLoading'

const cases = [
  ['Homepage', HomePageLoading, 20],
  ['Books library', BooksPageLoading, 20],
  ['Memory setup', MemoryPageLoading, 15],
  ['Watch page', WatchPageLoading, 20],
  ['Explore stage', ExplorePageLoading, 7],
  ['Show catalogue', ShowPageLoading, 15],
  ['Watch catalogue', CataloguePageLoading, 20],
  ['Chapter reader', ChapterLoading, 15],
  ['Profile account', ProfileLoading, 20],
] as const

it.each(cases)('%s renders a structured page skeleton', async (_name, Component, minimumSkeletons) => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(<Component />)
  expect(host.querySelector('[data-loading-page="true"]')).not.toBeNull()
  expect(host.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThanOrEqual(minimumSkeletons)
})
