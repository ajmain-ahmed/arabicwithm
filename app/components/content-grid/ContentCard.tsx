'use client'

import React, { useState } from 'react'
import { Box, Typography, Chip, Paper } from '@mui/material'
import Link from 'next/link'

/* ── Palette ── */
const BARK = 'var(--awm-bark)'
const GOLD = 'var(--awm-gold)'
const WARM_WHITE = 'var(--awm-cream-light)'
const MUTED = 'var(--awm-muted)'
const LABEL = 'var(--awm-muted-light)'

const DIFFICULTY_COLORS: Record<string, string> = {
  'A1-A2': '#6b8f5e',
  'A2-B1': '#5a7d8c',
  'B1-B2': '#c4904a',
  'B2-C1': '#8a6a8a',
}

/* ═══════════════════════════════════════════════
   Content Card
   ═══════════════════════════════════════════════ */
export interface ContentCardMetaItem {
  icon: React.ReactNode
  label: string
}

export interface ContentCardProps {
  slug: string
  hrefPrefix: string
  cover: string
  title: string
  titleAr?: string
  description?: string
  category?: string
  tags?: string[]
  level?: string
  metaItems: ContentCardMetaItem[]
  overlayIcon?: React.ReactNode
  aspectRatio?: string
  imageFit?: 'cover' | 'contain' | 'natural'
  compactMobileRow?: boolean
  denseMobileTile?: boolean
  mobileAspectRatio?: string
  mobileImagePosition?: string
  mobileTitleSize?: number
  showTags?: boolean
  maxVisibleTags?: number
}

export default function ContentCard({
  slug,
  hrefPrefix,
  cover,
  title,
  titleAr,
  description,
  category,
  tags = [],
  level,
  metaItems,
  overlayIcon,
  aspectRatio = '16/9',
  imageFit = 'cover',
  compactMobileRow = false,
  denseMobileTile = false,
  mobileAspectRatio = '4 / 3',
  mobileImagePosition = 'center',
  mobileTitleSize = 10,
  showTags = true,
  maxVisibleTags,
}: ContentCardProps) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const badgeColor = DIFFICULTY_COLORS[level ?? ''] || MUTED
  const href = `${hrefPrefix}/${encodeURIComponent(slug)}`
  const allDisplayTags = Array.from(new Set([category, ...tags].filter((tag): tag is string => Boolean(tag?.trim()))))
  const displayTags = maxVisibleTags == null ? allDisplayTags : allDisplayTags.slice(0, maxVisibleTags)

  return (
    <Paper
      component={Link}
      href={href}
      elevation={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: denseMobileTile ? 'block' : compactMobileRow ? { xs: 'grid', sm: 'block' } : 'block',
        gridTemplateColumns: compactMobileRow ? { xs: '34% minmax(0, 1fr)', sm: 'none' } : undefined,
        alignItems: denseMobileTile ? undefined : compactMobileRow ? { xs: 'stretch', sm: 'initial' } : undefined,
        color: 'inherit',
        textDecoration: 'none',
        borderRadius: denseMobileTile ? { xs: '4px', sm: '10px' } : '10px',
        overflow: 'hidden',
        backgroundColor: denseMobileTile ? { xs: 'transparent', sm: WARM_WHITE } : WARM_WHITE,
        border: denseMobileTile ? { xs: 0, sm: '1px solid rgba(44,26,14,0.04)' } : '1px solid rgba(44,26,14,0.04)',
        boxShadow: denseMobileTile
          ? { xs: 'none', sm: hovered ? '0 8px 24px rgba(44,26,14,0.1)' : '0 1px 4px rgba(44,26,14,0.06)' }
          : hovered ? '0 8px 24px rgba(44,26,14,0.1)' : '0 1px 4px rgba(44,26,14,0.06)',
        transform: denseMobileTile ? { xs: 'none', sm: hovered ? 'translateY(-3px)' : 'none' } : hovered ? 'translateY(-3px)' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        minHeight: denseMobileTile ? undefined : compactMobileRow ? { xs: 148, sm: 0 } : undefined,
      }}
    >
      {/* Thumbnail */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          flexShrink: denseMobileTile ? undefined : compactMobileRow ? 0 : undefined,
          aspectRatio: denseMobileTile
            ? { xs: mobileAspectRatio, sm: imageFit === 'natural' ? 'auto' : aspectRatio }
            : compactMobileRow
            ? { xs: 'auto', sm: imageFit === 'natural' ? 'auto' : aspectRatio }
            : imageFit === 'natural' ? 'auto' : aspectRatio,
          minHeight: compactMobileRow ? { xs: 148, sm: 0 } : undefined,
          overflow: 'hidden',
          borderRadius: denseMobileTile ? { xs: '4px', sm: 0 } : 0,
          backgroundColor: denseMobileTile
            ? { xs: '#efe5d6', sm: imageFit === 'contain' ? '#efe5d6' : 'transparent' }
            : compactMobileRow
            ? { xs: '#efe5d6', sm: imageFit === 'contain' ? '#efe5d6' : 'transparent' }
            : imageFit === 'contain' ? '#efe5d6' : 'transparent',
        }}
      >
        {!imgError ? (
          <Box
            component="img"
            src={cover}
            alt={title}
            onError={() => setImgError(true)}
            sx={{
              width: '100%',
              height: denseMobileTile
                ? { xs: '100%', sm: imageFit === 'natural' ? 'auto' : '100%' }
                : compactMobileRow
                ? { xs: '100%', sm: imageFit === 'natural' ? 'auto' : '100%' }
                : imageFit === 'natural' ? 'auto' : '100%',
              display: 'block',
              objectFit: denseMobileTile
                ? { xs: 'cover', sm: imageFit === 'natural' ? undefined : imageFit }
                : compactMobileRow
                ? { xs: 'contain', sm: imageFit === 'natural' ? undefined : imageFit }
                : imageFit === 'natural' ? undefined : imageFit,
              objectPosition: denseMobileTile ? { xs: mobileImagePosition, sm: 'center' } : 'center',
              transform: hovered && imageFit !== 'natural' ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.3s',
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: denseMobileTile
                ? { xs: '100%', sm: imageFit === 'natural' ? 'auto' : '100%' }
                : compactMobileRow
                ? { xs: '100%', sm: imageFit === 'natural' ? 'auto' : '100%' }
                : imageFit === 'natural' ? 'auto' : '100%',
              minHeight: denseMobileTile
                ? { xs: 0, sm: imageFit === 'natural' ? 180 : 0 }
                : compactMobileRow
                ? { xs: 0, sm: imageFit === 'natural' ? 180 : 0 }
                : imageFit === 'natural' ? 180 : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(44,26,14,0.08) 0%, rgba(184,134,11,0.08) 100%)',
              px: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--font-heading)',
                fontSize: { xs: 16, md: 18 },
                fontWeight: 600,
                color: BARK,
                textAlign: 'center',
                lineHeight: 1.25,
              }}
            >
              {title}
            </Typography>
          </Box>
        )}
        {/* Bottom gradient */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: denseMobileTile ? { xs: 'none', sm: 'block' } : 'block',
            background: compactMobileRow
              ? { xs: 'linear-gradient(transparent 72%, rgba(44,26,14,0.35))', sm: 'linear-gradient(transparent 60%, rgba(44,26,14,0.5))' }
              : 'linear-gradient(transparent 60%, rgba(44,26,14,0.5))',
            pointerEvents: 'none',
          }}
        />
        {/* Overlay icon (play, read, etc.) */}
        {overlayIcon && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: denseMobileTile ? { xs: 'none', sm: 'flex' } : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: hovered ? 'rgba(44,26,14,0.2)' : 'rgba(44,26,14,0.1)',
              transition: 'background-color 0.2s',
            }}
          >
            <Box
              sx={{
                width: compactMobileRow ? { xs: 34, sm: 44 } : 44,
                height: compactMobileRow ? { xs: 34, sm: 44 } : 44,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {overlayIcon}
            </Box>
          </Box>
        )}
        {/* Difficulty badge */}
        {level && (
          <Chip
            label={level}
            size="small"
            sx={{
              position: 'absolute',
              display: denseMobileTile || compactMobileRow ? { xs: 'none', sm: 'inline-flex' } : 'inline-flex',
              top: 8,
              right: 8,
              backgroundColor: badgeColor,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              height: 24,
              borderRadius: '6px',
              '& .MuiChip-label': { px: 1.2, py: 0 },
            }}
          />
        )}
      </Box>

      {/* Card Body */}
      <Box sx={{ p: denseMobileTile ? { xs: '5px 1px 0', sm: 2 } : compactMobileRow ? { xs: 1.5, sm: 2 } : 2, flex: denseMobileTile ? undefined : compactMobileRow ? 1 : undefined, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-heading)',
            fontSize: denseMobileTile ? { xs: mobileTitleSize, sm: 18, md: 20 } : compactMobileRow ? { xs: 16, sm: 18, md: 20 } : { xs: 18, md: 20 },
            fontWeight: denseMobileTile ? { xs: 600, sm: 500 } : 500,
            letterSpacing: '-0.01em',
            lineHeight: denseMobileTile ? { xs: 1.2, sm: 1.25 } : 1.25,
            color: BARK,
            mb: denseMobileTile ? { xs: 0, sm: 0.5 } : 0.5,
            minHeight: denseMobileTile ? { xs: '2.4em', sm: 0 } : 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: denseMobileTile || compactMobileRow ? { xs: '-webkit-box', sm: 'block' } : 'block',
            WebkitLineClamp: denseMobileTile || compactMobileRow ? { xs: 2, sm: 'unset' } : 'unset',
            WebkitBoxOrient: 'vertical',
            whiteSpace: denseMobileTile || compactMobileRow ? { xs: 'normal', sm: 'nowrap' } : 'nowrap',
          }}
        >
          {title}
        </Typography>
        {titleAr && (
          <Typography
            sx={{
              display: denseMobileTile ? { xs: 'none', sm: 'block' } : 'block',
              fontFamily: 'var(--font-heading)',
              fontSize: { xs: 15, md: 18 },
              color: GOLD,
              mb: compactMobileRow ? { xs: 1, sm: 1.5 } : 1.5,
            }}
            noWrap
          >
            {titleAr}
          </Typography>
        )}
        {/* Mobile row description */}
        {description && compactMobileRow && (
          <Typography
            sx={{
              display: { xs: '-webkit-box', sm: 'none' },
              mb: 1,
              overflow: 'hidden',
              color: MUTED,
              fontFamily: 'Jost, sans-serif',
              fontSize: 11.5,
              lineHeight: 1.4,
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {description}
          </Typography>
        )}
        {/* Tags */}
        <Box sx={{ display: showTags ? (denseMobileTile ? { xs: 'none', sm: 'flex' } : 'flex') : 'none', gap: 1, mb: compactMobileRow ? { xs: 0.75, sm: 1.5 } : 1.5, flexWrap: 'wrap' }}>
          {level && compactMobileRow && (
            <Chip
              label={level}
              size="small"
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
                height: 21,
                borderRadius: '9999px',
                backgroundColor: badgeColor,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                '& .MuiChip-label': { px: 0.9 },
              }}
            />
          )}
          {displayTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: compactMobileRow ? { xs: 21, sm: 24 } : 24,
                borderRadius: '9999px',
                backgroundColor: 'rgba(184,134,11,0.08)',
                color: GOLD,
                fontSize: compactMobileRow ? { xs: 10, sm: 11 } : 11,
                fontWeight: 500,
                border: '1px solid rgba(184,134,11,0.12)',
                '& .MuiChip-label': { px: compactMobileRow ? { xs: 0.9, sm: 1 } : 1 },
              }}
            />
          ))}

        </Box>
        {/* Description */}
        {description && (
          <Typography
            sx={{
              display: denseMobileTile ? { xs: 'none', sm: '-webkit-box' } : compactMobileRow ? { xs: 'none', sm: '-webkit-box' } : '-webkit-box',
              fontSize: compactMobileRow ? { xs: 12.5, sm: 14, md: 15 } : { xs: 14, md: 15 },
              lineHeight: 1.45,
              color: MUTED,
              mb: compactMobileRow ? { xs: 0, sm: 1.5 } : 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {description}
          </Typography>
        )}
        {/* Meta row */}
        {metaItems.length > 0 && (
          <Box
            sx={{
              display: denseMobileTile ? { xs: 'none', sm: 'flex' } : 'flex',
              alignItems: 'center',
              gap: 3,
              pt: 1.5,
              borderTop: '1px solid rgba(44,26,14,0.06)',
            }}
          >
            {metaItems.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {item.icon}
                <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: LABEL }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  )
}
