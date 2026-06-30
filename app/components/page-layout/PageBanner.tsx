'use client'

import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { ChevronRight } from '@mui/icons-material'

/* ── Palette ── */
const BARK = '#2c1a0e'
const GOLD = '#b8860b'
const GOLD_LT = '#d4a843'

export interface PageBannerFeature {
  icon: React.ReactNode
  label: string
}

export interface PageBannerProps {
  title: string
  titleAr: string
  description: string
  features: PageBannerFeature[]
  ctaLabel: string
  ctaAction: () => void
  ctaStartIcon?: React.ReactNode
  backgroundImage: string
  overlayGradient?: string
}

export default function PageBanner({
  title,
  titleAr,
  description,
  features,
  ctaLabel,
  ctaAction,
  ctaStartIcon,
  backgroundImage,
  overlayGradient = 'linear-gradient(to bottom, rgba(10,31,21,0.40) 0%, rgba(10,31,21,0.60) 55%, rgba(10,31,21,0.88) 100%)',
}: PageBannerProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: { xs: '320px', md: '360px' },
        maxHeight: { xs: '55vh', md: 'none' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: { xs: 2, md: 4 },
        // Push content below the fixed navbar, then add matching bottom padding
        // so the text block is centred in the visible banner area.
        pt: { xs: 13, md: 14 },
        pb: { xs: 6, md: 6 },
        overflow: 'hidden',
        // Pull the banner up into the navbar padding area so the background
        // starts flush with the top of the viewport (under the fixed navbar).
        mt: { xs: '-56px', md: '-64px' },
      }}
    >
      {/* Background image */}
      <Box
        component="img"
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
      {/* Dark overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: overlayGradient,
        }}
      />
      {/* Vignette */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Title */}
      <Typography
        variant="h1"
        sx={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: { xs: '32px', sm: '48px', md: '72px' },
          fontWeight: 700,
          color: '#fff',
          mb: 1,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {title}
      </Typography>

      {/* Arabic subtitle */}
      <Typography
        sx={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: { xs: '22px', sm: '26px', md: '36px' },
          fontWeight: 600,
          color: GOLD_LT,
          mb: 2,
          position: 'relative',
          zIndex: 1,
          direction: 'rtl',
          textAlign: 'center',
        }}
      >
        {titleAr}
      </Typography>

      {/* Description */}
      <Typography
        sx={{
          fontFamily: '"Jost", system-ui, sans-serif',
          fontSize: { xs: '14px', sm: '16px', md: '20px' },
          fontWeight: 500,
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.8)',
          maxWidth: 420,
          mb: { xs: 2, md: 3 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        {description}
      </Typography>

      {/* Feature labels — desktop */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          mb: 3,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {features.map((f) => (
          <Box key={f.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {f.icon}
            <Typography sx={{ fontSize: { xs: 13, md: 16 }, color: 'rgba(255,255,255,0.9)' }}>
              {f.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Mobile feature line */}
      {features.length > 0 && (
        <Typography
          sx={{
            display: { xs: 'block', lg: 'none' },
            fontSize: 12,
            fontStyle: 'italic',
            color: GOLD_LT,
            mb: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {features.map((f) => f.label).join(' · ')}
        </Typography>
      )}

      {/* CTA */}
      <Button
        variant="contained"
        startIcon={ctaStartIcon}
        endIcon={<ChevronRight />}
        onClick={ctaAction}
        sx={{
          backgroundColor: GOLD,
          color: BARK,
          fontFamily: '"Jost", system-ui, sans-serif',
          fontSize: { xs: 16, md: 19 },
          fontWeight: 500,
          textTransform: 'none',
          borderRadius: '9999px',
          px: 4,
          py: 1.2,
          minHeight: 48,
          boxShadow: '0 4px 16px rgba(184,134,11,0.3)',
          '&:hover': { backgroundColor: GOLD_LT, transform: 'scale(1.02)' },
          transition: 'all 0.2s',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {ctaLabel}
      </Button>
    </Box>
  )
}
