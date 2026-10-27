import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ pathname: '/', mobile: false, role: 'admin', push: vi.fn(), auth: { user: { id: 'admin', email: 'admin@example.com' } as { id: string; email: string } | null } }))

// Navigation tests exercise destinations rather than decorative icon rendering.
vi.mock('@mui/icons-material', () => {
  const Icon = () => <svg aria-hidden="true" />
  return { AdminPanelSettings: Icon, DarkModeOutlined: Icon, LightModeOutlined: Icon, MenuOutlined: Icon, Person: Icon, BookOutlined: Icon, EmailSharp: Icon, ExploreOutlined: Icon, HomeOutlined: Icon, LogoutSharp: Icon, Movie: Icon, PsychologyOutlined: Icon, RateReviewOutlined: Icon, VolunteerActivismRounded: Icon, AccountCircleOutlined: Icon, Close: Icon, Home: Icon, MenuBook: Icon, Menu: Icon, ArrowForward: Icon, AutoStories: Icon, CalendarMonthRounded: Icon, CheckCircleRounded: Icon, Headphones: Icon, LocalFireDepartmentRounded: Icon, DiamondOutlined: Icon, MilitaryTechRounded: Icon, SettingsOutlined: Icon, GridOnRounded: Icon, BookmarkRounded: Icon, AccountTreeOutlined: Icon, SchoolOutlined: Icon }
})
vi.mock('@/app/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/app/actions/profiles', () => ({ fetchMyDisplayName: vi.fn(() => Promise.resolve(null)) }))
vi.mock('@/app/actions/premium', () => ({ fetchPremiumStatus: vi.fn(() => Promise.resolve({ premium: false, manageable: false })), managePremium: vi.fn(), startPremiumCheckout: vi.fn() }))
vi.mock('@/app/lib/useAccountAccess', () => ({ useAccountAccess: () => ({ isAdmin: mocks.role === 'admin', isReviewer: ['admin','editor'].includes(mocks.role) }) }))
vi.mock('@/app/components/ThemeProvider', () => ({ useColorMode: () => ({ mode: 'light', toggleColorMode: vi.fn() }) }))
vi.mock('@/app/components/AuthDialog', () => ({ default: () => null }))
vi.mock('./ContactDialog', () => ({ default: () => null }))
vi.mock('./PremiumMemberMark', () => ({ default: () => null }))
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
it.each([false, true])('links to the Learn hub without listing individual learning tools on mobile=%s', async mobile => {
 mocks.mobile = mobile; mocks.auth.user = null; mocks.role = 'user'
 await act(async () => root.render(<Navbar />))
 if (mobile) {
  await act(async () => (host.querySelector('[aria-label="Open menu"]') as HTMLElement).click())
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 150)) }) // flush the dynamically imported drawer chunk
  const items = [...document.querySelectorAll('.mobile-list-btn')]
  expect(items.map(button => button.textContent)).toContain('Learn')
  for (const label of ['Memory','Grammar','Word Search']) expect(items.map(button => button.textContent)).not.toContain(label)
  await act(async () => (items.find(button => button.textContent === 'Learn') as HTMLElement).click())
  expect(mocks.push).toHaveBeenCalledWith('/learn')
 } else expect(host.querySelector('nav a[href="/learn"]')).not.toBeNull()
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
  expect(buttons.some(button => button.textContent === 'Learn')).toBe(true)
  if (admin) {
    await act(async () => (admin as HTMLElement).click())
    expect(mocks.push).toHaveBeenCalledWith('/admin/users')
  }
})

const expectedPrimary = ['Home', 'Explore', 'Watch', 'Read', 'Learn']
const expectedPrimaryHrefs = ['/', '/explore', '/cartoons', '/books', '/learn']
const expectedFloating = ['Home', 'Explore', 'Watch', 'Read', 'Learn']
it.each(['guest', 'user', 'admin', 'premium'])('keeps exactly five primary destinations for %s on Home and Word Search', async role => {
  mocks.role = role
  mocks.auth.user = role === 'guest' ? null : { id: role, email: `${role}@example.com` }
  for (const pathname of ['/', '/word-search']) {
    mocks.pathname = pathname
    mocks.mobile = false
    await act(async () => root.render(<Navbar />))
    const nav = host.querySelector('nav[aria-label="Primary navigation"]')!
    for (const label of expectedPrimary) expect(nav.textContent).toContain(label)
    const links = [...nav.querySelectorAll('a')]
    expect(links.map(link => link.getAttribute('href'))).toEqual(expectedPrimaryHrefs)
    expect(links.some(link => link.getAttribute('aria-current') === 'page')).toBe(false)
    mocks.mobile = true
    await act(async () => root.render(<Navbar />))
    await act(async () => (host.querySelector('[aria-label="Open menu"]') as HTMLElement).click())
    const labels = [...document.querySelectorAll('.mobile-list-btn')].map(button => button.textContent)
    for (const label of ['Home', 'Explore', 'Watch', 'Read', 'Learn']) expect(labels).toContain(label)
    await act(async () => root.render(<div />))
  }
})

it('keeps floating mobile navigation at five destinations with none active on Word Search', async () => {
  mocks.mobile = true
  mocks.pathname = '/word-search'
  await act(async () => root.render(<MobileBottomNav />))
  await act(async () => (host.querySelector('[aria-label="Open navigation"]') as HTMLElement).click())
  const buttons = [...document.querySelectorAll('#mobile-navigation button')]
  expect(buttons.map(button => button.textContent)).toEqual(expectedFloating)
  expect(buttons.some(button => button.hasAttribute('aria-current'))).toBe(false)
  await act(async () => (buttons[3] as HTMLElement).click())
  expect(mocks.push).toHaveBeenCalledWith('/books')
})

it.each([false, true])('preserves authorised Home management navigation on mobile=%s', async mobile => {
 mocks.mobile = mobile
 await act(async () => root.render(<Navbar />))
 const trigger = host.querySelector(mobile ? '[aria-label="Open menu"]' : '[aria-label="Open user menu"]') as HTMLElement
 await act(async () => trigger.click())
 expect(document.body.textContent).toContain('Admin')
})

it('routes every normal mobile entry once and closes without permission UI',async()=>{
 mocks.mobile=true;mocks.role='user';mocks.pathname='/books'
 const entries=[['My Profile','/profile/admin'],['Home','/'],['Explore','/explore'],['Watch','/cartoons'],['Read','/books'],['Learn','/learn'],['Give Feedback','/feedback'],['Support Us','/support']]
 await act(async()=>root.render(<Navbar/>))
 for(const [label,href] of entries){
  await act(async()=> (host.querySelector('[aria-label="Open menu"]') as HTMLElement).click())
  const items=[...document.querySelectorAll('.mobile-list-btn')]
  expect(items.map(item=>item.textContent)).toEqual([...entries.map(([name])=>name),'Settings','Sign Out'])
  expect(document.body.textContent).not.toMatch(/Checking permissions|Verifying permissions|Contact|Reviewer/)
  const item=items.find(item=>item.textContent===label) as HTMLElement
  mocks.push.mockClear();await act(async()=>item.click())
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith(href)
 }
})


it.each(['user', 'premium'])('groups the normal %s mobile menu with dividers after Profile and Learn', async role => {
  mocks.mobile = true; mocks.role = role
  await act(async () => root.render(<Navbar />))
  await act(async () => (host.querySelector('[aria-label="Open menu"]') as HTMLElement).click())
  expect([...document.querySelectorAll('.mobile-list-btn')].map(node => node.textContent)).toEqual(['My Profile','Home','Explore','Watch','Read','Learn','Give Feedback','Support Us','Settings','Sign Out'])
  const dividers = [...document.querySelectorAll('[data-nav-divider]')]
  expect(dividers.map(node => node.getAttribute('data-nav-divider'))).toEqual(['My Profile','Learn','Support Us'])
  expect(dividers.map(node => node.previousElementSibling?.textContent)).toEqual(['My Profile','Learn','Support Us'])
})
