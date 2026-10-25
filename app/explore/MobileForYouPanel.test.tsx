import React, { act, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import MobileForYouPanel from './MobileForYouPanel'
const segments = [
  { id: 1, position: 0, start_seconds: 0, end_seconds: 3, original_text: 'Outside', english_text: 'Outside the clip', tokens: [] },
  { id: 2, position: 1, start_seconds: 5, end_seconds: 8, original_text: 'أُمِّهَا', english_text: 'With her mother.', tokens: [{ arabic: 'أُمِّهَا', english: 'her mother' }, { arabic: 'كلمة', english: '' }] },
  { id: 3, position: 2, start_seconds: 8, end_seconds: 12, original_text: 'الْبَيْتِ', english_text: 'The old house.', tokens: [] },
]
const props: ComponentProps<typeof MobileForYouPanel> = {
  clip: { video: { id: 'test', youtube_id: 'abcdefghijk', title: 'Test', channel: null }, clip_start_ms: 6000, clip_end_ms: 10000, segments }, segments, time: 6,
  settings: { tashkeel: true, meanings: true, sentence: true }, ready: true, playing: true, onPlay: vi.fn(), onPause: vi.fn(), onSeek: vi.fn(), rates: [1,1.5], rate: 1, onRate: vi.fn(),
}
function markup(overrides: Partial<typeof props> = {}) {
  return new DOMParser().parseFromString(renderToStaticMarkup(<MobileForYouPanel {...props} {...overrides} />), 'text/html')
}
it('keeps only overlapping clip cards, with actual token glosses, sentence translations, and stored times', () => {
  const doc = markup()
  expect([...doc.querySelectorAll('[data-clip-line]')].map(node=>node.getAttribute('data-clip-line'))).toEqual(['2','3'])
  expect(doc.querySelector('[data-mobile-clip-transcript]')?.textContent).not.toContain('Outside')
  expect(doc.querySelector('[data-mobile-token] [lang=ar]')?.textContent).toBe('أُمِّهَا')
  expect(doc.querySelector('[data-mobile-token] [lang=en]')?.textContent).toBe('her mother')
  expect(doc.querySelectorAll('[data-token-glosses] [lang=en]')).toHaveLength(1)
  expect(doc.querySelector('[data-sentence-translation]')?.textContent).toBe('With her mother.')
  expect([...doc.querySelectorAll('[data-segment-timing]')].map(node=>node.textContent)).toEqual(['00:05 – 00:08','00:08 – 00:12'])
  expect(doc.querySelector('[data-active-segment=true]')?.getAttribute('data-clip-line')).toBe('2')
  expect(markup({ time: 9 }).querySelector('[data-active-segment=true]')?.getAttribute('data-clip-line')).toBe('3')
  expect(markup({ time: 3 }).querySelector('[data-active-segment=true]')).toBeNull()
})
it('honors meanings, sentence, and tashkīl preferences without changing source tokens', () => {
  const doc = markup({ settings: { tashkeel: false, meanings: false, sentence: false } })
  expect(doc.querySelector('[data-mobile-token] [lang=ar]')?.textContent).toBe('أمها')
  expect(doc.querySelector('[data-mobile-token] [lang=en]')).toBeNull()
  expect(doc.querySelector('[data-sentence-translation]')).toBeNull()
  expect(segments[1].tokens[0].arabic).toBe('أُمِّهَا')
})
it('scrolls an offscreen active card within its pane and yields to recent manual scrolling', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width') }))
  const scroll = vi.fn()
  const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function(this: Element) {
    const top = this.hasAttribute('data-mobile-clip-transcript') ? 100 : this.getAttribute('data-clip-line') === '3' ? 300 : 110
    const height = this.hasAttribute('data-mobile-clip-transcript') ? 150 : 100
    return { top, bottom: top+height, height, x: 0, y: top, width: 300, left: 0, right: 300, toJSON: () => ({}) }
  })
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  try {
    await act(async()=>root.render(<MobileForYouPanel {...props} />))
    const pane = host.querySelector<HTMLElement>('[data-mobile-clip-transcript]')!
    pane.scrollTo = scroll
    await act(async()=>root.render(<MobileForYouPanel {...props} time={9} />))
    expect(scroll).toHaveBeenCalledWith({ top: 192, behavior: 'smooth' })
    scroll.mockClear()
    pane.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, bubbles: true }))
    await act(async()=>root.render(<MobileForYouPanel {...props} time={6} />))
    await act(async()=>root.render(<MobileForYouPanel {...props} time={9} />))
    expect(scroll).not.toHaveBeenCalled()
  } finally {
    await act(async()=>root.unmount()); host.remove(); rect.mockRestore(); vi.useRealTimers(); vi.unstubAllGlobals()
  }
})
