'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Box, Chip, IconButton, Skeleton, Typography } from '@mui/material'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'

export interface CatalogueRowItem {
  key: string
  href: string
  title: string
  /** Small context line above the title, e.g. the show name for an episode. */
  meta?: string
  level?: string
  imageSrc: string
}

const ARROW_SX = {
  /* Always visible on touch (no hover there); on desktop they stay hidden
     until the row is hovered. */
  display: 'flex',
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
  opacity: { xs: 0.95, md: 0 },
  visibility: { xs: 'visible', md: 'hidden' },
  transition: 'opacity 0.2s ease, visibility 0.2s ease, background-color 0.2s ease, transform 0.2s ease',
  '&:hover': { bgcolor: 'rgba(5,23,15,0.85)', transform: 'translateY(-50%) scale(1.08)' },
} as const

function RowTile({ item }: { item: CatalogueRowItem }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <Box
      component={Link}
      href={item.href}
      aria-label={item.title}
      sx={{
        position: 'relative',
        flex: '0 0 auto',
        width: { xs: '62vw', sm: 300, md: 320 },
        maxWidth: '100%',
        aspectRatio: '16 / 9',
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
        src={item.imageSrc}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true)
          // Missing cover: keep the branded gradient tile with the title.
          e.currentTarget.style.display = 'none'
        }}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
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

/* Netflix-style horizontally scrolling row of landscape tiles. Subtle circular
   hover arrows appear at the edges when there is more content to scroll to. */
export default function NewOnRow({ items }: { items: CatalogueRowItem[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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
    // No scroll-snap on this scroller: snap re-evaluation at the end of a
    // programmatic scroll is what made the slide lurch.
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <Box sx={{ position: 'relative', '&:hover .awm-row-arrow[data-active="true"]': { opacity: 0.95, visibility: 'visible' } }}>
      {/* edge fades hint at more content when the row overflows */}
      <Box aria-hidden="true" sx={{ pointerEvents: 'none', position: 'absolute', zIndex: 2, top: 0, bottom: 8, left: 0, width: { xs: 24, md: 48 }, background: 'linear-gradient(90deg, var(--awm-row-edge, var(--awm-cream-light)), transparent)' }} />
      <Box aria-hidden="true" sx={{ pointerEvents: 'none', position: 'absolute', zIndex: 2, top: 0, bottom: 8, right: 0, width: { xs: 24, md: 48 }, background: 'linear-gradient(270deg, var(--awm-row-edge, var(--awm-cream-light)), transparent)' }} />

      <IconButton
        className="awm-row-arrow"
        data-active={canScrollLeft ? 'true' : 'false'}
        aria-label="Scroll back"
        onClick={() => scrollByPage(-1)}
        sx={{ ...ARROW_SX, left: 4 }}
      >
        <ChevronLeft sx={{ fontSize: 26 }} />
      </IconButton>
      <IconButton
        className="awm-row-arrow"
        data-active={canScrollRight ? 'true' : 'false'}
        aria-label="Scroll forward"
        onClick={() => scrollByPage(1)}
        sx={{ ...ARROW_SX, right: 4 }}
      >
        <ChevronRight sx={{ fontSize: 26 }} />
      </IconButton>

      <Box
        ref={scrollerRef}
        onScroll={updateArrows}
        sx={{
          display: 'flex',
          gap: { xs: 1.25, md: 2 },
          overflowX: 'auto',
          py: 1,
          pr: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {items.map((item) => (
          <RowTile key={item.key} item={item} />
        ))}
      </Box>
    </Box>
  )
}
