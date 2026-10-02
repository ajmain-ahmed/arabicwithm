import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ access: vi.fn(), auth: { user: { id: 'admin' } as { id: string } | null, loading: false } }))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/app/actions/auth', () => ({ getAuthenticatedAccess: mocks.access }))
import { useAccountAccess } from './useAccountAccess'
let host: HTMLDivElement, root: Root
function Probe({ refresh = '' }: { refresh?: string }) {
  const access = useAccountAccess(refresh)
  return <span>{JSON.stringify(access)}</span>
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  mocks.auth.user = { id: 'admin' }; mocks.auth.loading = false
  mocks.access.mockResolvedValue({ userId: 'admin', role: 'admin', admin: true })
  host = document.createElement('div'); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); vi.resetAllMocks() })
it.each(['admin', 'editor', 'user'])('uses server-verified %s role for both navigation permissions', async role => {
  mocks.access.mockResolvedValue({ userId: 'admin', role, admin: role === 'admin' })
  await act(async () => root.render(<Probe />))
  expect(JSON.parse(host.textContent!)).toEqual({ isAdmin: role === 'admin', isReviewer: role !== 'user' })
})
it('ignores results for a different authenticated identity and fails closed on errors', async () => {
  mocks.access.mockResolvedValue({ userId: 'someone-else', role: 'admin', admin: true })
  await act(async () => root.render(<Probe />))
  expect(host.textContent).toContain('"isAdmin":false')
  mocks.access.mockRejectedValue(new Error('Unable to verify role'))
  await act(async () => root.render(<Probe refresh="open" />))
  expect(host.textContent).toContain('"isAdmin":false')
})
it('refreshes when menus open and on window focus, and hides privileges on sign-out', async () => {
  await act(async () => root.render(<Probe />))
  expect(host.textContent).toContain('"isAdmin":true')
  mocks.access.mockResolvedValue({ userId: 'admin', role: 'editor', admin: false })
  await act(async () => root.render(<Probe refresh="menu-open" />))
  expect(host.textContent).toContain('"isAdmin":false')
  mocks.access.mockResolvedValue({ userId: 'admin', role: 'admin', admin: true })
  await act(async () => window.dispatchEvent(new Event('focus')))
  expect(host.textContent).toContain('"isAdmin":true')
  mocks.auth.user = null
  await act(async () => root.render(<Probe />))
  expect(host.textContent).toContain('"isAdmin":false')
})
it('discards a late Admin response after the signed-in account changes', async () => {
  let finish!: (value: unknown) => void
  mocks.access.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  await act(async () => root.render(<Probe />))
  mocks.auth.user = { id: 'normal' }
  mocks.access.mockResolvedValue({ userId: 'normal', role: 'user', admin: false })
  await act(async () => root.render(<Probe />))
  await act(async () => finish({ userId: 'admin', role: 'admin', admin: true }))
  expect(host.textContent).toContain('"isAdmin":false')
})
