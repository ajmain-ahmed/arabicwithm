import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ list: vi.fn(), details: vi.fn(), change: vi.fn() }))
vi.mock('@/app/actions/reviews', () => ({ listManagedUsers: mocks.list, managedUserDetails: mocks.details, changeManagedAccess: mocks.change }))
import UsersDashboard from './UsersDashboard'

it('loads the existing user directory, premium information and User/Editor/Admin controls', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  const id = '11111111-1111-4111-8111-111111111111'
  mocks.list.mockResolvedValue({ total: 1, counts: { all: 1, premium: 1, editor: 0, admin: 1 }, users: [{ id, name: 'Account owner', email: 'owner@example.com', role: 'admin', premium: true, paid_premium: true, avatar: null, joined: '2026-10-01', last_sign_in: null, subscription_status: 'active', current_period_end: '2026-11-01', activity: null }] })
  mocks.details.mockResolvedValue({ history: [],manual:{enabled:false,history:[]} })
  vi.useFakeTimers()
  try {
    await act(async () => root.render(<UsersDashboard />))
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    expect(mocks.list).toHaveBeenCalledWith('all', '', 0)
    expect(host.textContent).toContain('Account owner')
    expect(host.textContent).toContain('Premium')
    const view = [...host.querySelectorAll('button')].find(button => button.textContent === 'View User')!
    await act(async () => view.click())
    expect(mocks.details).toHaveBeenCalledWith(id)
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Access Level')
    expect(dialog.querySelector('[aria-label="Account information"]')).toBeNull()
    expect([...dialog.querySelectorAll('input[type="checkbox"]')]).toHaveLength(4)
    expect(dialog.textContent).toContain('Notes (optional)')
    expect(dialog.textContent).not.toContain('Reason for')
    await act(async()=> (dialog.querySelector('[aria-label="Information"]') as HTMLElement).click())
    expect(dialog.querySelector('[aria-label="Account information"]')?.textContent).toContain('Subscription: active')
    expect(mocks.change).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount()); host.remove(); vi.useRealTimers()
  }
})
