'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Box, Chip, IconButton, Typography } from '@mui/material'
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
  display: { xs: 'none', md: 'flex' },
  position: 'absolute',
  zIndex: 3,
  top: 8,
  bottom: 16,
  width: 40,
  borderRadius: '8px',
  bgcolor: 'rgba(5,23,15,0.45)',
  color: '#fff',
  opacity: 0,
  transition: 'opacity 0.2s ease, background-color 0.2s ease',
  '&:hover': { bgcolor: 'rgba(5,23,15,0.7)' },
} as const

/* Netflix-style horizontally scrolling row of landscape tiles. Subtle hover
   arrows appear at the edges when there is more content to scroll to. */
export default function NewOnRow({ items }: { items: CatalogueRowItem[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = () => {
    const el = scrollerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
    window.addEventListener('resize', updateArrows)
    return () => window.removeEventListener('resize', updateArrows)
  }, [items])

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <Box sx={{ position: 'relative', '&:hover .awm-row-arrow': { opacity: 1 } }}>
      {/* edge fades hint at more content when the row overflows */}
      <Box aria-hidden="true" sx={{ pointerEvents: 'none', position: 'absolute', zIndex: 2, top: 0, bottom: 8, left: 0, width: { xs: 24, md: 48 }, background: 'linear-gradient(90deg, var(--awm-cream-light), transparent)' }} />
      <Box aria-hidden="true" sx={{ pointerEvents: 'none', position: 'absolute', zIndex: 2, top: 0, bottom: 8, right: 0, width: { xs: 24, md: 48 }, background: 'linear-gradient(270deg, var(--awm-cream-light), transparent)' }} />

      {canScrollLeft && (
        <IconButton className="awm-row-arrow" aria-label="Scroll back" onClick={() => scrollByPage(-1)} sx={{ ...ARROW_SX, left: 0 }}>
          <ChevronLeft />
        </IconButton>
      )}
      {canScrollRight && (
        <IconButton className="awm-row-arrow" aria-label="Scroll forward" onClick={() => scrollByPage(1)} sx={{ ...ARROW_SX, right: 0 }}>
          <ChevronRight />
        </IconButton>
      )}

      <Box
        ref={scrollerRef}
        onScroll={updateArrows}
        sx={{
          display: 'flex',
          gap: { xs: 1.25, md: 2 },
          overflowX: 'auto',
          scrollSnapType: 'x proximity',
          py: 1,
          pr: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {items.map((item) => (
          <Box
            key={item.key}
            component={Link}
            href={item.href}
            aria-label={item.title}
            sx={{
              position: 'relative',
              flex: '0 0 auto',
              scrollSnapAlign: 'start',
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
            <Box
              component="img"
              src={item.imageSrc}
              alt=""
              loading="lazy"
              onError={(e) => {
                // Missing cover: keep the branded gradient tile with the title.
                e.currentTarget.style.display = 'none'
              }}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
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
        ))}
      </Box>
    </Box>
  )
}
