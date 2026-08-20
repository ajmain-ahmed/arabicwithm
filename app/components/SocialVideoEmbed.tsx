'use client'

import { Box, Typography } from '@mui/material'
import {
  getSocialVideoEmbedUrl,
  type EpisodeVideoSource,
} from '@/app/lib/cartoons'

interface SocialVideoEmbedProps {
  source: EpisodeVideoSource
  autoplay?: boolean
  muted?: boolean
  title: string
}

export default function SocialVideoEmbed({
  source,
  autoplay = false,
  muted = false,
  title,
}: SocialVideoEmbedProps) {
  const src = getSocialVideoEmbedUrl(source, { autoplay, muted })

  if (!src) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', p: 3, bgcolor: '#090909' }}>
        <Typography sx={{ color: '#fff', fontFamily: 'Jost, sans-serif', textAlign: 'center' }}>
          This video source could not be embedded.
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      component="iframe"
      key={src}
      src={src}
      title={`${title} on ${source.label}`}
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      allowFullScreen
      loading={autoplay ? 'eager' : 'lazy'}
      referrerPolicy="strict-origin-when-cross-origin"
      sx={{ display: 'block', width: '100%', height: '100%', border: 0, bgcolor: '#090909' }}
    />
  )
}
