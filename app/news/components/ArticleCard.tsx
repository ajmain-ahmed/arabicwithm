'use client'

import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { CalendarDays, ExternalLink, User, Tag } from 'lucide-react'
import LevelBadge from './LevelBadge'

interface ArticleCardProps {
  title: string
  titleEnglish?: string
  titlePlain?: string
  image?: string
  date?: string
  level?: string
  source?: string
  author?: string
  topic?: string[]
  href: string
  isExternal?: boolean
}

function ArticleCard({
  title,
  titleEnglish,
  titlePlain,
  image,
  date,
  level,
  source,
  author,
  topic,
  href,
  isExternal = false,
}: ArticleCardProps) {
  return (
    <Box
      component="a"
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(44,26,14,0.08)',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        height: '100%',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 8px 24px rgba(44,26,14,0.12)',
          borderColor: 'rgba(184,134,11,0.25)',
        },
      }}
    >
      {/* Image */}
      <Box sx={{ position: 'relative', height: 200, overflow: 'hidden', background: '#f5ede0' }}>
        {image ? (
          <Box
            component="img"
            src={image}
            alt={title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'scale(1.03)' },
            }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f5ede0 0%, #e8dcc8 100%)',
            }}
          >
            <Typography
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: '2rem',
                color: '#b8860b',
                opacity: 0.4,
              }}
            >
              ✦
            </Typography>
          </Box>
        )}
        {isExternal && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'rgba(44,26,14,0.7)',
              borderRadius: '6px',
              px: 0.8,
              py: 0.4,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <ExternalLink size={12} color="#f5ede0" />
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#f5ede0',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              External
            </Typography>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ p: '14px 16px', display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        {/* Meta row: level + source */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {level && <LevelBadge level={level} />}
          {source && (
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.7rem',
                color: '#9e8a7a',
                fontWeight: 500,
              }}
            >
              {source}
            </Typography>
          )}
        </Box>

        {/* Arabic title */}
        <Typography
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#2c1a0e',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            direction: 'rtl',
          }}
        >
          {title}
        </Typography>

        {/* English title */}
        {(titleEnglish || titlePlain) && (
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.8rem',
              color: '#7a6e65',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {titleEnglish || titlePlain}
          </Typography>
        )}

        {/* Author */}
        {author && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <User size={12} color="#9e8a7a" />
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.72rem',
                color: '#9e8a7a',
              }}
            >
              {author}
            </Typography>
          </Box>
        )}

        {/* Topic tags */}
        {topic && topic.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
            {topic.slice(0, 3).map((t, i) => (
              <Chip
                key={i}
                icon={<Tag size={10} color="#b8860b" />}
                label={t}
                size="small"
                sx={{
                  height: 22,
                  background: 'rgba(184,134,11,0.08)',
                  color: '#b8860b',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  '& .MuiChip-icon': { ml: 0.5, mr: -0.3 },
                }}
              />
            ))}
          </Box>
        )}

        {/* Date */}
        {date && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 'auto', pt: 0.5 }}>
            <CalendarDays size={13} color="#9e8a7a" />
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.72rem',
                color: '#9e8a7a',
                fontWeight: 500,
              }}
            >
              {new Date(date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default React.memo(ArticleCard)
