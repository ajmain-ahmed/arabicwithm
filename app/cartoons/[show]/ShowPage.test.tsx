import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string; user_metadata?: Record<string, unknown> } | null,
  addToMyList: vi.fn(),
  removeFromMyList: vi.fn(),
  fetchMyListShowIds: vi.fn(),
}))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@/app/lib/useIsAdmin', () => ({ useIsAdmin: () => false }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/app/actions/myList', () => ({
  addToMyList: mocks.addToMyList,
  removeFromMyList: mocks.removeFromMyList,
  fetchMyListShowIds: mocks.fetchMyListShowIds,
}))
vi.mock('@/app/actions/admin', () => ({ deleteEpisode: vi.fn() }))
vi.mock('@/app/cartoons/components/EpisodeEditDialog', () => ({ default: () => null }))

import ShowPage from './ShowPage'
import type { EpisodeMeta } from '@/app/lib/cartoons'

const show = { id: 'show-1', slug: 'dbz', title: 'Dragon Ball Z', cover: '/cover.webp', level: 'A1', episodeCount: 3 }
const episodes: EpisodeMeta[] = [
  { id: 'ep-1', slug: 'ep-1', title: 'The Saiyan Saga Begins', level: 'A1', tags: [] },
  { id: 'ep-2', slug: 'ep-2', title: 'Goku vs Vegeta', level: 'A2', tags: [] },
  { id: 'ep-3', slug: 'ep-3', title: 'The Frieza Battle', level: 'B1', tags: [] },
]

let host: HTMLDivElement, root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.clearAllMocks()
  mocks.user = { id: 'user-1' }
  mocks.addToMyList.mockResolvedValue({ ok: true })
  mocks.removeFromMyList.mockResolvedValue({ ok: true })
  mocks.fetchMyListShowIds.mockResolvedValue([])
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

async function render() {
  await act(async () => root.render(<ShowPage show={show} episodes={episodes} />))
}

const episodeLinks = () => [...host.querySelectorAll('a')].map(a => a.getAttribute('href')).filter(h => h?.startsWith('/cartoons/dbz/'))
const searchInput = () => host.querySelector('input[type="search"]') as HTMLInputElement

async function typeSearch(value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(searchInput(), value)
    searchInput().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

it('shows the compact My List button instead of the episode count, and toggles it', async () => {
  await render()
  const button = () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Add to List' || b.textContent === 'In My List')!
  expect(button()).toBeTruthy()
  expect(host.textContent).not.toContain('3 episodes')
  await act(async () => button().click())
  expect(mocks.addToMyList).toHaveBeenCalledWith('show-1')
  expect(button().textContent).toBe('In My List')
  await act(async () => button().click())
  expect(mocks.removeFromMyList).toHaveBeenCalledWith('show-1')
  expect(button().textContent).toBe('Add to List')
})

it('keeps the episode count for signed-out visitors', async () => {
  mocks.user = null
  await render()
  expect(host.textContent).toContain('3 episodes')
  expect([...host.querySelectorAll('button')].some(b => b.textContent === 'Add to List')).toBe(false)
})

it('filters episodes by search text combined with the level filter', async () => {
  await render()
  await typeSearch('goku')
  expect(episodeLinks()).toEqual(['/cartoons/dbz/ep-2'])
  await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === 'A2')!.click() })
  expect(episodeLinks()).toEqual(['/cartoons/dbz/ep-2'])
  await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === 'B1')!.click() })
  expect(host.textContent).toContain('No episodes match your filters')
  expect(episodeLinks()).toEqual([])
})

it('shows every episode for an empty search and resets with the sidebar reset', async () => {
  await render()
  await typeSearch('  ')
  expect(episodeLinks()).toHaveLength(3)
  await typeSearch('saiyan')
  expect(episodeLinks()).toEqual(['/cartoons/dbz/ep-1'])
  await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === 'Reset Filters')!.click() })
  expect(searchInput().value).toBe('')
  expect(episodeLinks()).toHaveLength(3)
})
