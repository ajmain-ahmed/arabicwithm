import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@/app/actions/audiobooks', () => ({ saveChapterAudioTimingsForAdmin: mocks.save }))
import ChapterAudioTimingEditor from './ChapterAudioTimingEditor'

const content = [
  { tokens: [{ arabic: 'الأولى' }], translation: 'First.' },
  { tokens: [{ arabic: 'الثانية' }], translation: 'Second.' },
]
let root: Root
let host: HTMLDivElement

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.resetAllMocks()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

function button(label: string): HTMLButtonElement {
  const result = Array.from(host.querySelectorAll('button')).find(item => item.textContent === label)
  if (!result) throw new Error(`Missing button: ${label}`)
  return result
}

it('requires the existing signed audio preview before editing', async () => {
  await act(async () => root.render(<ChapterAudioTimingEditor chapterId="chapter" language="ar" content={content} audioUrl={null} initialTimings={null} disabled={false} onSaved={vi.fn()} />))
  expect(host.textContent).toContain('Preview the saved audio')
  expect(host.querySelector('audio')).toBeNull()
})

it('captures a segment, saves milliseconds, and updates the parent', async () => {
  const saved = { version: 1 as const, contentHash: 'a'.repeat(64), durationMs: 10000, segments: [{ blockIndex: 0, startMs: 1000, endMs: 3000 }] }
  mocks.save.mockResolvedValue(saved)
  const onSaved = vi.fn()
  await act(async () => root.render(<ChapterAudioTimingEditor chapterId="chapter" language="ar" content={content} audioUrl="https://example.test/audio" initialTimings={null} disabled={false} onSaved={onSaved} />))
  const audio = host.querySelector('audio')!
  Object.defineProperty(audio, 'duration', { value: 10 })
  await act(async () => { audio.currentTime = 1; button('Set start at playhead').click() })
  await act(async () => { audio.currentTime = 3; button('Set end at playhead').click() })
  await act(async () => button('Validate and save timestamps').click())
  expect(mocks.save).toHaveBeenCalledWith({ chapterId: 'chapter', language: 'ar', draft: { durationMs: 10000, segments: saved.segments } })
  expect(onSaved).toHaveBeenCalledWith(saved)
  expect(host.textContent).toContain('Saved 1 timed sentences.')
})

it('replays only the selected segment', async () => {
  const timings = { version: 1 as const, contentHash: 'a'.repeat(64), durationMs: 10000, segments: [{ blockIndex: 0, startMs: 1000, endMs: 3000 }] }
  await act(async () => root.render(<ChapterAudioTimingEditor chapterId="chapter" language="ar" content={content} audioUrl="https://example.test/audio" initialTimings={timings} disabled={false} onSaved={vi.fn()} />))
  const audio = host.querySelector('audio')!
  await act(async () => button('Replay segment').click())
  expect(audio.currentTime).toBe(1)
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
  await act(async () => { audio.currentTime = 3; audio.dispatchEvent(new Event('timeupdate')) })
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
})
