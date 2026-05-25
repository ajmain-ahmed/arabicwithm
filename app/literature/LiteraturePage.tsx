'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Container,
  Grid,
  Tabs,
  Tab,
  Button,
} from '@mui/material'
import { AutoStories, Public, Refresh } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import type { Poem, WikiArticle } from '@/app/actions/literature'

interface LiteraturePageProps {
  poems: Poem[]
  articles: WikiArticle[]
}

export default function LiteraturePage({ poems, articles }: LiteraturePageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)

  const TabButton = ({
    label,
    icon,
    active,
    onClick,
  }: {
    label: string
    icon: React.ReactNode
    active: boolean
    onClick: () => void
  }) => (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2.5,
        py: 1.2,
        borderRadius: '9999px',
        cursor: 'pointer',
        fontFamily: 'Jost, sans-serif',
        fontSize: '0.9rem',
        fontWeight: active ? 600 : 500,
        color: active ? '#b8860b' : '#7a6e65',
        background: active ? 'rgba(184,134,11,0.12)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'rgba(184,134,11,0.35)' : 'rgba(122,110,101,0.15)',
        transition: 'all 0.2s',
        '&:hover': {
          background: active ? 'rgba(184,134,11,0.12)' : 'rgba(184,134,11,0.06)',
        },
      }}
    >
      {icon}
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
          minHeight: '100dvh',
          pt: { xs: '72px', md: '80px' },
          pb: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
            <Typography
              sx={{
                fontFamily: '"EB Garamond", serif',
                fontSize: { xs: '2rem', md: '2.8rem' },
                fontWeight: 700,
                color: '#2c1a0e',
                mb: 1.5,
              }}
            >
              Arabic Literature
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                color: '#7a6e65',
                maxWidth: 560,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              Classical poetry from the Qafiyah corpus and curated Wikipedia articles.
              Hover over Arabic words for definitions.
            </Typography>
          </Box>

          {/* Tabs */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              mb: { xs: 4, md: 5 },
              flexWrap: 'wrap',
            }}
          >
            <TabButton
              label="Poetry"
              icon={<AutoStories sx={{ fontSize: 20 }} />}
              active={activeTab === 0}
              onClick={() => setActiveTab(0)}
            />
            <TabButton
              label="Articles"
              icon={<Public sx={{ fontSize: 20 }} />}
              active={activeTab === 1}
              onClick={() => setActiveTab(1)}
            />
          </Box>

          {/* Poetry grid */}
          {activeTab === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Button
                  onClick={() => router.refresh()}
                  startIcon={<Refresh sx={{ fontSize: 18 }} />}
                  sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: '#b8860b',
                    textTransform: 'none',
                    '&:hover': { background: 'rgba(184,134,11,0.08)' },
                  }}
                >
                  Refresh poems
                </Button>
              </Box>

              <Grid container spacing={3}>
                {poems.map((poem) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={poem.id}>
                    <PoemCard poem={poem} onClick={() => router.push(`/literature/${poem.id}`)} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {/* Articles grid */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              {articles.map((article) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={article.id}>
                  <ArticleCard article={article} onClick={() => router.push(`/literature/${article.id}`)} />
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>
    </>
  )
}

/* ── Poem Card ── */
function PoemCard({ poem, onClick }: { poem: Poem; onClick: () => void }) {
  const preview = poem.content.split('\n').slice(0, 3).join('\n')

  return (
    <Box
      onClick={onClick}
      sx={{
        background: '#fff',
        border: '1px solid rgba(184,134,11,0.12)',
        borderRadius: '12px',
        p: { xs: 2.5, md: 3 },
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(44,26,14,0.1)',
          borderColor: 'rgba(184,134,11,0.25)',
          transform: 'translateY(-3px)',
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: '"EB Garamond", serif',
          fontSize: '1.15rem',
          fontWeight: 700,
          color: '#2c1a0e',
          direction: 'rtl',
          textAlign: 'right',
          lineHeight: 1.7,
          mb: 2,
          whiteSpace: 'pre-line',
          flex: 1,
        }}
      >
        {preview}
        {poem.content.split('\n').length > 3 && ' …'}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#b8860b',
          }}
        >
          {poem.author}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.75rem',
            color: '#9e8a7a',
            background: 'rgba(184,134,11,0.08)',
            px: 1,
            py: 0.4,
            borderRadius: '4px',
          }}
        >
          {poem.source}
        </Typography>
      </Box>
    </Box>
  )
}

/* ── Article Card ── */
function ArticleCard({ article, onClick }: { article: WikiArticle; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        background: '#fff',
        border: '1px solid rgba(184,134,11,0.12)',
        borderRadius: '12px',
        p: { xs: 2.5, md: 3 },
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(44,26,14,0.1)',
          borderColor: 'rgba(184,134,11,0.25)',
          transform: 'translateY(-3px)',
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: '"EB Garamond", serif',
          fontSize: { xs: '1.15rem', md: '1.25rem' },
          fontWeight: 700,
          color: '#2c1a0e',
          direction: 'rtl',
          textAlign: 'right',
          lineHeight: 1.4,
          mb: 1.5,
        }}
      >
        {article.title}
      </Typography>

      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.85rem',
          color: '#7a6e65',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flex: 1,
          direction: 'rtl',
          textAlign: 'right',
        }}
      >
        {article.content}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.75rem',
            color: '#9e8a7a',
            background: 'rgba(184,134,11,0.08)',
            px: 1,
            py: 0.4,
            borderRadius: '4px',
          }}
        >
          {article.source}
        </Typography>
      </Box>
    </Box>
  )
}
