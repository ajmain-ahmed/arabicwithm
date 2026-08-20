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
  mute(): void
  unMute(): void
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

interface YouTubePlayerOptions {
  autoplay?: boolean
  muted?: boolean
}

let youtubeApiPromise: Promise<void> | null = null

function ensureYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise<void>((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => {
      window.__ytApiReady = true
      resolve()
    }

    let tag = document.getElementById('youtube-iframe-api') as HTMLScriptElement | null
    if (!tag) {
      tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }

    tag.addEventListener('error', () => {
      youtubeApiPromise = null
      reject(new Error('Unable to load the YouTube player API'))
    }, { once: true })
  })

  return youtubeApiPromise
}

export default function useYouTubePlayer(
  videoId: string | undefined,
  onTimeUpdate?: (time: number) => void,
  startAt?: number,
  options: YouTubePlayerOptions = {}
) {
  const playerRef = useRef<YTPlayer | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const segmentPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const segmentSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const startAtRef = useRef(startAt)
  const fallbackHostRef = useRef(false)
  const fallbackVideoRef = useRef<string | undefined>(undefined)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [errorCode, setErrorCode] = useState<number | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const autoplay = options.autoplay === true
  const muted = options.muted === true

  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])
  useEffect(() => { startAtRef.current = startAt }, [startAt])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!videoId || !wrap) return

    if (fallbackVideoRef.current !== videoId) {
      fallbackVideoRef.current = videoId
      fallbackHostRef.current = false
    }

    let cancelled = false

    const clearWrap = (el: HTMLDivElement) => {
      el.replaceChildren()
    }

    const initPlayer = () => {
      if (cancelled || !wrap.isConnected || !window.YT?.Player) return
      clearWrap(wrap)
      const inner = document.createElement('div')
      inner.style.width = '100%'
      inner.style.height = '100%'
      wrap.appendChild(inner)
      try {
        playerRef.current = new window.YT.Player(inner, {
          ...(fallbackHostRef.current ? { host: 'https://www.youtube-nocookie.com' } : {}),
          videoId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            playsinline: 1,
            start: startAtRef.current && startAtRef.current > 0 ? Math.floor(startAtRef.current) : undefined,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              setErrorCode(null)
              setAutoplayBlocked(false)
              if (muted) playerRef.current?.mute?.()
              if (autoplay) playerRef.current?.playVideo?.()
              setIsReady(true)
              intervalRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime?.()
                if (typeof t === 'number') onTimeUpdateRef.current?.(t)
              }, 200)
            },
            onStateChange: (event: { data: number }) => {
              if (cancelled) return
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true)
                setAutoplayBlocked(false)
                if (!intervalRef.current)
                  intervalRef.current = setInterval(() => {
                    const t = playerRef.current?.getCurrentTime?.()
                    if (typeof t === 'number') onTimeUpdateRef.current?.(t)
                  }, 200)
              } else {
                setIsPlaying(false)
                if (intervalRef.current) clearInterval(intervalRef.current)
                intervalRef.current = null
              }
            },
            onError: (e: { data: number }) => {
              if (cancelled) return
              setIsPlaying(false)
              if (e.data === 5 && !fallbackHostRef.current) {
                fallbackHostRef.current = true
                setRetryNonce((value) => value + 1)
                return
              }
              setErrorCode(e.data)
              console.error('YT Error:', e.data)
            },
            onAutoplayBlocked: () => {
              if (cancelled) return
              setIsPlaying(false)
              setAutoplayBlocked(true)
            },
          },
        })
      } catch (e) {
        setErrorCode(-1)
        console.error('YT init error:', e)
      }
    }

    const timer = setTimeout(() => {
      void ensureYouTubeApi().then(initPlayer).catch((error: unknown) => {
        if (!cancelled) {
          setErrorCode(-1)
          console.error('YT API error:', error)
        }
      })
    }, 50)
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      if (segmentPollRef.current) clearInterval(segmentPollRef.current)
      segmentPollRef.current = null
      if (segmentSafetyRef.current) clearTimeout(segmentSafetyRef.current)
      segmentSafetyRef.current = null
      const player = playerRef.current
      playerRef.current = null
      try {
        player?.destroy?.()
      } catch {}
      if (!player && wrap.isConnected) clearWrap(wrap)
      setIsReady(false)
      setIsPlaying(false)
    }
  }, [autoplay, muted, retryNonce, videoId])

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

  const mute = useCallback(() => {
    playerRef.current?.mute?.()
  }, [])

  const unMute = useCallback(() => {
    playerRef.current?.unMute?.()
  }, [])

  const playWithSound = useCallback(() => {
    playerRef.current?.unMute?.()
    playerRef.current?.playVideo?.()
    setAutoplayBlocked(false)
  }, [])

  const getCurrentTime = useCallback(() => {
    return playerRef.current?.getCurrentTime?.() ?? 0
  }, [])

  const retry = useCallback(() => {
    setErrorCode(null)
    setAutoplayBlocked(false)
    setRetryNonce((value) => value + 1)
  }, [])

  return {
    wrapRef,
    seekTo,
    seekToOnly,
    playSegment,
    playVideo,
    pauseVideo,
    mute,
    unMute,
    playWithSound,
    getCurrentTime,
    isReady,
    isPlaying,
    autoplayBlocked,
    errorCode,
    retry,
  }
}
