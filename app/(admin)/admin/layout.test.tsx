// @vitest-environment node
import { expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ admin: vi.fn(), redirect: vi.fn(() => { throw new Error('Redirected') }) }))
vi.mock('@/app/actions/auth', () => ({ isAdminUser: mocks.admin }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('./components/AdminNav', () => ({ default: () => null }))
vi.mock('./components/AdminThemeProvider', () => ({ default: () => null }))
import AdminLayout from './layout'
it('renders the existing Admin area for authorized admins', async () => {
  mocks.admin.mockResolvedValue(true)
  expect(await AdminLayout({ children: <span>Users</span> })).toBeTruthy()
})
it.each(['editor', 'user', 'signed-out'])('redirects %s accounts away from manually requested Admin routes', async () => {
  mocks.admin.mockResolvedValue(false)
  await expect(AdminLayout({ children: <span>Users</span> })).rejects.toThrow('Redirected')
  expect(mocks.redirect).toHaveBeenCalledWith('/')
})
