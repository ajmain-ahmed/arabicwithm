'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Chip,
  Button,
  Container,
  Divider,
} from '@mui/material'
import { ArrowBack, CalendarToday, OpenInNew } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import InlineVocabText from '../components/InlineVocabText'
import { UnifiedArticle } from '@/app/lib/news'

const LEVEL_COLORS: Record<string, string> = {
  A1: '#2d6a4f', A2: '#40916c', B1: '#b5861a', B2: '#9c6b00', C1: '#6d4c9e', C2: '#4a2f7a',
}

export default function ArticlePage({
  article,
}: {
  article: UnifiedArticle
}) {
  const router = useRouter()
  const [navbarHeight, setNavbarHeight] = useState(64)

  useEffect(() => {
    const measure = () => {
      const nav = document.getElementById('main-navbar')
      if (nav) setNavbarHeight(nav.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const formattedDate = new Date(article.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const paragraphs = article.isExternal
    ? [article.body || article.summary].filter(Boolean)
    : article.body
      ? article.body.split('\n\n').map((p) => p.trim()).filter((p) => p.length > 0)
      : []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap');
      `}</style>

      <Box
        component="main"
        sx={{
          background: '#faf7f2',
          minHeight: '100vh',
          pt: `${navbarHeight}px`,
          pb: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          {/* Back button */}
          <Box
            onClick={() => router.push('/news')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.85rem',
              color: '#b8860b',
              fontWeight: 500,
              mb: { xs: 4, md: 5 },
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            <ArrowBack sx={{ fontSize: 18 }} />
            Back to news
          </Box>

          {/* Centered article content */}
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Headline — centered */}
            <Typography
              component="h1"
              sx={{
                fontFamily: '"EB Garamond", serif',
                fontSize: { xs: '1.7rem', md: '2.4rem' },
                fontWeight: 700,
                color: '#2c1a0e',
                lineHeight: 1.3,
                direction: 'rtl',
                textAlign: 'center',
                mb: 2.5,
              }}
            >
              <InlineVocabText text={article.title} vocabMap={article.vocabMap || {}} textScale={1} propagateClick />
            </Typography>

            {/* Meta row — centered */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              {!article.isExternal && article.cefr && (
                <Chip
                  label={article.cefr}
                  size="small"
                  sx={{
                    background: LEVEL_COLORS[article.cefr] ?? '#2c1a0e',
                    color: '#fff',
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    letterSpacing: '0.06em',
                  }}
                />
              )}
              {article.isExternal && (
                <Chip
                  label="External"
                  size="small"
                  sx={{
                    background: '#b8860b',
                    color: '#fff',
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    letterSpacing: '0.06em',
                  }}
                />
              )}
              <Box
                sx={{
                  background: 'rgba(44,26,14,0.06)',
                  color: '#7a6e65',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  px: 1.2,
                  py: 0.4,
                  borderRadius: '4px',
                }}
              >
                {article.sourceLabel}
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: '#9e8a7a',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.78rem',
                }}
              >
                <CalendarToday sx={{ fontSize: 14 }} />
                {formattedDate}
              </Box>
            </Box>

            {/* Topics — centered */}
            {article.topics.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
                {article.topics.map((topic) => (
                  <Box
                    key={topic}
                    sx={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: '0.75rem',
                      color: '#9e8a7a',
                      background: 'rgba(158,138,122,0.08)',
                      border: '1px solid rgba(158,138,122,0.15)',
                      px: 1.2,
                      py: 0.4,
                      borderRadius: '4px',
                    }}
                  >
                    {topic}
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ borderColor: 'rgba(44,26,14,0.08)', mb: { xs: 3, md: 4 } }} />

            {/* Article image — centered, reasonable size */}
            {article.image && (
              <Box sx={{ mb: { xs: 3, md: 4 }, borderRadius: '12px', overflow: 'hidden', maxWidth: 700, mx: 'auto' }}>
                <Box
                  component="img"
                  src={article.image}
                  alt={article.title}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </Box>
            )}

            {/* RSS external notice */}
            {article.isExternal && (
              <Box
                sx={{
                  background: 'rgba(184,134,11,0.06)',
                  border: '1px solid rgba(184,134,11,0.15)',
                  borderRadius: '10px',
                  p: { xs: 1.5, md: 2 },
                  mb: 3,
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.85rem',
                    color: '#7a6e65',
                  }}
                >
                  This article is sourced from {article.sourceLabel}. Read the full story on their website.
                </Typography>
              </Box>
            )}

            {/* Paragraphs */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {paragraphs.map((para, i) => (
                <Typography
                  key={i}
                  component="p"
                  sx={{
                    fontFamily: '"EB Garamond", Georgia, serif',
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                    lineHeight: 1.85,
                    color: '#2c1a0e',
                    direction: 'rtl',
                    textAlign: 'right',
                    fontWeight: 400,
                  }}
                >
                  <InlineVocabText text={para} vocabMap={article.vocabMap || {}} textScale={1} />
                </Typography>
              ))}
            </Box>

            {/* External link button */}
            {article.isExternal && article.url && (
              <Box sx={{ mt: 5, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  endIcon={<OpenInNew />}
                  onClick={() => window.open(article.url, '_blank')}
                  sx={{
                    background: '#2c1a0e',
                    color: '#f5ede0',
                    fontFamily: 'Jost, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    borderRadius: '10px',
                    px: 3,
                    py: 1.2,
                    '&:hover': { background: '#1a0f08' },
                  }}
                >
                  Read full article on {article.sourceLabel}
                </Button>
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </>
  )
}
