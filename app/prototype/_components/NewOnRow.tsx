import Link from 'next/link'
import { Box, Chip, Typography } from '@mui/material'
import type { NewOnShow } from './newOnShows'

/* Netflix-style horizontally scrolling row of landscape show tiles. */
export default function NewOnRow({ shows }: { shows: NewOnShow[] }) {
  if (shows.length === 0) return null
  return (
    <Box sx={{ position: 'relative' }}>
      {/* edge fades hint at more content when the row overflows */}
      <Box aria-hidden="true" sx={{ pointerEvents: 'none', position: 'absolute', zIndex: 2, top: 0, bottom: 8, left: 0, width: { xs: 24, md: 48 }, background: 'linear-gradient(90deg, var(--awm-cream-light), transparent)' }} />
      <Box aria-hidden="true" sx={{ pointerEvents: 'none', position: 'absolute', zIndex: 2, top: 0, bottom: 8, right: 0, width: { xs: 24, md: 48 }, background: 'linear-gradient(270deg, var(--awm-cream-light), transparent)' }} />

      <Box
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
        {shows.map((show) => (
          <Box
            key={show.id}
            component={Link}
            href={`/cartoons/${encodeURIComponent(show.slug)}`}
            aria-label={show.title}
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
              src={`/api/covers/shows/${show.id}`}
              alt=""
              loading="lazy"
              onError={(e) => {
                // Missing cover: keep the branded gradient tile with the title.
                e.currentTarget.style.display = 'none'
              }}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,23,15,0) 42%, rgba(5,23,15,0.85) 100%)' }} />
            <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: { xs: 1.25, md: 1.5 } }}>
              <Typography sx={{ color: '#fff', fontFamily: 'var(--font-heading)', fontSize: { xs: '1.05rem', md: '1.2rem' }, fontWeight: 600, textShadow: '0 2px 10px rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {show.title}
              </Typography>
              {show.level && (
                <Chip
                  size="small"
                  label={show.level}
                  sx={{ flexShrink: 0, height: 20, fontSize: '0.68rem', bgcolor: 'rgba(212,168,67,0.92)', color: '#0e2e1f', fontWeight: 700, fontFamily: 'Jost, sans-serif' }}
                />
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
