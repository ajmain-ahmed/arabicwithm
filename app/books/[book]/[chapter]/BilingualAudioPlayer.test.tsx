import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn(), save: vi.fn() }))
vi.mock('@/app/actions/audiobooks', () => ({ requestChapterAudioResult: mocks.request, saveAudioProgress: mocks.save }))
vi.mock('@/app/AuthContext', () => ({ useAuth: () => ({ user: { id: 'listener' }, loading: false }) }))
vi.mock('@/app/components/PremiumPrompt', () => ({ default: () => null }))
import BilingualAudioPlayer from './BilingualAudioPlayer'
import { useAudiobookStore } from '@/store/audiobookStore'

const timings = {
  version: 1 as const,
  contentHash: 'a'.repeat(64),
  durationMs: 7000,
  segments: [{ blockIndex: 0, startMs: 1000, endMs: 4000 }, { blockIndex: 1, startMs: 5000, endMs: 7000 }],
}
const arabic = { chapterId: 'chapter-ar', language: 'ar' as const, narrator: null, durationSeconds: 6, timings }
const english = { chapterId: 'chapter-en', language: 'en' as const, narrator: null, durationSeconds: 6, timings }
let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.resetAllMocks()
  useAudiobookStore.setState({ session: null, playbackCache: {}, progressOutbox: {} })
  mocks.request.mockImplementation(async (_id, language) => ({ status: 'ready', playback: { sourceType: 'supabase_storage', url: `https://example.test/${language}.mp3`, expiresIn: 900, positionSeconds: 0, timings } }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks() })

it('plays Arabic then English for each sentence', async () => {
  await act(async () => root.render(<BilingualAudioPlayer arabic={arabic} english={english} />))
  await act(async () => document.querySelector<HTMLButtonElement>('[data-reader-audio-trigger]')!.click())
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Play audio"]')!.click())
  await vi.waitFor(() => expect(document.querySelectorAll('audio')).toHaveLength(2))
  const [arabicAudio, englishAudio] = [...document.querySelectorAll('audio')]
  expect(arabicAudio.currentTime).toBe(1)
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
  await act(async () => arabicAudio.dispatchEvent(new Event('play')))
  await act(async () => arabicAudio.dispatchEvent(new Event('ended')))
  expect(englishAudio.currentTime).toBe(1)
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
  await act(async () => englishAudio.dispatchEvent(new Event('ended')))
  expect(arabicAudio.currentTime).toBe(5)
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(3)
})
