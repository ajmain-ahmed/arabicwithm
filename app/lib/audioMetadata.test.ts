import { afterEach, expect, it, vi } from 'vitest'
import { readAudioDuration } from './audioMetadata'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
function mockAudio(duration = 0) {
  const audio = { duration, onloadedmetadata: null as null | (() => void), onerror: null as null | (() => void), removeAttribute: vi.fn(), load: vi.fn(), src: '', preload: '' }
  vi.stubGlobal('Audio', class { constructor() { return audio } })
  return audio
}
it('rounds browser metadata to seconds and releases the audio source', async () => {
  const audio = mockAudio(2535.7)
  const result = readAudioDuration('https://example.com/audio')
  audio.onloadedmetadata!()
  expect(await result).toBe(2536)
  expect(audio.removeAttribute).toHaveBeenCalledWith('src')
})
it('allows saving when metadata fails or times out', async () => {
  vi.useFakeTimers()
  const audio = mockAudio()
  const failed = readAudioDuration('https://example.com/audio')
  audio.onerror!()
  expect(await failed).toBeNull()
  const timedOut = readAudioDuration('https://example.com/audio')
  await vi.advanceTimersByTimeAsync(10000)
  expect(await timedOut).toBeNull()
})
