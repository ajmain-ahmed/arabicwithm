'use client'

import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Container,
  Grid,
  Pagination,
} from '@mui/material'
import { UnifiedArticle } from '@/app/lib/news'
import FeaturedCard from './components/FeaturedCard'
import SmallCard from './components/SmallCard'
import NewsBiteCard from './components/NewsBiteCard'

interface NewsPageProps {
  articles: UnifiedArticle[]
  topics: string[]
  sources: string[]
  regions: string[]
}

const ARTICLES_PER_PAGE = 12
const FULL_SOURCES = ['cnn-arabic', 'france24-arabic', 'al-sharq']
const BITE_SOURCES = ['bbc-arabic', 'skynews-arabia']

export default function NewsPage({ articles, topics }: NewsPageProps) {
  const [activeTopic, setActiveTopic] = useState<string>('All')
  const [page, setPage] = useState(1)

  const filteredArticles = useMemo(() => {
    return activeTopic === 'All'
      ? articles
      : articles.filter((a) => a.topics.some((t) => t.toLowerCase() === activeTopic.toLowerCase()))
  }, [articles, activeTopic])

  const fullArticles = useMemo(
    () => filteredArticles.filter((a) => FULL_SOURCES.includes(a.source)),
    [filteredArticles]
  )
  const biteArticles = useMemo(
    () => filteredArticles.filter((a) => BITE_SOURCES.includes(a.source)),
    [filteredArticles]
  )

  const totalPages = Math.max(1, Math.ceil(fullArticles.length / ARTICLES_PER_PAGE))

  const pageArticles = useMemo(() => {
    const start = (page - 1) * ARTICLES_PER_PAGE
    return fullArticles.slice(start, start + ARTICLES_PER_PAGE)
  }, [fullArticles, page])

  const featured = pageArticles[0]
  const gridArticles = pageArticles.slice(1)

  const allTopics = ['All', ...topics.filter(Boolean).slice(0, 12)]

  const FilterChip = ({
    label,
    active,
    onClick,
  }: {
    label: string
    active: boolean
    onClick: () => void
  }) => (
    <Box
      onClick={onClick}
      sx={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '0.82rem',
        fontWeight: active ? 600 : 400,
        color: active ? '#2c1a0e' : '#7a6e65',
        px: 1.5,
        py: 0.6,
        borderRadius: '6px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
        background: active ? 'rgba(184,134,11,0.1)' : 'transparent',
        borderBottom: active ? '2px solid #b8860b' : '2px solid transparent',
        '&:hover': {
          color: '#2c1a0e',
          background: 'rgba(184,134,11,0.06)',
        },
      }}
    >
      {label}
    </Box>
  )

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
          pt: { xs: '58px', md: '72px' },
          pb: { xs: 6, md: 10 },
        }}
      >
        {/* Topic Navigation Bar */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            background: '#fff',
            borderBottom: '1px solid rgba(44,26,14,0.08)',
            py: 1.5,
            px: { xs: 2, md: 3 },
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Container maxWidth="xl" sx={{ display: 'flex', gap: 0.5 }}>
            {allTopics.map((topic) => (
              <FilterChip
                key={topic}
                label={topic}
                active={activeTopic === topic}
                onClick={() => { setActiveTopic(topic); setPage(1) }}
              />
            ))}
          </Container>
        </Box>

        {/* Mobile Topic Bar */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            background: '#fff',
            borderBottom: '1px solid rgba(44,26,14,0.08)',
            py: 1.5,
            px: 2,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {allTopics.map((topic) => (
              <FilterChip
                key={topic}
                label={topic}
                active={activeTopic === topic}
                onClick={() => { setActiveTopic(topic); setPage(1) }}
              />
            ))}
          </Box>
        </Box>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          {/* Featured */}
          {featured && (
            <Box sx={{ mb: { xs: 4, md: 5 } }}>
              <FeaturedCard article={featured} />
            </Box>
          )}

          {/* Full Articles Grid */}
          {gridArticles.length > 0 && (
            <Box sx={{ mb: { xs: 4, md: 5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2.5,
                  pb: 1.5,
                  borderBottom: '1px solid rgba(44,26,14,0.08)',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"EB Garamond", serif',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#2c1a0e',
                  }}
                >
                  {page === 1 ? 'Latest Updates' : `Page ${page}`}
                </Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#9e8a7a' }}>
                  {fullArticles.length} articles
                </Typography>
              </Box>

              <Grid container spacing={{ xs: 2, md: 2.5 }}>
                {gridArticles.map((article) => (
                  <Grid key={article.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                    <SmallCard article={article} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* MUI Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 4, md: 5 } }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => setPage(val)}
                color="primary"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontFamily: 'Jost, sans-serif',
                    color: '#7a6e65',
                  },
                  '& .Mui-selected': {
                    background: '#b8860b !important',
                    color: '#fff',
                  },
                }}
              />
            </Box>
          )}

          {/* News Bites */}
          {biteArticles.length > 0 && (
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2.5,
                  pb: 1.5,
                  borderBottom: '1px solid rgba(44,26,14,0.08)',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"EB Garamond", serif',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#2c1a0e',
                  }}
                >
                  News Bites
                </Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: '#9e8a7a' }}>
                  {biteArticles.length} quick reads
                </Typography>
              </Box>

              <Grid container spacing={{ xs: 2, md: 2.5 }}>
                {biteArticles.map((article) => (
                  <Grid key={article.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                    <NewsBiteCard article={article} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {filteredArticles.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: '1.3rem', fontWeight: 700, color: '#2c1a0e' }}>
                No articles found
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </>
  )
}
