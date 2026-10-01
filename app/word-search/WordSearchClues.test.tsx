import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import WordSearchClues from './WordSearchClues'
import type { WordSearchPlacement } from '@/app/lib/transcriptPuzzles'

let host: HTMLDivElement
let root: Root
const words: WordSearchPlacement[] = [
  { id: 'كتب', lemma: 'كَتَبَ', surfaceForm: 'يَكْتُبُونَ', english: 'to write', cells: [] },
  { id: 'كتاب', lemma: 'كِتَاب', surfaceForm: 'كِتَابُهُمْ', english: 'book', cells: [] },
]

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it('reveals and hides each canonical lemma independently with accessible eye controls', async () => {
  const onReveal = vi.fn()
  await act(async () => root.render(<WordSearchClues words={words} foundIds={new Set()} sourceLabel="A book" onReveal={onReveal} />))
  const writeEye = host.querySelector<HTMLButtonElement>('[aria-label="Show Arabic for to write"]')
  const bookEye = host.querySelector<HTMLButtonElement>('[aria-label="Show Arabic for book"]')
  expect(writeEye).not.toBeNull()
  expect(host.textContent).not.toContain('كَتَبَ')

  await act(async () => writeEye!.click())
  expect(host.textContent).toContain('كَتَبَ')
  expect(host.textContent).not.toContain('كِتَاب')
  expect(onReveal).toHaveBeenCalledOnce()

  await act(async () => bookEye!.click())
  expect(host.textContent).toContain('كِتَاب')
  expect(onReveal).toHaveBeenCalledTimes(2)

  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Hide Arabic for to write"]')!.click())
  expect(host.textContent).not.toContain('كَتَبَ')
  expect(host.textContent).toContain('كِتَاب')
})
