import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { PublicProfile } from '@/app/actions/profiles'
import { emptyLearningActivity } from '@/app/lib/activity'
import { summarizeLearningDashboard } from '@/app/lib/learningDashboard'
const mocks = vi.hoisted(() => ({ trophies:vi.fn(), update: vi.fn(), getUser: vi.fn(), metadata: { book_progress: { story: { chapterSlug: 'one', updatedAt: '2026-10-01' }, other: { chapterSlug: 'two' } }, book_sentence_bookmark: { bookSlug: 'story' } } }))
vi.mock('@/app/actions/profiles', () => ({ updateProfile: vi.fn(),saveTrophyHighlights:mocks.trophies }))
vi.mock('@/app/components/PremiumPrompt', () => ({ PremiumSection: () => null }))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ loading: false, user: { id: 'user', user_metadata: mocks.metadata } }) }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { auth: { updateUser: mocks.update, getUser: mocks.getUser } } }))
import ProfileView from './ProfileView'
import HomeQuickActions from '@/app/components/home/HomeQuickActions'
import { platformDate } from '@/app/lib/entitlements'
let host: HTMLDivElement, root: Root
function profile(premium = false): PublicProfile {
  const learning = emptyLearningActivity()
  return { id: 'user', own: true, displayName: 'Learner', username: null, isPublic: false, shareReading: false, joined: '2026-10-01', avatar: null, avatarCrop: { x: 50, y: 50, zoom: 1 }, featuredTrophies: [], premium, learning, summary: summarizeLearningDashboard(learning), level: 1, xp: 0, weekXp: 0, memoryCards: 0, shelf: [] }
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  mocks.trophies.mockImplementation(async(ids)=>ids);
  mocks.update.mockResolvedValue({ error: null }); mocks.getUser.mockResolvedValue({ data: { user: { id: 'user', user_metadata: mocks.metadata } }, error: null })
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.clearAllMocks() })
it('renders genuine new-account empty states and only shows AWM Plus for eligible users', async () => {
  await act(async () => root.render(<ProfileView profile={profile()} />))
  expect(host.querySelector('[aria-label="AWM Plus"]')).toBeNull()
  expect(host.textContent).toContain('0 day streak'); expect(host.textContent).toContain('No current book')
  expect(host.textContent).toContain('Your first milestone is ahead'); expect(host.textContent).toContain('No learning time recorded')
  expect(host.querySelector('button[aria-label="Change profile photo"]')).not.toBeNull()
  await act(async () => root.render(<ProfileView profile={profile(true)} />))
  expect(host.querySelector('[aria-label="AWM Plus"]')).not.toBeNull()
  expect(host.querySelectorAll('[aria-label="Learning statistics"] > section')).toHaveLength(2)
  expect(host.querySelectorAll('[aria-label="Learning statistics"] button')).toHaveLength(8)
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
it('shows recorded chart values and exposes achievement requirements to keyboard and touch users', async () => {
  const value = profile()
  value.avatar = 'https://example.com/avatar.webp'
  value.learning.daily = [{ date: platformDate(), activeSeconds: 600, readingSeconds: 600, videoSeconds: 0, wordLookups: 50, xp: 18 }]
  value.learning.lifetime = { readingSeconds: 600, videoSeconds: 0, wordLookups: 50 }
  value.learning.activeDates = [platformDate()]
  value.learning.totalSeconds = 600
  value.learning.xp = { totalXp: 18, weekXp: 18 }
  value.summary = summarizeLearningDashboard(value.learning)
  value.xp = 18; value.weekXp = 18
  await act(async () => root.render(<ProfileView profile={value} />))
  expect(host.querySelector('img[alt="Learner"]')?.getAttribute('src')).toBe(value.avatar)
  expect(host.querySelector('svg[role="img"] title')?.textContent).toContain('Recorded learning minutes')
  const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent === text)!
  await act(async () => { button('Last 28 days').click(); button('XP earned').click() })
  expect(host.querySelector('svg[role="img"] title')?.textContent).toContain('XP earned in the last 28 days')
  expect(host.querySelectorAll('tbody tr')).toHaveLength(28)
  expect(host.querySelector('tbody tr:last-child')?.textContent).toContain('18')
  await act(async () => (host.querySelector('[aria-label^="Total words inspected:"]') as HTMLElement).click())
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('50 inspections')
  await act(async () => (document.querySelector('[aria-label="Close activity details"]') as HTMLElement).click())
  await act(async () => (host.querySelector('[aria-label="Open Trophy Cabinet"]') as HTMLElement).click())
  expect(document.querySelector('[aria-label="Achievement categories"]')).toBeNull()
  const earned = document.querySelector('[tabindex="0"][aria-label*="Word Explorer 1"]')!
  expect(earned.getAttribute('aria-label')).toContain('Earned: Reach 50 word inspections')
  expect(document.querySelector('[aria-label*="Word Explorer 2"]')?.textContent).toContain('50 / 100')
  expect(earned.textContent).toContain('Reach 50 word inspections')
  await act(async()=> (earned.parentElement!.querySelector('button') as HTMLElement).click())
  const saveHighlights = [...document.querySelectorAll('button')].find(b => b.textContent === 'Save trophy highlights')!
  await act(async () => saveHighlights.click())
  expect(mocks.trophies).toHaveBeenCalledWith(['words-50'])
})
