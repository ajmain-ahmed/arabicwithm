'use client'

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { motion, useDragControls, useMotionValue } from 'framer-motion'
import { Box, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Close, DragIndicator, OpenInFull, Pause, PlayArrow } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/store/playerStore'
import useYouTubePlayer from '@/app/lib/useYouTubePlayer'

const POS_KEY = 'awm-pip-pos'
const SIZE_KEY = 'awm-pip-size'

const DEFAULT_DESKTOP = { width: 480, height: 270 }
const DEFAULT_MOBILE_LANDSCAPE = { width: 300, height: 169 }
const DEFAULT_MOBILE_PORTRAIT = { width: 180, height: 320 }

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
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))

  const { pipOpen, closePip, videoId, episodePath, title, currentTime, seekTarget, orientation } =
    usePlayerStore()

  const [size, setSize] = useState<SavedSize>(DEFAULT_DESKTOP)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [hovered, setHovered] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const currentTimeRef = useRef(currentTime)

  const motionX = useMotionValue(0)
  const motionY = useMotionValue(0)
  const dragControls = useDragControls()
  const sizeRef = useRef(size)

  useEffect(() => {
    sizeRef.current = size
  }, [size])

  /* Restore a size that fits the current phone and video orientation. */
  useLayoutEffect(() => {
    const nextViewport = { width: window.innerWidth, height: window.innerHeight }
    const frame = window.requestAnimationFrame(() => setViewport(nextViewport))
    try {
      const sizeRaw = localStorage.getItem(`${SIZE_KEY}-${orientation}`)
      const preferred = sizeRaw
        ? JSON.parse(sizeRaw) as SavedSize
        : defaultSize(isMobile, orientation)
      const nextSize = clampSize(preferred, orientation, nextViewport)
      // Restoring persisted UI state is intentionally performed before paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSize(nextSize)

      const posRaw = localStorage.getItem(`${POS_KEY}-${orientation}`)
      const pos = posRaw ? JSON.parse(posRaw) as SavedPos : { x: 0, y: 0 }
      const clampedPos = clampPosition(pos, nextSize, nextViewport, isMobile)
      motionX.set(clampedPos.x)
      motionY.set(clampedPos.y)
    } catch { /* ignore */ }
    return () => window.cancelAnimationFrame(frame)
  }, [isMobile, motionX, motionY, orientation])

  useEffect(() => {
    const handleViewportResize = () => {
      const nextViewport = { width: window.innerWidth, height: window.innerHeight }
      setViewport(nextViewport)
      setSize((current) => clampSize(current, orientation, nextViewport))
      const nextPosition = clampPosition(
        { x: motionX.get(), y: motionY.get() },
        sizeRef.current,
        nextViewport,
        isMobile
      )
      motionX.set(nextPosition.x)
      motionY.set(nextPosition.y)
    }
    window.addEventListener('resize', handleViewportResize)
    return () => window.removeEventListener('resize', handleViewportResize)
  }, [isMobile, motionX, motionY, orientation])

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
    if (!pipOpen) return
    const interval = setInterval(() => {
      usePlayerStore.getState().setCurrentTime(currentTimeRef.current)
    }, 1000)
    return () => clearInterval(interval)
  }, [pipOpen])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime, videoId])

  const handleClose = () => closePip()

  const handleExpand = () => {
    if (isMobile) {
      const mobileDefault = clampSize(defaultSize(true, orientation), orientation, {
        width: window.innerWidth,
        height: window.innerHeight,
      })
      const target = size.width > mobileDefault.width + 8
        ? mobileDefault
        : { width: window.innerWidth, height: window.innerHeight }
      const nextSize = clampSize(target, orientation, {
        width: window.innerWidth,
        height: window.innerHeight,
      })
      sizeRef.current = nextSize
      setSize(nextSize)
      motionX.set(0)
      motionY.set(0)
      return
    }
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
    const nextPosition = clampPosition(
      { x: motionX.get(), y: motionY.get() },
      sizeRef.current,
      { width: window.innerWidth, height: window.innerHeight },
      isMobile
    )
    motionX.set(nextPosition.x)
    motionY.set(nextPosition.y)
    try {
      localStorage.setItem(
        `${POS_KEY}-${orientation}`,
        JSON.stringify(nextPosition)
      )
    } catch { /* ignore */ }
  }

  const [isResizing, setIsResizing] = useState(false)

  /* ── Resize logic ── */
  const resizeState = useRef<{
    startX: number
    startY: number
    startWidth: number
  } | null>(null)

  const startResize = useCallback(
    (clientX: number, clientY: number) => {
      setIsResizing(true)
      resizeState.current = {
        startX: clientX,
        startY: clientY,
        startWidth: size.width,
      }
      document.body.style.cursor = 'se-resize'
      document.body.style.userSelect = 'none'
    },
    [size]
  )

  const onResize = useCallback((clientX: number, clientY: number) => {
    if (!resizeState.current) return
    const deltaX = clientX - resizeState.current.startX
    const verticalDelta = clientY - resizeState.current.startY
    const verticalWidthDelta = orientation === 'portrait' ? verticalDelta * (9 / 16) : verticalDelta * (16 / 9)
    const widthDelta = Math.abs(deltaX) >= Math.abs(verticalWidthDelta) ? deltaX : verticalWidthDelta
    const nextSize = clampSize(
      { width: resizeState.current.startWidth + widthDelta, height: 0 },
      orientation,
      { width: window.innerWidth, height: window.innerHeight }
    )
    sizeRef.current = nextSize
    setSize(nextSize)
  }, [orientation])

  const endResize = useCallback(() => {
    if (!resizeState.current) return
    resizeState.current = null
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    const nextPosition = clampPosition(
      { x: motionX.get(), y: motionY.get() },
      sizeRef.current,
      { width: window.innerWidth, height: window.innerHeight },
      isMobile
    )
    motionX.set(nextPosition.x)
    motionY.set(nextPosition.y)
    try {
      localStorage.setItem(`${SIZE_KEY}-${orientation}`, JSON.stringify(sizeRef.current))
      localStorage.setItem(`${POS_KEY}-${orientation}`, JSON.stringify(nextPosition))
    } catch { /* ignore */ }
  }, [isMobile, motionX, motionY, orientation])

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

  if (!pipOpen) return null

  const dragBounds = getDragBounds(size, viewport, isMobile)

  return (
    <motion.div
      drag={!isResizing}
      dragControls={dragControls}
      dragListener={!isMobile}
      dragConstraints={dragBounds}
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
        zIndex: isMobile ? 1100 : 1300,
        cursor: isMobile ? 'default' : 'grab',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
      }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      {isMobile && (
        <Box
          onPointerDown={(event) => dragControls.start(event)}
          sx={{
            height: 34,
            px: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: '#0e2e1f',
            color: '#fff',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <DragIndicator sx={{ fontSize: 18, color: '#d4a843', flexShrink: 0 }} />
          <Typography noWrap sx={{ flex: 1, minWidth: 0, fontFamily: 'Jost, sans-serif', fontSize: 11.5, fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton
            size="small"
            aria-label={isPaused ? 'Play video' : 'Pause video'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleTogglePlay}
            sx={{ width: 26, height: 26, color: '#fff' }}
          >
            {isPaused ? <PlayArrow sx={{ fontSize: 17 }} /> : <Pause sx={{ fontSize: 17 }} />}
          </IconButton>
          <IconButton
            size="small"
            aria-label="Toggle mini player size"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleExpand}
            sx={{ width: 26, height: 26, color: '#fff' }}
          >
            <OpenInFull sx={{ fontSize: 15 }} />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Close mini player"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleClose}
            sx={{ width: 26, height: 26, color: '#fff' }}
          >
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}
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
            opacity: hovered && !isMobile ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: hovered && !isMobile ? 'auto' : 'none',
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
            opacity: hovered && !isMobile ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: hovered && !isMobile ? 'auto' : 'none',
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

function defaultSize(isMobile: boolean, orientation: 'landscape' | 'portrait'): SavedSize {
  if (!isMobile) return DEFAULT_DESKTOP
  return orientation === 'portrait' ? DEFAULT_MOBILE_PORTRAIT : DEFAULT_MOBILE_LANDSCAPE
}

function clampSize(
  size: SavedSize,
  orientation: 'landscape' | 'portrait',
  viewport?: { width: number; height: number }
): SavedSize {
  const heightRatio = orientation === 'portrait' ? 16 / 9 : 9 / 16
  const minWidth = orientation === 'portrait' ? 140 : 240
  const absoluteMaxWidth = orientation === 'portrait' ? 420 : 960
  const viewportMaxWidth = viewport?.width ? viewport.width - 16 : absoluteMaxWidth
  const viewportMaxHeight = viewport?.height ? viewport.height - 150 : 540
  const maxWidth = Math.max(
    minWidth,
    Math.min(absoluteMaxWidth, viewportMaxWidth, viewportMaxHeight / heightRatio)
  )
  const width = Math.round(Math.max(minWidth, Math.min(maxWidth, size.width)))
  return { width, height: Math.round(width * heightRatio) }
}

function getDragBounds(
  size: SavedSize,
  viewport: { width: number; height: number },
  isMobile: boolean
) {
  if (!viewport.width || !viewport.height) return undefined

  const left = isMobile ? 8 : 24
  const bottom = isMobile ? 72 : 24
  const headerHeight = isMobile ? 34 : 0
  return {
    left: 0,
    right: Math.max(0, viewport.width - size.width - left * 2),
    top: -Math.max(0, viewport.height - size.height - headerHeight - bottom - 16),
    bottom: 0,
  }
}

function clampPosition(
  position: SavedPos,
  size: SavedSize,
  viewport: { width: number; height: number },
  isMobile: boolean
): SavedPos {
  const bounds = getDragBounds(size, viewport, isMobile)
  if (!bounds) return { x: 0, y: 0 }
  return {
    x: Math.max(bounds.left, Math.min(bounds.right, Number(position.x) || 0)),
    y: Math.max(bounds.top, Math.min(bounds.bottom, Number(position.y) || 0)),
  }
}
