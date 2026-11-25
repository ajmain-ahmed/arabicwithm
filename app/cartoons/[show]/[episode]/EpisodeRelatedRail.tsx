'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { PlayArrow } from '@mui/icons-material'
import { Box, Typography } from '@mui/material'
import { ContentCard } from '@/app/components/content-grid'
import type { EpisodeMeta } from '@/app/lib/cartoons'

export type RelatedEpisode = EpisodeMeta & { showSlug: string; showTitle?: string }

export function RelatedRail({ related, currentSlug, variant }: { related: RelatedEpisode[]; currentSlug: string; variant: 'rail' | 'strip' }) {
 const {t:awmT}=useWebsiteLocale()

  const isStrip = variant === 'strip'
  return (
    <Box
      component={isStrip ? 'section' : 'aside'}
      aria-label={awmT("Up next")}
      sx={{
        flexDirection: 'column',
        gap: 1.1,
        minHeight: 0,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        ...(isStrip
          ? {
              display: { xs: 'none', md: 'flex', lg: 'none' },
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollSnapType: 'x proximity',
              width: '100%',
              px: { md: 2.5, lg: 4 },
              pt: { md: 3 },
              pb: { md: 4 },
            }
          : {
              display: { xs: 'none', lg: 'flex' },
              overflowY: 'auto',
              justifySelf: 'end',
              alignSelf: 'start',
              position: 'sticky',
              top: 'calc(var(--awm-navbar-height) + 32px)',
              width: '100%',
              maxWidth: 784,
              height: 'calc(100dvh - 129px)',
              pt: { lg: '7px' },
            }),
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--awm-gold-text)', mb: 0.5, px: 0.5, flexShrink: 0 }}>
        <UiText>{"Up next"}</UiText></Typography>
      {related.length === 0 && (
        <Typography sx={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: 'rgba(245,237,224,0.6)', px: 0.5 }}>
          <UiText>{"No other episodes in this show yet."}</UiText></Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          ...(isStrip
            ? {
                width: 'max-content',
                minWidth: '100%',
                gridAutoFlow: 'column',
                gridAutoColumns: { md: '180px' },
                alignItems: 'start',
              }
            : {
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                mt: { lg: '14px' },
                minWidth: 0,
              }),
        }}
      >
        {related.map((item) => {
          const active = item.slug === currentSlug
          return (
            <Box
              key={item.id}
              sx={{
                borderRadius: '4px',
                outline: active ? '2px solid rgba(212,168,67,0.7)' : '2px solid transparent',
                outlineOffset: 2,
                transition: 'outline-color .15s ease',
                scrollSnapAlign: 'start',
                '& img': { filter: 'brightness(0.62)', transition: 'filter .2s ease' },
                '&:hover img': { filter: 'brightness(1)' },
              }}
            >
              <ContentCard
                slug={item.slug}
                hrefPrefix={`/cartoons/${item.showSlug}`}
                cover={item.cover ?? ''}
                title={item.title}
                description={item.description}
                level={item.level}
                tags={item.tags}
                showTags={false}
                aspectRatio="5 / 6"
                imageFit="cover"
                imageCrop={item.coverCrop}
                denseMobileTile
                mobileAspectRatio="5 / 6"
                mobileImagePosition="center"
                overlayIcon={<PlayArrow sx={{ fontSize: 20, color: '#1a0f08', ml: 0.3 }} />}
                metaItems={[]}
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
