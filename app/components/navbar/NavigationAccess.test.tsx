import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ pathname: '/', mobile: false, role: 'admin', push: vi.fn(), auth: { user: { id: 'admin', email: 'admin@example.com' } as { id: string; email: string } | null } }))

// Navigation tests exercise destinations rather than decorative icon rendering.
vi.mock('@mui/icons-material', () => {
  const Icon = () => <svg aria-hidden="true" />
  return { AdminPanelSettings: Icon, DarkModeOutlined: Icon, LightModeOutlined: Icon, MenuOutlined: Icon, Person: Icon, BookOutlined: Icon, EmailSharp: Icon, ExploreOutlined: Icon, HomeOutlined: Icon, LogoutSharp: Icon, Movie: Icon, PsychologyOutlined: Icon, RateReviewOutlined: Icon, VolunteerActivismRounded: Icon, AccountCircleOutlined: Icon, Close: Icon, Home: Icon, MenuBook: Icon, Menu: Icon, ArrowForward: Icon, AutoStories: Icon, CalendarMonthRounded: Icon, CheckCircleRounded: Icon, Headphones: Icon, LocalFireDepartmentRounded: Icon, MilitaryTechRounded: Icon, SettingsOutlined: Icon, GridOnRounded: Icon, BookmarkRounded: Icon }
})
vi.mock('@/app/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/app/lib/useAccountAccess', () => ({ useAccountAccess: () => ({ isAdmin: mocks.role === 'admin', isReviewer: mocks.role !== 'user' }) }))
vi.mock('@/app/components/ThemeProvider', () => ({ useColorMode: () => ({ mode: 'light', toggleColorMode: vi.fn() }) }))
vi.mock('@/app/components/AuthDialog', () => ({ default: () => null }))
vi.mock('./ContactDialog', () => ({ default: () => null }))
vi.mock('./BrandLogo', () => ({ default: () => <span>Arabic With M</span> }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { auth: { signOut: vi.fn() } } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => mocks.pathname }))
vi.mock('@mui/material', async importOriginal => ({ ...await importOriginal<typeof import('@mui/material')>(), useMediaQuery: () => mocks.mobile }))
import Navbar from './index'
import MobileBottomNav from '@/app/components/MobileBottomNav'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  mocks.pathname = '/'; mocks.mobile = false; mocks.role = 'admin'; mocks.push.mockReset()
  mocks.auth.user = { id: 'admin', email: 'admin@example.com' }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
it.each([false, true])('omits Word Search from desktop and responsive website navigation on mobile=%s', async mobile => {
  mocks.mobile = mobile; mocks.auth.user = null; mocks.role = 'user'
  await act(async () => root.render(<Navbar />))
  if (mobile) {
    await act(async () => (host.querySelector('[aria-label="Open menu"]') as HTMLElement).click())
    expect([...document.querySelectorAll('[role="button"]')].some(button => button.textContent === 'Word Search')).toBe(false)
  } else expect(host.querySelector('a[href="/word-search"]')).toBeNull()
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
it.each(['admin', 'editor', 'user'])('shows the desktop Admin entry only for %s permissions and retains account navigation', async role => {
  mocks.role = role; mocks.pathname = '/books'
  await act(async () => root.render(<Navbar />))
  const link = host.querySelector('a[href="/admin/users"]')
  expect(Boolean(link)).toBe(role === 'admin')
  if (link) expect(link.textContent).toBe('Admin')
  expect(host.querySelector('a[href="/books"]')).not.toBeNull()
  expect(host.querySelector('a[href="/word-search"]')).toBeNull()
  await act(async () => (host.querySelector('[aria-label="Open user menu"]') as HTMLElement).click())
  const menu = document.querySelector('[role="menu"]')!
  expect(menu.querySelector('a[href="/profile/admin"]')).not.toBeNull()
  expect(Boolean(menu.querySelector('a[href="/admin/users"]'))).toBe(role === 'admin')
  expect(Boolean(menu.querySelector('a[href="/reviewer"]'))).toBe(role !== 'user')
  const profile=menu.querySelector('a[href="/profile/admin"]')!
  for(const destination of ['/reviewer','/admin/users']){
    const item=menu.querySelector(`a[href="${destination}"]`)
    if(item){expect(item.className).toBe(profile.className);expect(item.querySelector('.MuiTypography-root')?.className).toBe(profile.querySelector('.MuiTypography-root')?.className)}
  }
  expect(menu.textContent).toContain('Sign Out')
})
it.each(['admin', 'editor', 'user'])('offers the correct mobile destinations for %s permissions', async role => {
  mocks.mobile = true; mocks.role = role; mocks.pathname = '/books'
  await act(async () => root.render(<Navbar />))
  await act(async () => (host.querySelector('[aria-label="Open menu"]') as HTMLElement).click())
  const buttons = [...document.querySelectorAll('[role="button"]')]
  const admin = buttons.find(button => button.textContent === 'Admin')
  expect(Boolean(admin)).toBe(role === 'admin')
  expect(buttons.some(button => button.textContent === 'Reviewer')).toBe(role !== 'user')
  expect(buttons.some(button => button.textContent === 'My Profile')).toBe(true)
  expect(buttons.some(button => button.textContent === 'Word Search')).toBe(false)
  if (admin) {
    await act(async () => (admin as HTMLElement).click())
    expect(mocks.push).toHaveBeenCalledWith('/admin/users')
  }
})

const expectedPrimary = ['Home', 'Explore', 'Watch', 'Read', 'Memory']
it.each(['guest', 'user', 'admin', 'premium'])('keeps exactly five primary destinations for %s on Home and Word Search', async role => {
  mocks.role = role
  mocks.auth.user = role === 'guest' ? null : { id: role, email: `${role}@example.com` }
  for (const pathname of ['/', '/word-search']) {
    mocks.pathname = pathname
    mocks.mobile = false
    await act(async () => root.render(<Navbar />))
    const links = [...host.querySelectorAll('nav[aria-label="Primary navigation"] a')]
    expect(links.map(link => link.textContent)).toEqual(expectedPrimary)
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/', '/explore', '/cartoons', '/books', '/memory'])
    expect(links.some(link => link.getAttribute('aria-current') === 'page')).toBe(false)
    mocks.mobile = true
    await act(async () => root.render(<Navbar />))
    await act(async () => (host.querySelector('[aria-label="Open menu"]') as HTMLElement).click())
    const labels = [...document.querySelectorAll('.mobile-list-btn')].map(button => button.textContent)
    expect(labels.filter(label => expectedPrimary.includes(label!))).toEqual(expectedPrimary)
    expect(labels).not.toContain('Word Search')
    await act(async () => root.render(<div />))
  }
})

it('keeps floating mobile navigation at five destinations with none active on Word Search', async () => {
  mocks.mobile = true
  mocks.pathname = '/word-search'
  await act(async () => root.render(<MobileBottomNav />))
  await act(async () => (host.querySelector('[aria-label="Open navigation"]') as HTMLElement).click())
  const buttons = [...document.querySelectorAll('#mobile-navigation button')]
  expect(buttons.map(button => button.textContent)).toEqual(expectedPrimary)
  expect(buttons.some(button => button.hasAttribute('aria-current'))).toBe(false)
  await act(async () => (buttons[3] as HTMLElement).click())
  expect(mocks.push).toHaveBeenCalledWith('/books')
})

it.each([false, true])('leaves Home Admin access solely in Quick Actions on mobile=%s', async mobile => {
  mocks.mobile = mobile
  await act(async () => root.render(<Navbar />))
  expect(host.querySelector('a[href="/admin/users"]')).toBeNull()
  const trigger = host.querySelector(mobile ? '[aria-label="Open menu"]' : '[aria-label="Open user menu"]') as HTMLElement
  await act(async () => trigger.click())
  expect(document.querySelector('a[href="/admin/users"]')).toBeNull()
  expect([...document.querySelectorAll('.mobile-list-btn')].some(button => button.textContent === 'Admin')).toBe(false)
})

it('routes every normal mobile entry once and closes without permission UI',async()=>{
 mocks.mobile=true;mocks.role='user';mocks.pathname='/books'
 const entries=[['My Profile','/profile/admin'],['Home','/'],['Explore','/explore'],['Watch','/cartoons'],['Read','/books'],['Memory','/memory'],['Give Feedback','/feedback'],['Support Us','/support']]
 await act(async()=>root.render(<Navbar/>))
 for(const [label,href] of entries){
  await act(async()=> (host.querySelector('[aria-label="Open menu"]') as HTMLElement).click())
  const items=[...document.querySelectorAll('.mobile-list-btn')]
  expect(items.map(item=>item.textContent)).toEqual(entries.map(([name])=>name))
  expect(document.body.textContent).not.toMatch(/Checking permissions|Verifying permissions|Contact|Reviewer/)
  const item=items.find(item=>item.textContent===label) as HTMLElement
  mocks.push.mockClear();await act(async()=>item.click())
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith(href)
 }
})
