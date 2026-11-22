import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ user: null as { id: string } | null, loading: false, close: vi.fn() }))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, loading: mocks.loading }) }))
vi.mock('@/app/components/AuthDialog', () => ({ default: ({ open, purpose }: { open: boolean; purpose: string }) => open ? <div role="dialog">{purpose}</div> : null }))

import SignInRequired from './SignInRequired'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  mocks.user = null
  mocks.loading = false
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('opens only the sign-in dialog without a page heading or duplicate button', async () => {
  await act(async () => root.render(<SignInRequired title="Sign in to read A New Beginning" />))
  expect(host.querySelector('[role="dialog"]')?.textContent).toBe('Sign in to read A New Beginning')
  expect(host.querySelector('h1,h2,button')).toBeNull()
})

it('renders no wall while auth restores or after the user signs in', async () => {
  mocks.loading = true
  await act(async () => root.render(<SignInRequired />))
  expect(host.textContent).toBe('')
  mocks.loading = false
  mocks.user = { id: 'reader' }
  await act(async () => root.render(<SignInRequired />))
  expect(host.textContent).toBe('')
})
