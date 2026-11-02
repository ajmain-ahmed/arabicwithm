import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))

import ScrollReset from './ScrollReset'

let host: HTMLDivElement, root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  mocks.pathname = '/'
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

it('scrolls to top when the pathname changes', async () => {
  await act(async () => root.render(<ScrollReset />))
  expect(window.scrollTo).toHaveBeenCalledTimes(1)
  mocks.pathname = '/cartoons/dbz'
  await act(async () => root.render(<ScrollReset />))
  expect(window.scrollTo).toHaveBeenCalledTimes(2)
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' })
})

it('does not reset on rerenders with the same pathname (query-only filter updates)', async () => {
  await act(async () => root.render(<ScrollReset />))
  mocks.pathname = '/cartoons'
  await act(async () => root.render(<ScrollReset />))
  expect(window.scrollTo).toHaveBeenCalledTimes(2)
  await act(async () => root.render(<ScrollReset />))
  expect(window.scrollTo).toHaveBeenCalledTimes(2)
})

it('leaves back/forward navigations to history scroll restoration', async () => {
  await act(async () => root.render(<ScrollReset />))
  await act(async () => { window.dispatchEvent(new PopStateEvent('popstate')) })
  mocks.pathname = '/cartoons/dbz'
  await act(async () => root.render(<ScrollReset />))
  expect(window.scrollTo).toHaveBeenCalledTimes(1)
})

it('re-arms the reset after a real click', async () => {
  await act(async () => root.render(<ScrollReset />))
  await act(async () => { window.dispatchEvent(new PopStateEvent('popstate')) })
  mocks.pathname = '/cartoons/dbz'
  await act(async () => root.render(<ScrollReset />))
  await act(async () => { document.body.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  mocks.pathname = '/books'
  await act(async () => root.render(<ScrollReset />))
  expect(window.scrollTo).toHaveBeenCalledTimes(2)
})
