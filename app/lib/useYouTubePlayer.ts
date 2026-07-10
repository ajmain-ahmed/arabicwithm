'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ─────────────────────────────────────────────
   YouTube IFrame API Types
───────────────────────────────────────────── */
interface YTPlayer {
  getCurrentTime(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
}

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer
      PlayerState: { PLAYING: number }
    }
    onYouTubeIframeAPIReady: (() => void) | undefined
    __ytApiReady?: boolean
  }
}

export default function useYouTubePlayer(
  videoId: string | undefined,
  onTimeUpdate?: (time: number) => void,
  startAt?: number
) {
  const playerRef = useRef<YTPlayer | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const segmentPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const segmentSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!videoId || !wrap) return

    const clearWrap = (el: HTMLDivElement) => {
      while (el.firstChild) {
        el.removeChild(el.firstChild)
      }
    }

    const initPlayer = () => {
      if (!wrap) return
      clearWrap(wrap)
      const inner = document.createElement('div')
      inner.style.width = '100%'
      inner.style.height = '100%'
      wrap.appendChild(inner)
      try {
        playerRef.current = new window.YT.Player(inner, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            playsinline: 1,
            start: startAt && startAt > 0 ? Math.floor(startAt) : undefined,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: () => {
              setIsReady(true)
              intervalRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime?.()
                if (typeof t === 'number') onTimeUpdateRef.current?.(t)
              }, 200)
            },
            onStateChange: (event: { data: number }) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                if (!intervalRef.current)
                  intervalRef.current = setInterval(() => {
                    const t = playerRef.current?.getCurrentTime?.()
                    if (typeof t === 'number') onTimeUpdateRef.current?.(t)
                  }, 200)
              } else {
                if (intervalRef.current) clearInterval(intervalRef.current)
                intervalRef.current = null
              }
            },
            onError: (e: { data: number }) => console.error('YT Error:', e.data),
          },
        })
      } catch (e) {
        console.error('YT init error:', e)
      }
    }

    const loadApi = () => {
      if (window.YT?.Player || window.__ytApiReady) {
        initPlayer()
        return
      }
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        window.__ytApiReady = true
        prev?.()
        initPlayer()
      }
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script')
        tag.id = 'youtube-iframe-api'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(tag)
      }
    }

    const timer = setTimeout(loadApi, 50)
    return () => {
      clearTimeout(timer)
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      if (segmentPollRef.current) clearInterval(segmentPollRef.current)
      segmentPollRef.current = null
      if (segmentSafetyRef.current) clearTimeout(segmentSafetyRef.current)
      segmentSafetyRef.current = null
      try {
        playerRef.current?.destroy?.()
      } catch {}
      if (wrap) clearWrap(wrap)
      setIsReady(false)
    }
  }, [videoId, startAt])

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seconds, true)
      playerRef.current.playVideo?.()
    }
  }, [])

  const seekToOnly = useCallback((seconds: number) => {
    playerRef.current?.seekTo?.(seconds, true)
  }, [])

  const playSegment = useCallback((startSeconds: number, durationSeconds: number) => {
    if (!playerRef.current) return
    const endTime = startSeconds + durationSeconds
    playerRef.current.seekTo(startSeconds, true)
    playerRef.current.playVideo?.()

    if (segmentPollRef.current) clearInterval(segmentPollRef.current)
    if (segmentSafetyRef.current) clearTimeout(segmentSafetyRef.current)

    const poll = setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.()
      if (typeof t === 'number' && t >= endTime) {
        clearInterval(poll)
        segmentPollRef.current = null
        playerRef.current?.pauseVideo?.()
      }
    }, 150)
    segmentPollRef.current = poll

    const safety = setTimeout(() => {
      clearInterval(poll)
      segmentPollRef.current = null
    }, (durationSeconds + 1) * 1000)
    segmentSafetyRef.current = safety
  }, [])

  const playVideo = useCallback(() => {
    playerRef.current?.playVideo?.()
  }, [])

  const pauseVideo = useCallback(() => {
    playerRef.current?.pauseVideo?.()
  }, [])

  const getCurrentTime = useCallback(() => {
    return playerRef.current?.getCurrentTime?.() ?? 0
  }, [])

  return { wrapRef, seekTo, seekToOnly, playSegment, playVideo, pauseVideo, getCurrentTime, isReady }
}
