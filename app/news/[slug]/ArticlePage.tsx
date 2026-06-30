'use client'

import React, { useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Chip,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { ArrowLeft, CalendarDays, Globe, User, Tag, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ParsedArticle } from '@/app/lib/news'
import InlineMdVocab from '../components/InlineMdVocab'
import LevelBadge from '../components/LevelBadge'

interface ArticlePageProps {
  article: ParsedArticle
}

export default function ArticlePage({ article }: ArticlePageProps) {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  // Build full article text from paragraphs
  const articleText = article.paragraphs.map((p) => p.arabicDi).join('\n\n')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap');
      `}</style>

      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          background: '#f5ede0',
          pb: { xs: 8, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          {/* Back button */}
          <Box sx={{ pt: { xs: 2, md: 3 }, pb: 2 }}>
            <IconButton
              onClick={() => router.push('/news')}
              sx={{
                color: '#7a6e65',
                '&:hover': { color: '#2c1a0e', background: 'rgba(44,26,14,0.05)' },
              }}
            >
              <ArrowLeft size={22} />
            </IconButton>
          </Box>

          {/* Header — centered */}
          <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto', mb: 4 }}>
            {/* Title with inline vocab */}
            <Typography
              component="h1"
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: { xs: '1.6rem', md: '2.2rem' },
                fontWeight: 700,
                color: '#2c1a0e',
                lineHeight: 1.4,
                direction: 'rtl',
                mb: 1.5,
              }}
            >
              <InlineMdVocab
                text={article.title}
                wordBreakdown={article.wordBreakdown}
              />
            </Typography>

            {/* English title */}
            {article.titleEnglish && (
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  color: '#7a6e65',
                  fontWeight: 400,
                  mb: 2.5,
                }}
              >
                {article.titleEnglish}
              </Typography>
            )}

            {/* Meta chips */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.2,
                flexWrap: 'wrap',
                mb: 2,
              }}
            >
              <LevelBadge level={article.level} size="md" />

              {article.source && (
                <Chip
                  icon={<BookOpen size={14} color="#9e8a7a" />}
                  label={article.source}
                  size="small"
                  sx={{
                    background: 'rgba(44,26,14,0.04)',
                    color: '#7a6e65',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    '& .MuiChip-icon': { ml: 0.8 },
                  }}
                />
              )}

              {article.date && (
                <Chip
                  icon={<CalendarDays size={14} color="#9e8a7a" />}
                  label={new Date(article.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  size="small"
                  sx={{
                    background: 'rgba(44,26,14,0.04)',
                    color: '#7a6e65',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    '& .MuiChip-icon': { ml: 0.8 },
                  }}
                />
              )}

              {/* Author chip — if available in frontmatter */}
              {/* We don't have author in ParsedArticle yet — add if needed */}
            </Box>

            {/* Topic tags */}
            {/* Topic not currently in ParsedArticle — would need to parse from frontmatter */}
          </Box>

          {/* Image */}
          {article.image && (
            <Box
              sx={{
                width: '100%',
                maxWidth: 900,
                mx: 'auto',
                mb: 5,
                borderRadius: '14px',
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={article.image}
                alt={article.title}
                sx={{
                  width: '100%',
                  height: { xs: 260, md: 480 },
                  objectFit: 'cover',
                }}
              />
            </Box>
          )}

          {/* Article Body */}
          <Box sx={{ maxWidth: 780, mx: 'auto' }}>
            {article.paragraphs.map((para, idx) => (
              <Box key={idx} sx={{ mb: 3 }}>
                {/* Arabic with inline vocab */}
                <Typography
                  sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: { xs: '1.2rem', md: '1.45rem' },
                    fontWeight: 500,
                    color: '#2c1a0e',
                    lineHeight: 1.75,
                    direction: 'rtl',
                    mb: 1,
                  }}
                >
                  <InlineMdVocab
                    text={para.arabicDi}
                    wordBreakdown={article.wordBreakdown}
                  />
                </Typography>

                {/* English translation */}
                <Typography
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: { xs: '0.9rem', md: '0.95rem' },
                    color: '#7a6e65',
                    lineHeight: 1.6,
                    fontStyle: 'italic',
                  }}
                >
                  {para.english}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>
    </>
  )
}
