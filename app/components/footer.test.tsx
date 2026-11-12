import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Footer from './footer'

const push = vi.fn()
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('@/app/actions/premium', () => ({ fetchPremiumStatus: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  push.mockReset()
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('opens Contact Us and Support Us dialogs instead of navigating', async () => {
  await act(async () => root.render(<Footer />))
  for (const [label, eventName] of [['Contact Us', 'open-contact-dialog'], ['Support Us', 'open-support-dialog']]) {
    const open = vi.fn()
    window.addEventListener(eventName, open)
    const button = [...host.querySelectorAll('button')].find(node => node.textContent === label)!
    await act(async () => button.click())
    expect(open).toHaveBeenCalledOnce()
    window.removeEventListener(eventName, open)
  }
  expect(push).not.toHaveBeenCalled()
  expect(host.querySelector('a[href="mailto:support@arabicwithm.com"]')).not.toBeNull()
})
