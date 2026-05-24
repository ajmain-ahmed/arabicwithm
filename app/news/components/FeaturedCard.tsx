'use client'

import React from 'react'
import { Card, CardMedia, CardContent, Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { UnifiedArticle } from '@/app/lib/news'
import InlineVocabText from './InlineVocabText'
import PlaceholderImage from './PlaceholderImage'
import { getTimeAgo } from './TimeAgo'

interface FeaturedCardProps {
  article: UnifiedArticle
}

export default function FeaturedCard({ article }: FeaturedCardProps) {
  const router = useRouter()
  const timeAgo = getTimeAgo(article.date)

  return (
    <Card
      onClick={() => router.push(`/news/${article.id}`)}
      sx={{
        cursor: 'pointer',
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        height: { xs: '320px', md: '420px', lg: '480px' },
        transition: 'transform 0.3s ease',
        '&:hover': { transform: 'scale(1.005)' },
        boxShadow: 'none',
      }}
    >
      {article.image ? (
        <CardMedia
          component="img"
          image={article.image}
          alt={article.title}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <PlaceholderImage label={article.sourceLabel} aspectRatio="auto" sx={{ height: '100%' }} />
        </Box>
      )}

      {/* Gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />

      {/* Source + Time pill */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          sx={{
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.7rem',
            fontWeight: 600,
            px: 1.2,
            py: 0.4,
            borderRadius: '9999px',
            letterSpacing: '0.02em',
          }}
        >
          {article.sourceLabel}
        </Box>
        <Box
          sx={{
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            color: 'rgba(255,255,255,0.8)',
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.7rem',
            fontWeight: 500,
            px: 1.2,
            py: 0.4,
            borderRadius: '9999px',
          }}
        >
          {timeAgo}
        </Box>
      </Box>

      <CardContent
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: { xs: 2.5, md: 3.5 },
          zIndex: 2,
          '&:last-child': { pb: { xs: 2.5, md: 3.5 } },
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize: { xs: '1.4rem', md: '1.8rem', lg: '2.2rem' },
            fontWeight: 700,
            color: '#f5ede0',
            lineHeight: 1.25,
            direction: 'rtl',
            textAlign: 'right',
            mb: 1,
            textShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          <InlineVocabText text={article.title} vocabMap={article.vocabMap || {}} textScale={1} propagateClick />
        </Typography>

        {article.summary && (
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: { xs: '0.85rem', md: '0.95rem' },
              color: 'rgba(245,237,224,0.75)',
              lineHeight: 1.5,
              direction: 'rtl',
              textAlign: 'right',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {article.summary}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
