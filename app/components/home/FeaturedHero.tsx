'use client'

import Link from 'next/link'
import { Box, Button, Typography } from '@mui/material'
import { FormatListBulleted, PlayArrow } from '@mui/icons-material'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'

export interface FeaturedShow {
  show: ShowMeta
  episode: EpisodeMeta
  episodeCount: number
}

/* Netflix-style featured banner for signed-in visitors: artwork in a card,
   content bottom-left inside it. Desktop runs full-bleed; mobile is a tall
   card so the whole height of the artwork is visible. Deliberately shorter
   than a streaming billboard so the rows stay near the fold. */
export default function FeaturedHero({ show, episode }: FeaturedShow) {
  return (
    <Box
      data-featured-hero
      sx={{
        pt: 'calc(var(--awm-navbar-height) + 14px)',
        pb: { xs: 1.5, md: 2.5 },
        px: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          /* Desktop: aspect-locked to the artwork (2560×1080) so the whole
             image fits with zero crop. Mobile: a tall card so cover-scaling
             shows the artwork's full height (only the sides crop). */
          height: { xs: 'clamp(430px, 56dvh, 560px)', md: 'auto' },
          aspectRatio: { md: '2560 / 1080' },
          mx: 'auto',
          borderRadius: { xs: '14px', md: '18px' },
          overflow: 'hidden',
          bgcolor: '#0a0f0d',
          border: '1px solid color-mix(in srgb, var(--awm-bark) 10%, transparent)',
          boxShadow: '0 18px 50px color-mix(in srgb, var(--awm-bark) 16%, transparent)',
        }}
      >
        <Box
          component="img"
          src="/homepage/dbz-feature.avif"
          alt=""
          fetchPriority="high"
          decoding="async"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Legibility: weighted to the left where the text sits. */}
        <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(78deg, rgba(5,9,8,0.85) 0%, rgba(5,9,8,0.5) 36%, transparent 62%)' }} />
        <Box aria-hidden="true" sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%', background: 'linear-gradient(0deg, rgba(5,9,8,0.78) 0%, rgba(5,9,8,0.35) 40%, transparent 100%)' }} />

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            px: { xs: 2.5, sm: 4, md: 6 },
            pb: { xs: 2.25, md: 3.5 },
          }}
        >
          <Typography sx={{ color: 'var(--awm-gold-light)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', mb: 1, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            Featured
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: 'var(--font-heading)',
              fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4.2rem' },
              fontWeight: 600,
              lineHeight: 1.02,
              color: '#fff',
              textShadow: '0 2px 14px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            {show.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mt: { xs: 1.75, md: 2.25 } }}>
            <Button
              component={Link}
              href={`/cartoons/${encodeURIComponent(show.slug)}/${encodeURIComponent(episode.slug)}`}
              variant="contained"
              startIcon={<PlayArrow sx={{ fontSize: { xs: 20, md: 22 } }} />}
              sx={{
                minHeight: { xs: 42, md: 46 },
                px: { xs: 3, md: 3.5 },
                borderRadius: '8px',
                bgcolor: '#0e2e1f',
                color: '#fff',
                fontFamily: 'var(--font-sans), sans-serif',
                fontWeight: 800,
                fontSize: { xs: 14, md: 15 },
                textTransform: 'none',
                boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                '&:hover': { bgcolor: '#174832', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' },
              }}
            >
              Play
            </Button>
            <Button
              component={Link}
              href={`/cartoons/${encodeURIComponent(show.slug)}`}
              startIcon={<FormatListBulleted sx={{ fontSize: 18 }} />}
              sx={{
                minHeight: { xs: 42, md: 46 },
                px: { xs: 2.5, md: 3 },
                borderRadius: '8px',
                bgcolor: 'rgba(109,109,110,0.55)',
                color: '#fff',
                fontFamily: 'var(--font-sans), sans-serif',
                fontWeight: 700,
                fontSize: { xs: 14, md: 15 },
                textTransform: 'none',
                backdropFilter: 'blur(6px)',
                '&:hover': { bgcolor: 'rgba(109,109,110,0.4)' },
              }}
            >
              More Episodes
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
