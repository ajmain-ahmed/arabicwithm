'use client'

import React from 'react'
import { Card, CardMedia, CardContent, Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { UnifiedArticle } from '@/app/lib/news'
import InlineVocabText from './InlineVocabText'
import PlaceholderImage from './PlaceholderImage'
import { getTimeAgo } from './TimeAgo'

interface MediumCardProps {
  article: UnifiedArticle
}

export default function MediumCard({ article }: MediumCardProps) {
  const router = useRouter()
  const timeAgo = getTimeAgo(article.date)

  return (
    <Card
      onClick={() => router.push(`/news/${article.id}`)}
      sx={{
        cursor: 'pointer',
        borderRadius: '10px',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: 'none',
        background: 'transparent',
        '&:hover': { transform: 'translateY(-2px)' },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16/10', overflow: 'hidden', borderRadius: '10px' }}>
        {article.image ? (
          <CardMedia
            component="img"
            image={article.image}
            alt={article.title}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'scale(1.03)' },
            }}
          />
        ) : (
          <PlaceholderImage label={article.sourceLabel} aspectRatio="auto" sx={{ height: '100%' }} />
        )}
        {/* Source + Time pill */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <Box
            sx={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              color: '#fff',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.65rem',
              fontWeight: 600,
              px: 1,
              py: 0.3,
              borderRadius: '9999px',
            }}
          >
            {article.sourceLabel}
          </Box>
          <Box
            sx={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.65rem',
              fontWeight: 500,
              px: 1,
              py: 0.3,
              borderRadius: '9999px',
            }}
          >
            {timeAgo}
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: 1.5, pt: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#2c1a0e',
            lineHeight: 1.35,
            direction: 'rtl',
            textAlign: 'right',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <InlineVocabText text={article.title} vocabMap={article.vocabMap || {}} textScale={0.9} propagateClick />
        </Typography>
      </CardContent>
    </Card>
  )
}
