'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Skeleton, Typography } from '@mui/material'
import { ChevronRight } from '@mui/icons-material'
import CefrChip from '@/app/components/CefrChip'
import LibraryBookCard from '@/app/books/LibraryBookCard'
import type { LibraryBook } from '@/app/books/BooksLibrary'
import { thumbnailCropCss, type ThumbnailCrop } from '@/app/lib/thumbnailCrop'

const DRAG_ACTIVATION_DISTANCE_PX = 6

export interface CatalogueRowItem {
  book?: LibraryBook
  key: string
  href: string
  title: string
  /** Small context line above the title, e.g. the show name for an episode. */
  meta?: string
  level?: string
  imageSrc: string
  imageCrop?: ThumbnailCrop
}

export const COMPACT_HOME_CARD_WIDTH = { xs: 'clamp(150px, 46vw, 182px)', sm: 198, md: 222, lg: 238 } as const
export const HOME_CAROUSEL_CARD_ASPECT_RATIO = '4 / 5'

const SEE_ALL_SX = {
  /* Touch layouts swipe through the row; desktop gets the page link. */
  display: { xs: 'none', md: 'flex' },
  alignItems: 'center',
  justifyContent: 'center',
  position: 'absolute',
  zIndex: 4,
  top: '50%',
  transform: 'translateY(-50%)',
  right: 4,
  width: 40,
  height: 40,
  borderRadius: '50%',
  bgcolor: 'rgba(5,23,15,0.6)',
  color: '#fff',
  boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
  transition: 'background-color 0.2s ease, transform 0.2s ease',
  '&:hover': { bgcolor: 'rgba(5,23,15,0.85)', transform: 'translateY(-50%) scale(1.08)' },
} as const

/* Native lazy-loading still pulls images during initial parse on slow
   connections (Chrome's lookahead margin). Gating the <img> on an
   IntersectionObserver defers every below-the-fold cover until after
   hydration, keeping the t=0 request wave for the hero and first paint. */
function useNearViewport<T extends HTMLElement>(rootMargin = '160px') {
  const ref = useRef<T | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || near) return
    if (typeof IntersectionObserver === 'undefined') {
      // No observer support: reveal via a microtask rather than a synchronous
      // setState in the effect body (react-hooks/set-state-in-effect).
      queueMicrotask(() => setNear(true))
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setNear(true)
        observer.disconnect()
      }
    }, { rootMargin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [near, rootMargin])
  return { ref, near }
}

function ArtworkTile({
  item,
  mobileWidth,
  compact,
}: {
  item: CatalogueRowItem
  mobileWidth: string | number
  compact: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const { ref: nearRef, near } = useNearViewport<HTMLAnchorElement>()
  /* SSR'd images can finish before hydration attaches onLoad, which would
     leave them stuck invisible — reveal immediately if already complete. */
  const imgRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true)
  }, [])
  const imageStyle = compact
    ? { objectFit: 'cover' as const, objectPosition: `${item.imageCrop?.x ?? 50}% ${item.imageCrop?.y ?? 50}%`, transform: 'none' }
    : { objectFit: 'cover' as const, ...thumbnailCropCss(item.imageCrop) }
  if(item.book)return <Box sx={{flex:'0 0 auto',width:compact?{...COMPACT_HOME_CARD_WIDTH,xs:mobileWidth}:{xs:mobileWidth,sm:260,md:300},maxWidth:{xs:compact?152:310,sm:'100%'},scrollSnapAlign:'start'}}><LibraryBookCard book={item.book}/></Box>
  return (
    <Box
      component={Link}
      ref={nearRef}
      href={item.href}
      prefetch={false}
      draggable={false}
      aria-label={item.title}
      sx={{
        position: 'relative',
        flex: '0 0 auto',
        width: compact
          ? { ...COMPACT_HOME_CARD_WIDTH, xs: mobileWidth }
          : { xs: mobileWidth, sm: 260, md: 300 },
        maxWidth: { xs: compact ? 152 : 310, sm: '100%' },
        aspectRatio: HOME_CAROUSEL_CARD_ASPECT_RATIO,
        scrollSnapAlign: 'start',
        scrollSnapStop: 'normal',
        borderRadius: compact ? '10px' : '12px',
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
      {(!near || !loaded) && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{ position: 'absolute', inset: 0, bgcolor: 'color-mix(in srgb, var(--awm-bark) 8%, transparent)' }}
        />
      )}
      {near && (
      /* Plain <img>, not next/image: the covers API already serves
         storage-resolution WebP, so the optimizer would only add metered
         transformations without saving bytes. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={item.imageSrc}
        alt=""
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true)
          // Missing cover: keep the branded gradient tile with the title.
          e.currentTarget.style.display = 'none'
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          ...imageStyle,
        }}
      />
      )}
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,23,15,0) 42%, rgba(5,23,15,0.85) 100%)' }} />
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: compact ? { xs: 0.9, md: 1.05 } : { xs: 1.25, md: 1.5 } }}>
        {item.meta && (
          <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'var(--font-sans), sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 1px 8px rgba(0,0,0,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.meta}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: item.meta ? 0.25 : 0 }}>
          <Typography sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: compact ? { xs: '0.9rem', md: '1rem' } : { xs: '1.05rem', md: '1.2rem' }, fontWeight: 600, textShadow: '0 2px 10px rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </Typography>
          {item.level && (
            <CefrChip
              size="small"
              level={item.level}
              sx={{ flexShrink: 0, height: compact ? 18 : 20, fontSize: compact ? '0.61rem' : '0.68rem' }}
            />
          )}
        </Box>
      </Box>
    </Box>
  )
}

/* Horizontally scrolling row of portrait tiles. The chevron at the row's
   right edge is a link to the row's full listing page (when viewAllHref is
   given), not a scroller — the row itself swipes/drags. */
export default function NewOnRow({
  items,
  ariaLabel = 'Content carousel',
  mobileCardWidth,
  compact = false,
  viewAllHref,
  scrollHint = false,
}: {
  items: CatalogueRowItem[]
  ariaLabel?: string
  mobileCardWidth?: string | number
  compact?: boolean
  viewAllHref?: string
  /* Rows without a destination page (My List): the chevron
     scrolls the row instead of navigating, and only renders while content
     overflows the viewport. */
  scrollHint?: boolean
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const dragStartXRef = useRef<number | null>(null)
  const dragStartYRef = useRef<number | null>(null)
  const dragStartScrollRef = useRef(0)
  const activePointerIdRef = useRef<number | null>(null)
  const pointerTypeRef = useRef<string | null>(null)
  const draggedRef = useRef(false)
  const [overflows, setOverflows] = useState(false)

  /* The chevron only makes sense when there is more content than the
     viewport shows. Card widths are fixed, so item count + container size
     fully determine overflow (image loads never change scrollWidth). */
  useEffect(() => {
    if (!scrollHint) return
    const scroller = scrollerRef.current
    if (!scroller) return
    const update = () => setOverflows(scroller.scrollWidth > scroller.clientWidth + 4)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(scroller)
    return () => observer?.disconnect()
  }, [scrollHint, items.length])

  if (items.length === 0) return null

  const scrollForward = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 8
    scroller.scrollTo({ left: atEnd ? 0 : scroller.scrollLeft + scroller.clientWidth, behavior: 'smooth' })
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      {viewAllHref && (
        <Box
          component={Link}
          href={viewAllHref}
          aria-label={`See all: ${ariaLabel}`}
          sx={SEE_ALL_SX}
        >
          <ChevronRight sx={{ fontSize: 26 }} />
        </Box>
      )}
      {!viewAllHref && scrollHint && overflows && (
        <Box
          component="button"
          type="button"
          onClick={scrollForward}
          aria-label={`Scroll ${ariaLabel}`}
          sx={{ ...SEE_ALL_SX, border: 0, p: 0, cursor: 'pointer' }}
        >
          <ChevronRight sx={{ fontSize: 26 }} />
        </Box>
      )}

      <Box
        ref={scrollerRef}
        onPointerDown={(event) => {
          if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
          activePointerIdRef.current = event.pointerId
          pointerTypeRef.current = event.pointerType
          dragStartXRef.current = event.clientX
          dragStartYRef.current = event.clientY
          dragStartScrollRef.current = event.currentTarget.scrollLeft
          draggedRef.current = false
        }}
        onPointerMove={(event) => {
          if (activePointerIdRef.current !== event.pointerId || dragStartXRef.current === null || dragStartYRef.current === null) return
          /* Touch scrolling is native (see touch-action above) — a touch
             pointer gets pointercancel as soon as the browser starts a pan,
             so only mouse drags are handled manually. */
          if (pointerTypeRef.current !== 'mouse') return
          const distanceX = event.clientX - dragStartXRef.current
          const distanceY = event.clientY - dragStartYRef.current
          if (!draggedRef.current && Math.abs(distanceX) >= DRAG_ACTIVATION_DISTANCE_PX && Math.abs(distanceX) > Math.abs(distanceY)) {
            draggedRef.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
          }
          if (draggedRef.current) {
            event.preventDefault()
            event.currentTarget.scrollLeft = dragStartScrollRef.current - distanceX
          }
        }}
        onPointerUp={(event) => {
          dragStartXRef.current = null
          dragStartYRef.current = null
          activePointerIdRef.current = null
          pointerTypeRef.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          dragStartXRef.current = null
          dragStartYRef.current = null
          activePointerIdRef.current = null
          pointerTypeRef.current = null
          draggedRef.current = false
        }}
        onClickCapture={(event) => {
          if (!draggedRef.current || event.detail === 0) return
          event.preventDefault()
          event.stopPropagation()
          draggedRef.current = false
        }}
        role="region"
        aria-label={ariaLabel}
        sx={{
          display: 'flex',
          gap: compact ? { xs: 1, md: 1.5 } : { xs: 1.25, md: 2 },
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          py: compact ? 0.75 : 1,
          pr: 0.5,
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
          /* Touch: let the browser scroll natively in BOTH axes — horizontal
             pans move this overflow-x container, vertical pans chain to the
             page. The browser's gesture disambiguation beats any JS heuristic,
             and a pan never gets permanently claimed by the wrong direction.
             The pointer-drag handlers below are mouse-only. */
          touchAction: 'pan-x pan-y pinch-zoom',
          cursor: { md: 'grab' },
          '&:active': { cursor: { md: 'grabbing' } },
          userSelect: 'none',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          '@media (prefers-reduced-motion: reduce)': { scrollBehavior: 'auto' },
        }}
      >
        {items.map((item) => (
          <ArtworkTile key={item.key} item={item} mobileWidth={mobileCardWidth ?? (compact ? COMPACT_HOME_CARD_WIDTH.xs : '62vw')} compact={compact} />
        ))}
      </Box>
    </Box>
  )
}
