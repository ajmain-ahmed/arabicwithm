import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: { id: 'reader' } as { id: string } | null, load: vi.fn(), set: vi.fn() }))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }))
vi.mock('@/app/actions/bookReleaseReminders', () => ({ bookReleaseReminder: mocks.load, setBookReleaseReminder: mocks.set }))
vi.mock('@/app/books/useBookCatalogueRefresh', () => ({ default: () => {} }))
vi.mock('./BookMyListToggle', () => ({ default: () => <button>My List</button> }))
import BookInProgress from './BookInProgress'
let host: HTMLDivElement, root: Root
const book = '11111111-1111-4111-8111-111111111111'
const button = (label: string) => Array.from(host.querySelectorAll('button')).find(element => element.textContent === label)!
const render = () => act(async () => root.render(<BookInProgress bookId={book} bookSlug="prepared" />))
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); sessionStorage.clear()
  mocks.user = { id: 'reader' }; mocks.load.mockResolvedValue({ ok: true, state: { active: false, fulfilled: false } })
  mocks.set.mockImplementation(async (_id: string, subscribe: boolean) => ({ ok: true, state: { active: subscribe, fulfilled: false } }))
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
it('sets one reminder, displays confirmation and allows cancellation', async () => {
  await render(); expect(host.textContent).toContain('This book is in progress')
  await act(async () => { button('Remind Me').click(); button('Remind Me').click() })
  expect(mocks.set).toHaveBeenCalledTimes(1); expect(host.textContent).toContain('Reminder set')
  await act(async () => button('Cancel Reminder').click())
  expect(mocks.set).toHaveBeenLastCalledWith(book, false); expect(button('Remind Me')).toBeDefined()
})
it('opens existing sign-in and restores the reminder intent on the same book after authentication', async () => {
  mocks.user = null; const open = vi.fn(); window.addEventListener('open-auth-dialog', open)
  try {
    await render(); await act(async () => button('Remind Me').click())
    expect(open).toHaveBeenCalledTimes(1); expect(mocks.set).not.toHaveBeenCalled()
    mocks.user = { id: 'signed-in-reader' }; await render()
    expect(mocks.set).toHaveBeenCalledWith(book, true); expect(host.textContent).toContain('Reminder set')
  } finally { window.removeEventListener('open-auth-dialog', open) }
})
it('keeps errors retryable and does not offer fulfilled reminders again', async () => {
  mocks.set.mockResolvedValue({ ok: false, error: 'Please try again.' })
  await render(); await act(async () => button('Remind Me').click())
  expect(host.textContent).toContain('Please try again.'); expect(button('Remind Me')).toBeDefined()
  mocks.user = { id: 'fulfilled-reader' }; mocks.load.mockResolvedValue({ ok: true, state: { active: false, fulfilled: true } })
  await render(); expect(host.textContent).toContain('already been delivered'); expect(button('Remind Me')).toBeUndefined()
})
