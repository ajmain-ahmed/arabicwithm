import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import useCorrectAutoAdvance from './useCorrectAutoAdvance'

let root: Root, host: HTMLDivElement
function Harness({ correct, advance }: { correct: boolean; advance: () => void }) {
  useCorrectAutoAdvance(correct, advance)
  return null
}
beforeEach(() => { vi.useFakeTimers(); host = document.createElement('div'); root = createRoot(host); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }) })
afterEach(async () => { await act(async () => root.unmount()); vi.useRealTimers() })
it('leaves feedback visible for 1500ms and advances exactly once', async () => {
  const advance = vi.fn()
  await act(async () => root.render(<Harness correct advance={advance} />))
  await act(async () => { vi.advanceTimersByTime(1499) }); expect(advance).not.toHaveBeenCalled()
  await act(async () => { vi.advanceTimersByTime(1) }); expect(advance).toHaveBeenCalledOnce()
  await act(async () => { vi.advanceTimersByTime(2000) }); expect(advance).toHaveBeenCalledOnce()
})
it('does not advance an incorrect answer and cancels a pending transition when resetting', async () => {
  const advance = vi.fn()
  await act(async () => root.render(<Harness correct={false} advance={advance} />))
  await act(async () => { vi.advanceTimersByTime(2000) }); expect(advance).not.toHaveBeenCalled()
  await act(async () => root.render(<Harness correct advance={advance} />))
  await act(async () => { vi.advanceTimersByTime(400) })
  await act(async () => root.render(<Harness correct={false} advance={advance} />))
  await act(async () => { vi.advanceTimersByTime(1000) }); expect(advance).not.toHaveBeenCalled()
})
it('cancels auto-advance when leaving the activity', async () => {
  const advance = vi.fn()
  await act(async () => root.render(<Harness correct advance={advance} />))
  await act(async () => root.render(null))
  await act(async () => { vi.advanceTimersByTime(1000) }); expect(advance).not.toHaveBeenCalled()
})
