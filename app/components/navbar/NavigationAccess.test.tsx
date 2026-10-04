import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ mobile: false, role: 'admin', push: vi.fn(), auth: { user: { id: 'admin', email: 'admin@example.com' } as { id: string; email: string } | null } }))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/app/lib/useAccountAccess', () => ({ useAccountAccess: () => ({ isAdmin: mocks.role === 'admin', isReviewer: mocks.role !== 'user' }) }))
vi.mock('@/app/components/ThemeProvider', () => ({ useColorMode: () => ({ mode: 'light', toggleColorMode: vi.fn() }) }))
vi.mock('@/app/components/AuthDialog', () => ({ default: () => null }))
vi.mock('./ContactDialog', () => ({ default: () => null }))
vi.mock('./BrandLogo', () => ({ default: () => <span>Arabic With M</span> }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { auth: { signOut: vi.fn() } } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/' }))
vi.mock('@mui/material', async importOriginal => ({ ...await importOriginal<typeof import('@mui/material')>(), useMediaQuery: () => mocks.mobile }))
import Navbar from './index'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  mocks.mobile = false; mocks.role = 'admin'; mocks.push.mockReset()
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
  mocks.role = role
  await act(async () => root.render(<Navbar />))
  const link = host.querySelector('a[href="/admin/users"]')
  expect(Boolean(link)).toBe(role === 'admin')
  if (link) expect(link.textContent).toBe('Admin')
  expect(host.querySelector('a[href="/books"]')).not.toBeNull()
  expect(host.querySelector('a[href="/word-search"]')).toBeNull()
  await act(async () => (host.querySelector('[aria-label="Open user menu"]') as HTMLElement).click())
  const menu = document.querySelector('[role="menu"]')!
  expect(menu.querySelector('a[href="/profile"]')).not.toBeNull()
  expect(Boolean(menu.querySelector('a[href="/admin/users"]'))).toBe(role === 'admin')
  expect(Boolean(menu.querySelector('a[href="/reviewer"]'))).toBe(role !== 'user')
  const profile=menu.querySelector('a[href="/profile"]')!
  for(const destination of ['/reviewer','/admin/users']){
    const item=menu.querySelector(`a[href="${destination}"]`)
    if(item){expect(item.className).toBe(profile.className);expect(item.querySelector('.MuiTypography-root')?.className).toBe(profile.querySelector('.MuiTypography-root')?.className)}
  }
  expect(menu.textContent).toContain('Sign Out')
})
it.each(['admin', 'editor', 'user'])('offers the correct mobile destinations for %s permissions', async role => {
  mocks.mobile = true; mocks.role = role
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
