'use client'

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { Box, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Close, OpenInFull, Pause, PlayArrow } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/store/playerStore'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'

const POS_KEY = 'awm-pip-pos'
const SIZE_KEY = 'awm-pip-size'

const DEFAULT_DESKTOP = { width: 480, height: 270 }
const DEFAULT_MOBILE = { width: 360, height: 202 }
const MIN_SIZE = { width: 280, height: 158 }
const MAX_SIZE = { width: 960, height: 540 }

interface SavedPos {
  x: number
  y: number
}

interface SavedSize {
  width: number
  height: number
}

export default function FloatingVideoPlayer() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const { pipOpen, closePip, videoId, episodePath, title, currentTime, seekTarget } =
    usePlayerStore()

  const [size, setSize] = useState<SavedSize>(() =>
    isMobile ? DEFAULT_MOBILE : DEFAULT_DESKTOP
  )
  const [hovered, setHovered] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const currentTimeRef = useRef(currentTime)

  const motionX = useMotionValue(0)
  const motionY = useMotionValue(0)

  /* Load persisted position */
  useEffect(() => {
    try {
      const posRaw = localStorage.getItem(POS_KEY)
      if (posRaw) {
        const pos: SavedPos = JSON.parse(posRaw)
        motionX.set(pos.x)
        motionY.set(pos.y)
      }
    } catch { /* ignore */ }
  }, [motionX, motionY])

  /* Load persisted size before first paint to avoid hydration flash.
     Reading localStorage during render causes mismatches; reading in an
     effect and suppressing the lint rule is the standard workaround here. */
  useLayoutEffect(() => {
    try {
      const sizeRaw = localStorage.getItem(SIZE_KEY)
      if (sizeRaw) {
        const parsed: SavedSize = JSON.parse(sizeRaw)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSize(clampSize(parsed))
      }
    } catch { /* ignore */ }
  }, [])

  /* Track current time in a ref (don't update store every 200ms) */
  const handleTimeUpdate = useCallback((time: number) => {
    currentTimeRef.current = time
  }, [])

  const { wrapRef, seekTo, playVideo, pauseVideo, isReady } = useYouTubePlayer(
    pipOpen ? videoId ?? undefined : undefined,
    handleTimeUpdate,
    currentTime
  )

  /* playerVars.start already positions the video; just press play once ready */
  useEffect(() => {
    if (isReady) {
      playVideo()
    }
  }, [isReady, playVideo])

  /* Sync time to store every second so "resume here" works after navigation */
  useEffect(() => {
    const interval = setInterval(() => {
      usePlayerStore.getState().setCurrentTime(currentTimeRef.current)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleClose = () => closePip()

  const handleExpand = () => {
    if (episodePath) router.push(episodePath)
  }

  /* Observe store seek requests (e.g. transcript clicks while PiP is active) */
  useEffect(() => {
    if (!seekTarget) return
    seekTo(seekTarget.time)
  }, [seekTarget, seekTo])

  const handleTogglePlay = () => {
    if (isPaused) {
      playVideo()
      setIsPaused(false)
    } else {
      pauseVideo()
      setIsPaused(true)
    }
  }

  const handleDragEnd = () => {
    try {
      localStorage.setItem(
        POS_KEY,
        JSON.stringify({ x: motionX.get(), y: motionY.get() })
      )
    } catch { /* ignore */ }
  }

  const [isResizing, setIsResizing] = useState(false)

  /* ── Resize logic ── */
  const resizeState = useRef<{
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)

  const startResize = useCallback(
    (clientX: number, clientY: number) => {
      setIsResizing(true)
      resizeState.current = {
        startX: clientX,
        startY: clientY,
        startWidth: size.width,
        startHeight: size.height,
      }
      document.body.style.cursor = 'se-resize'
      document.body.style.userSelect = 'none'
    },
    [size]
  )

  const onResize = useCallback((clientX: number, clientY: number) => {
    if (!resizeState.current) return
    const deltaX = clientX - resizeState.current.startX
    const deltaY = clientY - resizeState.current.startY
    const delta = Math.max(deltaX, deltaY)
    const newWidth = Math.max(
      MIN_SIZE.width,
      Math.min(MAX_SIZE.width, resizeState.current.startWidth + delta)
    )
    const newHeight = Math.round(newWidth * (9 / 16))
    setSize({ width: newWidth, height: newHeight })
  }, [])

  const endResize = useCallback(() => {
    if (!resizeState.current) return
    resizeState.current = null
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem(SIZE_KEY, JSON.stringify(size))
  }, [size])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => onResize(e.clientX, e.clientY)
    const onMouseUp = () => endResize()
    const onTouchMove = (e: TouchEvent) => {
      if (!resizeState.current) return
      e.preventDefault()
      onResize(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onTouchEnd = () => endResize()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onResize, endResize])

  if (!pipOpen || isMobile) return null

  return (
    <motion.div
      drag={!isResizing}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      style={{
        x: motionX,
        y: motionY,
        position: 'fixed',
        left: isMobile ? 8 : 24,
        bottom: isMobile ? 72 : 24,
        width: size.width,
        zIndex: 1300,
        cursor: 'grab',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
      }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <Box
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          position: 'relative',
          width: '100%',
          height: size.height,
          background: '#000',
        }}
      >
        {/* Video */}
        <Box
          ref={wrapRef}
          sx={{
            width: '100%',
            height: '100%',
          }}
        />

        {/* Top overlay — title + close */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            p: 1,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: hovered ? 'auto' : 'none',
          }}
        >
          <Typography
            noWrap
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#fff',
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              flex: 1,
              minWidth: 0,
              pt: 0.25,
            }}
          >
            {title}
          </Typography>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              color: '#fff',
              p: 0.3,
              background: 'rgba(0,0,0,0.35)',
              '&:hover': { background: 'rgba(0,0,0,0.55)' },
            }}
          >
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Bottom overlay — play/pause + expand */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: hovered ? 'auto' : 'none',
          }}
        >
          <IconButton
            size="small"
            onClick={handleTogglePlay}
            sx={{
              color: '#fff',
              p: 0.3,
              background: 'rgba(0,0,0,0.35)',
              '&:hover': { background: 'rgba(0,0,0,0.55)' },
            }}
          >
            {isPaused ? (
              <PlayArrow sx={{ fontSize: 18 }} />
            ) : (
              <Pause sx={{ fontSize: 18 }} />
            )}
          </IconButton>

          <IconButton
            size="small"
            onClick={handleExpand}
            sx={{
              color: '#fff',
              p: 0.3,
              background: 'rgba(0,0,0,0.35)',
              '&:hover': { background: 'rgba(0,0,0,0.55)' },
            }}
          >
            <OpenInFull sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Bright resize handle */}
        <Box
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            e.stopPropagation()
            startResize(e.clientX, e.clientY)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            startResize(e.touches[0].clientX, e.touches[0].clientY)
          }}
          sx={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 28,
            height: 28,
            cursor: 'se-resize',
            zIndex: 10,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            p: 0.5,
          }}
        >
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(184,134,11,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'scale(1.15)' },
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM22 14H20V12H22V14ZM18 22H16V20H18V22Z" />
            </svg>
          </Box>
        </Box>
      </Box>
    </motion.div>
  )
}

function clampSize(s: SavedSize): SavedSize {
  const w = Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, s.width))
  const h = Math.round(w * (9 / 16))
  return { width: w, height: h }
}
