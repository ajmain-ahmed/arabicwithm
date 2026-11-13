'use client'

import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { MenuBookOutlined } from '@mui/icons-material'
import { coverImageSrcSet } from '@/app/lib/imageVariantPaths'

/** Uses the already resolved book cover; no separate URL or Storage model. */
export default function BookCoverImage({ src, title }: { src: string; title: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  if (!src || failedSource === src) return <Box role="img" aria-label={`${title} cover unavailable`} sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 2, color: 'var(--awm-muted)', bgcolor: 'var(--awm-cream)' }}>
    <MenuBookOutlined aria-hidden="true" sx={{ fontSize: 44 }} />
    <Typography sx={{ fontFamily: 'var(--font-heading)', textAlign: 'center', overflowWrap: 'anywhere' }}>{title}</Typography>
  </Box>
  return <Box component="img" ref={(image: HTMLImageElement | null) => {
    // Eager SSR images can fail before hydration attaches the error listener.
    if (image?.complete && image.naturalWidth === 0) setFailedSource(src)
  }} src={src} srcSet={coverImageSrcSet(src)} sizes="(max-width: 600px) 220px, (max-width: 900px) 300px, 520px" alt={`${title} cover`} loading="eager" fetchPriority="high"
    onError={() => { setFailedSource(src); if (process.env.NODE_ENV === 'development') console.warn('[book cover] Cover image could not be loaded.') }}
    sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
}
