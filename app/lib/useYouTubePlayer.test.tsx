import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useYouTubePlayer from './useYouTubePlayer'

interface Options { videoId: string; width: string; height: string; playerVars: { autoplay: number }; events: { onReady: () => void; onStateChange: (event: { data: number }) => void; onAutoplayBlocked: () => void } }
let options: Options
let controls: ReturnType<typeof useYouTubePlayer>
let root: Root
let host: HTMLDivElement
const calls: string[] = []
const destroy = vi.fn()
const pause = vi.fn()
function Harness({ id }: { id?: string }) {
  const player = useYouTubePlayer(id, undefined, undefined, { autoplay: true, muted: true })
  useEffect(() => { controls = player })
  const { wrapRef } = player
  return <div ref={wrapRef} />
}
beforeEach(() => {
  vi.useFakeTimers()
  calls.length = 0
  vi.clearAllMocks()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  window.YT = {
    Player: class {
      constructor(_element: HTMLElement, input: Record<string, unknown>) { options = input as unknown as Options }
      getCurrentTime() { return 4 }
      seekTo() {}
      playVideo() { calls.push('play') }
      pauseVideo = pause
      mute() { calls.push('mute') }
      unMute() { calls.push('unmute') }
      destroy = destroy
    },
    PlayerState: { ENDED: 0, PLAYING: 1 },
  }
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers() })
describe('YouTube player lifecycle', () => {
  it('sizes the replacement iframe and mutes before autoplay', async () => {
    await act(async () => { root.render(<Harness id="dQw4w9WgXcQ" />) })
    await act(async () => { await vi.advanceTimersByTimeAsync(60) })
    expect(options).toMatchObject({ videoId: 'dQw4w9WgXcQ', width: '100%', height: '100%', playerVars: { autoplay: 0 } })
    await act(async () => options.events.onReady())
    expect(calls).toEqual(['mute', 'play'])
    expect(controls.isReady).toBe(true)
    await act(async () => options.events.onAutoplayBlocked())
    expect(controls.autoplayBlocked).toBe(true)
    await act(async () => controls.playWithSound())
    expect(calls.slice(-2)).toEqual(['unmute', 'play'])
    await act(async () => options.events.onStateChange({ data: 1 }))
    expect(controls.isPlaying).toBe(true)
  })
  it('destroys the inactive video and initializes the newly selected source', async () => {
    await act(async () => root.render(<Harness id="dQw4w9WgXcQ" />))
    await act(async () => { await vi.advanceTimersByTimeAsync(60) })
    await act(async () => options.events.onReady())
    await act(async () => root.render(<Harness id="M7lc1UVf-VE" />))
    await act(async () => { await vi.advanceTimersByTimeAsync(60) })
    expect(destroy).toHaveBeenCalledOnce()
    expect(options.videoId).toBe('M7lc1UVf-VE')
    await act(async () => root.render(<Harness />))
    expect(destroy).toHaveBeenCalledTimes(2)
    expect(controls.isPlaying).toBe(false)
  })
})
