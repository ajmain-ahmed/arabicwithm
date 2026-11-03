import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import useBookCatalogueRefresh from './useBookCatalogueRefresh'

const mocks = vi.hoisted(() => ({ router: { refresh: vi.fn() } }))
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }))
let host: HTMLDivElement, root: Root
function Harness({ enabled = true }: { enabled?: boolean }) { useBookCatalogueRefresh(enabled); return null }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))
  mocks.router.refresh.mockClear()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => root.render(<Harness />))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.restoreAllMocks() })

it('refreshes on return, coalesces focus/visibility events and polls visible pages', async () => {
  window.dispatchEvent(new Event('focus'))
  document.dispatchEvent(new Event('visibilitychange'))
  await act(async () => vi.advanceTimersByTime(100))
  expect(mocks.router.refresh).toHaveBeenCalledTimes(1)
  await act(async () => vi.advanceTimersByTime(60_100))
  expect(mocks.router.refresh).toHaveBeenCalledTimes(2)
})

it('cancels a scheduled focus refresh while Read/Listen navigation is pending', async () => {
  window.dispatchEvent(new Event('focus'))
  await act(async () => root.render(<Harness enabled={false} />))
  await act(async () => vi.advanceTimersByTime(60_100))
  expect(mocks.router.refresh).not.toHaveBeenCalled()
})

it('leaves background pages idle and cleans up after navigation', async () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  window.dispatchEvent(new Event('focus'))
  await act(async () => vi.advanceTimersByTime(60_000))
  expect(mocks.router.refresh).not.toHaveBeenCalled()
  await act(async () => root.render(null))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  window.dispatchEvent(new Event('focus'))
  await act(async () => vi.advanceTimersByTime(60_000))
  expect(mocks.router.refresh).not.toHaveBeenCalled()
})
