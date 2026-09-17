import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import MobileDefinitionSheet from './MobileDefinitionSheet'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

it('consumes a backdrop tap until the drawer has exited', async () => {
  const transcriptClick = vi.fn()
  const close = vi.fn()
  const exited = vi.fn()

  function Harness() {
    const [open, setOpen] = useState(true)
    return (
      <div onClick={transcriptClick}>
        <button type="button">Transcript word</button>
        <MobileDefinitionSheet
          open={open}
          entry={{ arabic: 'كِتَاب', transliteration: 'kitāb', english: 'book' }}
          onClose={() => { close(); setOpen(false) }}
          onExited={exited}
        />
      </div>
    )
  }

  await act(async () => root.render(<Harness />))
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
  expect(dialog?.getAttribute('aria-label')).toBe('Word definition')
  expect(document.querySelector('[aria-label="Close word definition"]')).toBeNull()
  expect(dialog?.textContent).not.toContain('Word definition')

  const backdrop = document.querySelector<HTMLElement>('.MuiBackdrop-root')
  expect(backdrop).not.toBeNull()

  await act(async () => {
    backdrop!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }))
    backdrop!.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true }))
    backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })

  expect(close).toHaveBeenCalledOnce()
  expect(transcriptClick).not.toHaveBeenCalled()

  await act(async () => { await vi.runAllTimersAsync() })
  expect(exited).toHaveBeenCalledOnce()

  const transcriptWord = host.querySelector<HTMLButtonElement>('button')
  transcriptWord!.click()
  expect(transcriptClick).toHaveBeenCalledOnce()
})
