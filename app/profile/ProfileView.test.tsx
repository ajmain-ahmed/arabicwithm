import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { PublicProfile } from '@/app/actions/profiles'
const mocks = vi.hoisted(() => ({ update: vi.fn(), getUser: vi.fn(), metadata: { book_progress: { story: { chapterSlug: 'one', updatedAt: '2026-10-01' }, other: { chapterSlug: 'two' } }, book_sentence_bookmark: { bookSlug: 'story' } } }))
vi.mock('@/app/actions/profiles', () => ({ updateProfile: vi.fn(), checkUsernameAvailability: vi.fn() }))
vi.mock('@/app/components/PremiumPrompt', () => ({ PremiumSection: () => null, default: ({open}:{open:boolean}) => open ? <div data-upgrade-popup>AWM+ information</div> : null }))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ loading: false, user: { id: 'user', user_metadata: mocks.metadata } }) }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { auth: { updateUser: mocks.update, getUser: mocks.getUser } } }))
import ProfileView from './ProfileView'
import HomeQuickActions from '@/app/components/home/HomeQuickActions'
let host: HTMLDivElement, root: Root
function profile(premium = false): PublicProfile {
  return { id: 'user', own: true, displayName: 'Learner', username: null, isPublic: false, shareReading: false, joined: '2026-10-01', avatar: null, avatarCrop: { x: 50, y: 50, zoom: 1 }, premium, summary: { streak: 0 }, shelf: [] }
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  mocks.update.mockResolvedValue({ error: null }); mocks.getUser.mockResolvedValue({ data: { user: { id: 'user', user_metadata: mocks.metadata } }, error: null })
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.clearAllMocks() })
it('renders genuine new-account empty states and only shows AWM Plus for eligible users', async () => {
  await act(async () => root.render(<ProfileView profile={profile()} />))
  expect(host.querySelector('[aria-label="AWM Plus"]')).toBeNull()
  expect(host.textContent).toContain('0 day streak'); expect(host.textContent).toContain('No current book')
  expect(host.querySelector('button[aria-label="Change profile photo"]')).not.toBeNull()
  await act(async () => root.render(<ProfileView profile={profile(true)} />))
  expect(host.querySelector('[aria-label="AWM Plus"]')).not.toBeNull()
})
it('shows the current streak from the profile summary', async () => {
  const value = profile()
  value.avatar = 'https://example.com/avatar.webp'
  value.summary = { streak: 3 }
  await act(async () => root.render(<ProfileView profile={value} />))
  expect(host.querySelector('img[alt="Learner"]')?.getAttribute('src')).toBe(value.avatar)
  expect(host.textContent).toContain('3 day streak')
  expect(host.textContent).not.toContain('Learning progress')
  expect(host.textContent).not.toContain('Your learning rhythm')
})
it('shows the reading cover/resume link and removes only list visibility', async () => {
  const value = profile()
  value.shelf = [{ slug: 'story', title: 'Story', author: 'Author', cover: '/cover.webp', coverCrop: { x: 50, y: 50, zoom: 1 }, chapter: 'One', position: 1, total: 3, href: '/books/story/one' }]
  await act(async () => root.render(<ProfileView profile={value} />))
  expect(host.querySelector('img[alt="Story cover"]')?.getAttribute('src')).toBe('/cover.webp')
  expect([...host.querySelectorAll('a')].find(a => a.textContent === 'Continue Reading')?.getAttribute('href')).toBe('/books/story/one')
  const remove = [...host.querySelectorAll('button')].find(b => b.textContent === 'Remove from List')!
  await act(async () => remove.click())
  expect(mocks.update).toHaveBeenCalledWith({ data: { book_progress: { ...mocks.metadata.book_progress, story: { ...mocks.metadata.book_progress.story, hiddenFromList: true } } } })
  expect(host.textContent).toContain('No current book'); expect(mocks.metadata.book_sentence_bookmark.bookSlug).toBe('story')
})
it('keeps learning shortcuts free of the separate Quick Actions Admin entry', async () => {
  await act(async () => root.render(<HomeQuickActions bookmarkHref="/books/story/one#sentence-4" bookmarkLabel="Story · One" />))
  const links = [...host.querySelectorAll('a')]
  expect(links.map(a => a.getAttribute('href'))).toEqual(['/books/story/one#sentence-4','/profile'])
  expect(links).toHaveLength(2);expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Learning shortcuts')
  await act(async () => root.render(<HomeQuickActions bookmarkHref="/books" bookmarkLabel="Books" />))
  expect(host.querySelector('a[href="/admin/users"]')).toBeNull()
  expect(host.textContent).not.toContain('Reviewer')
})
it('places the upgrade below the profile header only for non-premium owners', async () => {
 await act(async()=>root.render(<ProfileView profile={profile(false)}/>))
 const upgrade=[...host.querySelectorAll('button')].find(b=>b.textContent==='Upgrade to AWM+')!
 expect(upgrade).toBeTruthy()
 expect(host.querySelector('header')?.nextElementSibling?.contains(upgrade)).toBe(true)
 await act(async()=>upgrade.click())
 expect(host.querySelector('[data-upgrade-popup]')).not.toBeNull()
 await act(async()=>root.render(<ProfileView profile={profile(true)}/>))
 expect([...host.querySelectorAll('button')].some(b=>b.textContent==='Upgrade to AWM+')).toBe(false)
 await act(async()=>root.render(<ProfileView profile={{...profile(false),own:false}}/>))
 expect([...host.querySelectorAll('button')].some(b=>b.textContent==='Upgrade to AWM+')).toBe(false)
})
