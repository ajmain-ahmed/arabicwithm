'use client'

import React, { useState, useMemo } from 'react'
import { Container, Box, Typography, Grid } from '@mui/material'
import { RssArticle } from '@/app/lib/rss'
import { ParsedArticle } from '@/app/lib/news'
import ArticleCard from './components/ArticleCard'
import EmptyState from './components/EmptyState'

const LEVEL_CODES = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LEVEL_LABELS: Record<string, string> = {
  A0: 'Absolute Beginner',
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Lower Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
  C2: 'Proficiency',
}

interface NewsPageProps {
  articlesByLevel: Record<string, ParsedArticle[]>
  rssArticles: RssArticle[]
}

export default function NewsPage({ articlesByLevel, rssArticles }: NewsPageProps) {
  const [activeTab, setActiveTab] = useState<string>('live')

  const tabs = useMemo(
    () => [
      { key: 'live', label: 'Live News' },
      ...LEVEL_CODES.map((code) => ({
        key: code,
        label: code,
      })),
    ],
    []
  )

  const currentArticles = activeTab === 'live' ? [] : articlesByLevel[activeTab] ?? []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap');
      `}</style>

      <Box component="main" sx={{ minHeight: '100vh', background: '#f5ede0' }}>
        {/* ── Banner ── */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(212,168,67,0.2)',
            px: { xs: 3, md: 8 },
            py: { xs: 6, md: 7 },
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src="/cards/awm13_converted.avif"
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
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, rgba(44,26,14,0.45) 0%, rgba(44,26,14,0.65) 55%, rgba(44,26,14,0.90) 100%)',
            }}
          />
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              component="h1"
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: { xs: '2.8rem', md: '3.4rem' },
                fontWeight: 700,
                color: '#f5ede0',
                lineHeight: 1.1,
                mb: 0.5,
                direction: 'rtl',
              }}
            >
              بَيْتُ الْأَخْبَارِ
            </Typography>
            <Typography
              sx={{
                fontFamily: "'EB Garamond', serif",
                fontSize: { xs: '1.35rem', md: '1.6rem' },
                color: '#d4a843',
                mb: 1,
              }}
            >
              Bayt al-Akhbār, House of News
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '0.9rem', md: '1rem' },
                color: 'rgba(245,237,224,0.85)',
                lineHeight: 1.5,
                maxWidth: 480,
                mx: 'auto',
                fontWeight: 400,
              }}
            >
              Read the news in Arabic, graded from absolute beginner to advanced.
            </Typography>
          </Box>
        </Box>

        {/* ── Content ── */}
        <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 5 }, pb: { xs: 6, md: 8 } }}>
          {/* Tab Bar */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mb: 4,
              overflowX: 'auto',
              pb: 1,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              px: { xs: 0.5, md: 0 },
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <Box
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  sx={{
                    flexShrink: 0,
                    px: { xs: 2, md: 2.5 },
                    py: { xs: 0.8, md: 1 },
                    borderRadius: '999px',
                    border: '1.5px solid',
                    borderColor: isActive ? '#b8860b' : 'rgba(44,26,14,0.15)',
                    background: isActive ? '#b8860b' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#b8860b',
                      background: isActive ? '#b8860b' : 'rgba(184,134,11,0.08)',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'Jost, sans-serif',
                      fontSize: { xs: '0.82rem', md: '0.9rem' },
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? '#fff' : '#2c1a0e',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}
                  >
                    {tab.label}
                  </Typography>
                </Box>
              )
            })}
          </Box>

          {/* Level subtitle */}
          {activeTab !== 'live' && (
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.85rem',
                  color: '#7a6e65',
                  fontWeight: 500,
                }}
              >
                {LEVEL_LABELS[activeTab]} — {currentArticles.length} article{currentArticles.length === 1 ? '' : 's'}
              </Typography>
            </Box>
          )}

          {/* Article Grid */}
          {activeTab === 'live' ? (
            rssArticles.length > 0 ? (
              <Grid container spacing={{ xs: 2, md: 3 }}>
                {rssArticles.map((article) => (
                  <Grid key={article.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <ArticleCard
                      title={article.title}
                      titleEnglish={article.summary}
                      image={article.image}
                      date={article.date}
                      source={article.sourceLabel}
                      href={article.url}
                      isExternal
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <EmptyState />
            )
          ) : currentArticles.length > 0 ? (
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {currentArticles.map((article) => (
                <Grid key={article.slug} size={{ xs: 12, sm: 6, md: 4 }}>
                  <ArticleCard
                    title={article.title}
                    titleEnglish={article.titleEnglish}
                    titlePlain={article.titlePlain}
                    image={article.image}
                    date={article.date}
                    level={article.level}
                    source={article.source}
                    author={article.author}
                    topic={article.topic}
                    href={`/news/${article.slug}`}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <EmptyState level={activeTab} />
          )}
        </Container>
      </Box>
    </>
  )
}
