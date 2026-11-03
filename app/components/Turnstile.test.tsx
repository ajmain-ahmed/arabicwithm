import React, { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Turnstile, { type TurnstileHandle } from './Turnstile'

const mocks = vi.hoisted(() => ({
  render: vi.fn(() => 'widget-id'),
  reset: vi.fn(),
  remove: vi.fn(),
}))

let root: Root
let host: HTMLDivElement
let originalSiteKey: string | undefined

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.resetAllMocks()
  mocks.render.mockReturnValue('widget-id')
  window.turnstile = mocks
  originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-site-key'
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  delete window.turnstile
  if (originalSiteKey === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey
})

it('renders nothing when no site key is configured', async () => {
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  await act(async () => root.render(<Turnstile onToken={vi.fn()} />))
  expect(host.firstChild).toBeNull()
  expect(mocks.render).not.toHaveBeenCalled()
})

it('renders the widget with the configured site key and routes the token callback', async () => {
  const onToken = vi.fn()
  await act(async () => root.render(<Turnstile onToken={onToken} />))
  await act(async () => {})
  expect(mocks.render).toHaveBeenCalledOnce()
  const [, options] = mocks.render.mock.calls[0] as unknown as [HTMLElement, { sitekey: string; callback: (token: string) => void }]
  expect(options.sitekey).toBe('test-site-key')
  options.callback('test-token')
  expect(onToken).toHaveBeenCalledWith('test-token')
})

it('reset() forwards to the Turnstile widget', async () => {
  const ref = createRef<TurnstileHandle>()
  await act(async () => root.render(<Turnstile ref={ref} onToken={vi.fn()} />))
  await act(async () => {})
  expect(mocks.render).toHaveBeenCalledOnce()
  await act(async () => ref.current!.reset())
  expect(mocks.reset).toHaveBeenCalledWith('widget-id')
})
