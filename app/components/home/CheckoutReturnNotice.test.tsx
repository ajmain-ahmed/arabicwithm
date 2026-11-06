import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('@/app/lib/premiumStatusCache', () => ({ refreshPremiumStatus: mocks.refresh }))

import CheckoutReturnNotice from './CheckoutReturnNotice'

let root: Root, host: HTMLDivElement
const free = { premium: false, signedIn: true, manageable: true, admin: false, cancelAtPeriodEnd: false, periodEnd: '2999-01-01T00:00:00.000Z', paymentIssue: false }

function setLocation(search: string) {
  window.history.replaceState(null, '', `/${search}`)
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.clearAllMocks()
  vi.useRealTimers()
  setLocation('')
  mocks.refresh.mockResolvedValue(free)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

async function render() {
  await act(async () => root.render(<CheckoutReturnNotice userId="member" />))
}

it('shows the activating state after a successful checkout and consumes the parameter', async () => {
  setLocation('?checkout=success')
  await render()
  expect(document.body.textContent).toContain('Your AWM+ access is activating')
  expect(window.location.search).toBe('')
  expect(mocks.refresh).toHaveBeenCalled()
})

it('confirms once the webhook has synced, then dismisses itself', async () => {
  vi.useFakeTimers()
  mocks.refresh.mockResolvedValue({ ...free, premium: true })
  setLocation('?checkout=success')
  await render()
  expect(document.body.textContent).toContain('AWM+ is active')
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
  expect(document.body.textContent).not.toContain('AWM+ is active')
})

it('escalates when access has not synced after the polling window', async () => {
  vi.useFakeTimers()
  setLocation('?checkout=success')
  await render()
  expect(document.body.textContent).toContain('activating')
  await act(async () => { await vi.advanceTimersByTimeAsync(4000 * 8 + 1000) })
  expect(mocks.refresh).toHaveBeenCalledTimes(8)
  expect(document.body.textContent).toContain('taking longer than expected')
  expect(document.body.textContent).toContain('hello@arabicwithm.com')
})

it('shows the cancelled state without polling premium status', async () => {
  setLocation('?checkout=cancelled')
  await render()
  expect(document.body.textContent).toContain('Checkout cancelled')
  expect(document.body.textContent).toContain('haven’t been charged')
  expect(mocks.refresh).not.toHaveBeenCalled()
  expect(window.location.search).toBe('')
})

it('renders nothing without a checkout parameter', async () => {
  await render()
  expect(document.body.textContent ?? '').not.toContain('activating')
  expect(document.body.textContent ?? '').not.toContain('Checkout cancelled')
  expect(mocks.refresh).not.toHaveBeenCalled()
})

it('dismisses on request', async () => {
  setLocation('?checkout=success')
  await render()
  expect(document.body.textContent).toContain('activating')
  await act(async () => {
    document.querySelector('button[aria-label="Dismiss notice"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  expect(document.body.textContent ?? '').not.toContain('activating')
})
