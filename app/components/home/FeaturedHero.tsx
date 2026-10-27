import Link from 'next/link'
import { Box, Button, Typography } from '@mui/material'
import { FormatListBulleted, PlayArrow } from '@mui/icons-material'
import CefrChip from '@/app/components/CefrChip'
import MemberActions from '@/app/components/navbar/MemberActions'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'

export interface FeaturedShow {
  show: ShowMeta
  episode: EpisodeMeta
  episodeCount: number
}

/* Netflix-style featured banner for signed-in visitors: artwork fills the
   frame, content sits bottom-left, and a theme-aware gradient blends the
   artwork into the page below. Deliberately shorter than a streaming
   billboard so the content rows stay close to the fold. */
export default function FeaturedHero({ show, episode, episodeCount }: FeaturedShow) {
  return (
    <Box
      data-featured-hero
      sx={{
        position: 'relative',
        mt: { xs: 'calc(-56px - env(safe-area-inset-top))', md: 'calc(-64px - env(safe-area-inset-top))' },
        height: { xs: 300, md: 440 },
        overflow: 'hidden',
        bgcolor: '#0a0f0d',
      }}
    >
      <Box
        component="img"
        src="/homepage/dbz-feature.avif"
        alt=""
        fetchPriority="high"
        decoding="async"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%' }}
      />
      {/* Legibility: weighted to the left where the text sits. */}
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(78deg, rgba(5,9,8,0.85) 0%, rgba(5,9,8,0.5) 36%, transparent 62%)' }} />
      {/* Blend the artwork into the page background below. */}
      <Box aria-hidden="true" sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '48%', background: 'linear-gradient(0deg, color-mix(in srgb, var(--awm-cream-light) 97%, transparent) 0%, color-mix(in srgb, var(--awm-cream-light) 55%, transparent) 36%, transparent 100%)' }} />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          width: '100%',
          maxWidth: 1280,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          px: { xs: 2, sm: 4, md: 6 },
          pb: { xs: 2.5, md: 4 },
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1.25 }}>
          <CefrChip level={show.level} size="small" />
          <Box sx={{ px: 1, py: 0.25, borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)' }}>
            <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 12, fontWeight: 600, color: '#fff' }}>
              {episodeCount} {episodeCount === 1 ? 'Episode' : 'Episodes'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mt: { xs: 1.75, md: 2.25 } }}>
          <Button
            component={Link}
            href={`/cartoons/${encodeURIComponent(show.slug)}/${encodeURIComponent(episode.slug)}`}
            variant="contained"
            startIcon={<PlayArrow sx={{ fontSize: { xs: 20, md: 22 } }} />}
            sx={{
              minHeight: { xs: 40, md: 44 },
              px: { xs: 2.5, md: 3 },
              borderRadius: '8px',
              bgcolor: '#fff',
              color: '#141414',
              fontFamily: 'var(--font-sans), sans-serif',
              fontWeight: 800,
              fontSize: { xs: 14, md: 15 },
              textTransform: 'none',
              boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.82)', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' },
            }}
          >
            Play
          </Button>
          <Button
            component={Link}
            href={`/cartoons/${encodeURIComponent(show.slug)}`}
            startIcon={<FormatListBulleted sx={{ fontSize: 18 }} />}
            sx={{
              minHeight: { xs: 40, md: 44 },
              px: { xs: 2.25, md: 2.75 },
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
        {/* Desktop surfaces streak/AWM+ in the navbar; on mobile the hero is their home. */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, mt: 2 }}>
          <MemberActions />
        </Box>
      </Box>
    </Box>
  )
}
