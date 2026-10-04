import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: null as null | { id: string }, complete: vi.fn(), vocabulary: vi.fn() }))
// Keep access tests focused on the game rather than loading decorative icons.
vi.mock('@mui/icons-material', () => {
  const Icon = () => <svg aria-hidden="true" />
  return { Celebration: Icon, CheckCircle: Icon, EmojiEvents: Icon, LightbulbOutlined: Icon, Refresh: Icon, TimerOutlined: Icon, ExpandLess: Icon, ExpandMore: Icon, Visibility: Icon, VisibilityOff: Icon }
})
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/server', () => ({ connection: vi.fn() }))
vi.mock('@/app/actions/puzzles', () => ({ fetchPuzzleVocabulary: mocks.vocabulary, completeWordSearch: mocks.complete }))
vi.mock('@/app/components/puzzles/GamePageShell', () => ({ default: ({ children, controls }: { children: React.ReactNode; controls: React.ReactNode }) => <div>{controls}{children}</div> }))
import WordSearchGame from './WordSearchGame'
import WordSearchPage from './page'
import { generateWordSearch, type PuzzleVocabularySource } from '@/app/lib/transcriptPuzzles'
const source: PuzzleVocabularySource = {
  type: 'episode', id: 'episode', puzzleId: 'puzzle', title: 'Cartoon', subtitle: 'Episode', href: '/cartoons/test',
  words: ['كتاب', 'مدرسة', 'جميل', 'سريع', 'طعام', 'كبير', 'صغير', 'طريق'].map((lemma, index) => ({ id: String(index), lemma, surfaceForm: lemma, english: `meaning ${index}` })),
}
let host: HTMLDivElement, root: Root
beforeEach(() => {
  vi.clearAllMocks(); mocks.user = null; mocks.vocabulary.mockResolvedValue(source)
  mocks.complete.mockResolvedValue({ ok: true, data: { awarded: 20, totalXp: 20, duplicate: false, previousLevel: 1, level: 1 } })
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  HTMLElement.prototype.setPointerCapture = vi.fn(); HTMLElement.prototype.hasPointerCapture = () => false
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks() })
it('serves the existing game page without requiring a session', async () => {
  const page = await WordSearchPage()
  expect(page.type).toBe(WordSearchGame); expect(page.props.initialPuzzle.placements.length).toBeGreaterThan(0)
})
it.each([null, { id: 'free' }, { id: 'premium' }, { id: 'editor' }, { id: 'admin' }])('starts and completes the existing puzzle for %j', async user => {
  mocks.user = user
  let seed = 123
  vi.spyOn(Math, 'random').mockImplementation(() => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 })
  const puzzle = generateWordSearch(source.words, { difficulty: 'regular' })
  await act(async () => root.render(<WordSearchGame initialSource={source} initialPuzzle={puzzle} />))
  seed = 123
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Start Regular')!.click())
  const active = [...host.querySelectorAll('[data-word-search-cell]')]
  expect(active.length).toBeGreaterThan(0)
  for (const placement of puzzle.placements) {
    const start = placement.cells[0], end = placement.cells.at(-1)!
    const first = host.querySelector(`[data-row="${start.row}"][data-col="${start.col}"]`)!
    const last = host.querySelector(`[data-row="${end.row}"][data-col="${end.col}"]`)!
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => last })
    const pointer = (type: string) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 1, clientY: 1 })
      return event
    }
    await act(async () => first.dispatchEvent(pointer('pointerdown')))
    await act(async () => last.dispatchEvent(pointer('pointerup')))
  }
  expect(document.body.textContent).toContain('Word Search Complete!')
  if (user) expect(mocks.complete).toHaveBeenCalledOnce()
  else {
    expect(mocks.complete).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Sign in to save XP')
  }
})
