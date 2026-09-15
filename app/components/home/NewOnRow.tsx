'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Chip, IconButton, Skeleton, Typography, useMediaQuery } from '@mui/material'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { thumbnailCropCss, type ThumbnailCrop } from '@/app/lib/thumbnailCrop'

/** Pixels per second. Shared by every slowly moving homepage showcase row. */
export const AUTO_SCROLL_SPEED = 8
const AUTO_RESUME_DELAY_MS = 1_600
const DRAG_ACTIVATION_DISTANCE_PX = 6

export interface CatalogueRowItem {
  key: string
  href: string
  title: string
  /** Small context line above the title, e.g. the show name for an episode. */
  meta?: string
  level?: string
  imageSrc: string
  imageCrop?: ThumbnailCrop
}

const ARROW_SX = {
  /* Touch layouts use native swiping; desktop gets explicit paging controls. */
  display: { xs: 'none', md: 'flex' },
  position: 'absolute',
  zIndex: 4,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 40,
  height: 40,
  borderRadius: '50%',
  bgcolor: 'rgba(5,23,15,0.6)',
  color: '#fff',
  boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
  opacity: 0.95,
  transition: 'opacity 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
  '&:hover': { bgcolor: 'rgba(5,23,15,0.85)', transform: 'translateY(-50%) scale(1.08)' },
} as const

function RowTile({
  item,
  mobileWidth,
  isClone = false,
  loopStart = false,
}: {
  item: CatalogueRowItem
  mobileWidth: string | number
  isClone?: boolean
  loopStart?: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <Box
      component={Link}
      href={item.href}
      draggable={false}
      aria-label={isClone ? undefined : item.title}
      aria-hidden={isClone || undefined}
      tabIndex={isClone ? -1 : undefined}
      data-loop-start={loopStart ? 'true' : undefined}
      sx={{
        position: 'relative',
        flex: '0 0 auto',
        width: { xs: mobileWidth, sm: 260, md: 300 },
        maxWidth: { xs: 310, sm: '100%' },
        aspectRatio: '4 / 5',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'normal',
        borderRadius: '12px',
        overflow: 'hidden',
        bgcolor: '#0e2e1f',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&:hover': {
          transform: 'scale(1.045)',
          boxShadow: '0 14px 34px rgba(44,26,14,0.28)',
          zIndex: 3,
        },
      }}
    >
      {!loaded && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{ position: 'absolute', inset: 0, bgcolor: 'color-mix(in srgb, var(--awm-bark) 8%, transparent)' }}
        />
      )}
      <Box
        component="img"
        draggable={false}
        src={item.imageSrc}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true)
          // Missing cover: keep the branded gradient tile with the title.
          e.currentTarget.style.display = 'none'
        }}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease', ...thumbnailCropCss(item.imageCrop) }}
      />
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,23,15,0) 42%, rgba(5,23,15,0.85) 100%)' }} />
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: { xs: 1.25, md: 1.5 } }}>
        {item.meta && (
          <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'Jost, sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 1px 8px rgba(0,0,0,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.meta}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: item.meta ? 0.25 : 0 }}>
          <Typography sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: '1.05rem', md: '1.2rem' }, fontWeight: 600, textShadow: '0 2px 10px rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </Typography>
          {item.level && (
            <Chip
              size="small"
              label={item.level}
              sx={{ flexShrink: 0, height: 20, fontSize: '0.68rem', bgcolor: 'rgba(212,168,67,0.92)', color: '#0e2e1f', fontWeight: 700, fontFamily: 'Jost, sans-serif' }}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}

/* Horizontally scrolling row of portrait tiles. Subtle circular
   hover arrows appear at the edges when there is more content to scroll to. */
export default function NewOnRow({
  items,
  ariaLabel = 'Content carousel',
  mobileCardWidth = '62vw',
  autoScroll = false,
}: {
  items: CatalogueRowItem[]
  ariaLabel?: string
  mobileCardWidth?: string | number
  autoScroll?: boolean
}) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const autoFrameRef = useRef<number | null>(null)
  const autoPositionRef = useRef(0)
  const lastAutoWriteRef = useRef(0)
  const resumeAfterRef = useRef(0)
  const pointerActiveRef = useRef(false)
  const hoverActiveRef = useRef(false)
  const focusActiveRef = useRef(false)
  const visibleRef = useRef(true)
  const dragStartXRef = useRef<number | null>(null)
  const dragStartYRef = useRef<number | null>(null)
  const dragStartScrollRef = useRef(0)
  const activePointerIdRef = useRef<number | null>(null)
  const pointerTypeRef = useRef<string | null>(null)
  const draggedRef = useRef(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const shouldLoop = autoScroll && !reduceMotion && items.length > 1

  const showAutoState = useCallback((moving: boolean) => {
    const element = scrollerRef.current
    if (element) {
      element.dataset.autoScrolling = moving ? 'true' : 'false'
      if (moving) element.dataset.manualScrolling = 'false'
    }
  }, [])

  const setManualSnap = useCallback((active: boolean) => {
    const element = scrollerRef.current
    if (element) element.dataset.manualScrolling = active ? 'true' : 'false'
  }, [])

  const pauseFor = useCallback((delay = AUTO_RESUME_DELAY_MS) => {
    resumeAfterRef.current = Math.max(resumeAfterRef.current, performance.now() + delay)
    showAutoState(false)
  }, [showAutoState])

  const releaseInteraction = useCallback(() => {
    resumeAfterRef.current = performance.now() + AUTO_RESUME_DELAY_MS
    showAutoState(false)
  }, [showAutoState])

  /* rAF-throttled: scroll fires every animation frame during a slide; React
     state updates there are what made the motion stutter. */
  const updateArrows = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const el = scrollerRef.current
      if (!el) return
      setCanScrollLeft(el.scrollLeft > 4)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    })
  }, [])

  useEffect(() => {
    updateArrows()
    window.addEventListener('resize', updateArrows)
    return () => {
      window.removeEventListener('resize', updateArrows)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [items, updateArrows])

  useEffect(() => {
    const element = scrollerRef.current
    if (!element || !shouldLoop) {
      showAutoState(false)
      return
    }

    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          visibleRef.current = entry?.isIntersecting ?? true
        }, { rootMargin: '160px 0px' })
    observer?.observe(element)
    autoPositionRef.current = element.scrollLeft

    let previousTime = performance.now()
    const tick = (now: number) => {
      const interacting = pointerActiveRef.current || hoverActiveRef.current || focusActiveRef.current
      const moving = visibleRef.current && !document.hidden && !interacting && now >= resumeAfterRef.current
      showAutoState(moving)

      if (moving) {
        const loopStart = element.querySelector<HTMLElement>('[data-loop-start="true"]')
        const firstItem = element.firstElementChild as HTMLElement | null
        const loopWidth = loopStart && firstItem ? loopStart.offsetLeft - firstItem.offsetLeft : 0
        const elapsedSeconds = Math.min(now - previousTime, 50) / 1_000
        autoPositionRef.current += AUTO_SCROLL_SPEED * elapsedSeconds
        if (loopWidth > 0 && autoPositionRef.current >= loopWidth) autoPositionRef.current -= loopWidth
        lastAutoWriteRef.current = now
        element.scrollLeft = autoPositionRef.current
      }

      previousTime = now
      autoFrameRef.current = requestAnimationFrame(tick)
    }
    autoFrameRef.current = requestAnimationFrame(tick)

    return () => {
      observer?.disconnect()
      if (autoFrameRef.current !== null) cancelAnimationFrame(autoFrameRef.current)
      autoFrameRef.current = null
      showAutoState(false)
    }
  }, [items, shouldLoop, showAutoState])

  /* Warm the browser cache for every tile so arrow-slides don't reveal
     skeletons for not-yet-loaded covers. */
  useEffect(() => {
    for (const item of items) {
      const img = new Image()
      img.src = item.imageSrc
    }
  }, [items])

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    setManualSnap(true)
    pauseFor(2_000)
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  if (items.length === 0) return null

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      {/* edge fades hint at more content when the row overflows */}
      <Box aria-hidden="true" sx={{ pointerEvents: 'none', position: 'absolute', zIndex: 2, top: 0, bottom: 8, left: 0, width: { xs: 24, md: 48 }, background: 'linear-gradient(90deg, var(--awm-row-edge, var(--awm-cream-light)), transparent)' }} />
      <Box aria-hidden="true" sx={{ pointerEvents: 'none', position: 'absolute', zIndex: 2, top: 0, bottom: 8, right: 0, width: { xs: 24, md: 48 }, background: 'linear-gradient(270deg, var(--awm-row-edge, var(--awm-cream-light)), transparent)' }} />

      <IconButton
        className="awm-row-arrow"
        data-active={canScrollLeft ? 'true' : 'false'}
        aria-label="Scroll back"
        aria-hidden={!canScrollLeft}
        tabIndex={canScrollLeft ? 0 : -1}
        onClick={() => scrollByPage(-1)}
        sx={{ ...ARROW_SX, left: 4, opacity: canScrollLeft ? 0.95 : 0, pointerEvents: canScrollLeft ? 'auto' : 'none' }}
      >
        <ChevronLeft sx={{ fontSize: 26 }} />
      </IconButton>
      <IconButton
        className="awm-row-arrow"
        data-active={canScrollRight ? 'true' : 'false'}
        aria-label="Scroll forward"
        aria-hidden={!canScrollRight}
        tabIndex={canScrollRight ? 0 : -1}
        onClick={() => scrollByPage(1)}
        sx={{ ...ARROW_SX, right: 4, opacity: canScrollRight ? 0.95 : 0, pointerEvents: canScrollRight ? 'auto' : 'none' }}
      >
        <ChevronRight sx={{ fontSize: 26 }} />
      </IconButton>

      <Box
        ref={scrollerRef}
        onScroll={() => {
          updateArrows()
          if (performance.now() - lastAutoWriteRef.current > 100) {
            autoPositionRef.current = scrollerRef.current?.scrollLeft ?? 0
            setManualSnap(true)
            pauseFor(1_200)
          }
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse') return
          hoverActiveRef.current = true
          setManualSnap(false)
          showAutoState(false)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'mouse') return
          hoverActiveRef.current = false
          releaseInteraction()
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
          pointerActiveRef.current = true
          setManualSnap(true)
          showAutoState(false)
          activePointerIdRef.current = event.pointerId
          pointerTypeRef.current = event.pointerType
          dragStartXRef.current = event.clientX
          dragStartYRef.current = event.clientY
          dragStartScrollRef.current = event.currentTarget.scrollLeft
          draggedRef.current = false
        }}
        onPointerMove={(event) => {
          if (activePointerIdRef.current !== event.pointerId || dragStartXRef.current === null || dragStartYRef.current === null) return
          const distanceX = event.clientX - dragStartXRef.current
          const distanceY = event.clientY - dragStartYRef.current
          if (!draggedRef.current && Math.abs(distanceX) >= DRAG_ACTIVATION_DISTANCE_PX && Math.abs(distanceX) > Math.abs(distanceY)) {
            draggedRef.current = true
            if (event.pointerType === 'mouse') event.currentTarget.setPointerCapture(event.pointerId)
          }
          if (draggedRef.current && pointerTypeRef.current === 'mouse') {
            event.preventDefault()
            event.currentTarget.scrollLeft = dragStartScrollRef.current - distanceX
          }
        }}
        onPointerUp={(event) => {
          pointerActiveRef.current = false
          dragStartXRef.current = null
          dragStartYRef.current = null
          activePointerIdRef.current = null
          pointerTypeRef.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
          releaseInteraction()
        }}
        onPointerCancel={() => {
          pointerActiveRef.current = false
          dragStartXRef.current = null
          dragStartYRef.current = null
          activePointerIdRef.current = null
          pointerTypeRef.current = null
          draggedRef.current = false
          releaseInteraction()
        }}
        onClickCapture={(event) => {
          if (!draggedRef.current || event.detail === 0) return
          event.preventDefault()
          event.stopPropagation()
          draggedRef.current = false
        }}
        onWheel={() => {
          setManualSnap(true)
          pauseFor()
        }}
        onFocusCapture={() => {
          focusActiveRef.current = true
          setManualSnap(false)
          showAutoState(false)
        }}
        onBlurCapture={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
          focusActiveRef.current = false
          releaseInteraction()
        }}
        role="region"
        aria-label={ariaLabel}
        sx={{
          display: 'flex',
          gap: { xs: 1.25, md: 2 },
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          py: 1,
          pr: 0.5,
          scrollSnapType: shouldLoop ? 'none' : 'x mandatory',
          scrollBehavior: 'smooth',
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pinch-zoom',
          cursor: { md: 'grab' },
          '&:active': { cursor: { md: 'grabbing' } },
          userSelect: 'none',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          '&[data-manual-scrolling="true"]': { scrollSnapType: 'x mandatory' },
          '&[data-auto-scrolling="true"]': { scrollSnapType: 'none', scrollBehavior: 'auto' },
          '@media (prefers-reduced-motion: reduce)': { scrollBehavior: 'auto' },
        }}
      >
        {items.map((item) => (
          <RowTile key={item.key} item={item} mobileWidth={mobileCardWidth} />
        ))}
        {shouldLoop && items.map((item, index) => (
          <RowTile key={`loop-${item.key}`} item={item} mobileWidth={mobileCardWidth} isClone loopStart={index === 0} />
        ))}
      </Box>
    </Box>
  )
}
