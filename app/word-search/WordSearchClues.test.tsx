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


it('shows Arabic chips, one meaning at a time, and found state', async () => {
 const onReveal=vi.fn()
 await act(async()=>root.render(<WordSearchClues words={words} foundIds={new Set([words[1].id])} sourceLabel="A book" onReveal={onReveal}/>))
 expect(host.textContent).toContain(words[0].lemma)
 expect(host.textContent).not.toContain('to write')
 expect(host.textContent).not.toContain('book')
 const chips=host.querySelectorAll<HTMLButtonElement>('button')
 expect(chips).toHaveLength(2)
 expect(chips[1].className).toContain('colorSuccess')
 await act(async()=>chips[0].click())
 expect(host.querySelector('[role=region]')?.textContent).toContain('to write')
 await act(async()=>chips[1].click())
 expect(host.querySelectorAll('[role=region]')).toHaveLength(1)
 expect(host.querySelector('[role=region]')?.textContent).toContain('book')
 expect(host.querySelector('[role=region]')?.textContent).not.toContain('to write')
 await act(async()=>chips[1].click())
 expect(host.querySelector('[role=region]')).toBeNull()
 expect(onReveal).toHaveBeenCalledTimes(2)
})
