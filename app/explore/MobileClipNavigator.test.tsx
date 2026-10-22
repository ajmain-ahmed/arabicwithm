import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import MobileClipNavigator from './MobileClipNavigator'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
const step = vi.fn()
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  step.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function render(canPrevious = true, busy = false) {
  await act(async () => root.render(<MobileClipNavigator clipKey="one" canPrevious={canPrevious} busy={busy} step={step}><div data-surface /><div data-feed-transcript><span>Transcript</span></div><button>Settings</button></MobileClipNavigator>))
  vi.advanceTimersByTime(701)
}
function wheel(deltaY: number, target: Element = host.querySelector('[data-surface]')!) {
  target.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }))
}
function swipe(start: number, end: number, target: Element = host.querySelector('[data-surface]')!) {
  for (const [type, y] of [['touchstart', start], ['touchmove', end], ['touchend', end]] as const) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperties(event, { touches: { value: type === 'touchend' ? [] : [{ clientX: 50, clientY: y }] }, changedTouches: { value: [{ clientX: 50, clientY: y }] } })
    target.dispatchEvent(event)
  }
}
it('moves down once per wheel gesture, absorbs inertia, and moves up to the previous clip', async () => {
  await render()
  wheel(35); wheel(35)
  expect(step.mock.calls).toEqual([[1]])
  for (let i = 0; i < 12; i++) { vi.advanceTimersByTime(100); wheel(80) }
  expect(step).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(701)
  wheel(-70)
  expect(step.mock.calls).toEqual([[1], [-1]])
})
it('handles vertical touch swipes one clip at a time with a transition lock', async () => {
  await render()
  swipe(200, 100); swipe(200, 100)
  expect(step.mock.calls).toEqual([[1]])
  vi.advanceTimersByTime(701)
  swipe(100, 200)
  expect(step.mock.calls).toEqual([[1], [-1]])
})
it('ignores transcript scrolling, settings controls, and small gestures', async () => {
  await render()
  const transcript = host.querySelector('[data-feed-transcript] span')!
  wheel(100, transcript); swipe(200, 100, transcript)
  wheel(100, host.querySelector('button')!); swipe(200, 100, host.querySelector('button')!)
  swipe(100, 130); wheel(10)
  expect(step).not.toHaveBeenCalled()
})
it('does not navigate backwards from the first clip or during an end-of-batch load', async () => {
  await render(false)
  swipe(100, 200)
  expect(step).not.toHaveBeenCalled()
  await render(true, true)
  swipe(200, 100)
  expect(step).not.toHaveBeenCalled()
  swipe(100, 200)
  expect(step.mock.calls).toEqual([[-1]])
})
it('leaves desktop scrolling alone', async () => {
  await render()
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  wheel(100); swipe(200, 100)
  expect(step).not.toHaveBeenCalled()
})
