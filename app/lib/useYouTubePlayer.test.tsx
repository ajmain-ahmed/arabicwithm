import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useYouTubePlayer from './useYouTubePlayer'

interface Options {
  videoId: string
  width: string
  height: string
  playerVars: { autoplay: number }
  events: {
    onReady: () => void
    onStateChange: (event: { data: number }) => void
    onError: (event: { data: number }) => void
    onAutoplayBlocked: () => void
    onVolumeChange: () => void
  }
}
let options: Options
let controls: ReturnType<typeof useYouTubePlayer>
let root: Root
let host: HTMLDivElement
let playerMuted = true
let playerVolume = 100
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
  playerMuted = true
  playerVolume = 100
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
      mute() { calls.push('mute'); playerMuted = true }
      unMute() { calls.push('unmute'); playerMuted = false }
      isMuted() { return playerMuted }
      getVolume() { return playerVolume }
      setVolume(volume: number) { calls.push('setVolume'); playerVolume = volume }
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
  it('tracks mute state from native player controls via onVolumeChange', async () => {
    await act(async () => { root.render(<Harness id="dQw4w9WgXcQ" />) })
    await act(async () => { await vi.advanceTimersByTimeAsync(60) })
    await act(async () => options.events.onReady())
    expect(controls.isMuted).toBe(true)
    // User raises volume with YouTube's own slider, which unmutes the player.
    await act(async () => { playerMuted = false; options.events.onVolumeChange() })
    expect(controls.isMuted).toBe(false)
    // Hook-driven controls stay in sync too.
    await act(async () => controls.mute())
    expect(controls.isMuted).toBe(true)
    await act(async () => controls.unMute())
    expect(controls.isMuted).toBe(false)
  })
  it('treats a zeroed volume slider as muted and restores volume on playWithSound', async () => {
    await act(async () => { root.render(<Harness id="dQw4w9WgXcQ" />) })
    await act(async () => { await vi.advanceTimersByTimeAsync(60) })
    await act(async () => options.events.onReady())
    // User unmutes, then drags YouTube's volume slider down to 0.
    await act(async () => { playerMuted = false; options.events.onVolumeChange() })
    expect(controls.isMuted).toBe(false)
    await act(async () => { playerVolume = 0; options.events.onVolumeChange() })
    expect(controls.isMuted).toBe(true)
    // "Turn sound on" must bring the volume back, not just clear the mute flag.
    await act(async () => controls.playWithSound())
    expect(calls).toContain('setVolume')
    expect(playerVolume).toBe(100)
    expect(controls.isMuted).toBe(false)
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
  it.each([5, 153])('falls back to a native embed for recoverable IFrame API error %s', async (errorCode) => {
    await act(async () => root.render(<Harness id="dQw4w9WgXcQ" />))
    await act(async () => { await vi.advanceTimersByTimeAsync(60) })
    await act(async () => options.events.onError({ data: errorCode }))

    const iframe = host.querySelector('iframe')
    expect(destroy).toHaveBeenCalledOnce()
    expect(iframe).not.toBeNull()
    expect(iframe?.src).toContain('youtube.com/embed/dQw4w9WgXcQ')
    expect(iframe?.src).toContain('autoplay=1')
    expect(iframe?.src).toContain('mute=1')
    expect(iframe?.src).toContain('playsinline=1')
    expect(iframe?.allow).toContain('encrypted-media')
    expect(iframe?.referrerPolicy).toBe('strict-origin-when-cross-origin')
    expect(iframe?.allowFullscreen).toBe(true)
    expect(controls.errorCode).toBeNull()
  })
})
