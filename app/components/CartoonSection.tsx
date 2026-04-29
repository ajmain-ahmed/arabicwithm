'use client'

import React from 'react'
import { Box, Typography, Paper, Button } from '@mui/material'
import { PlayCircleOutlineSharp, ArrowForwardSharp } from '@mui/icons-material'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import { useRouter } from 'next/navigation'

const FEATURES = [
  {
    icon: <PlayCircleOutlineSharp sx={{ fontSize: 22, color: 'var(--gold)' }} />,
    title: 'Arabic Audio & Subtitles',
    body: 'Learn new vocabulary through immersion.',
  },
  {
    icon: <ArticleOutlinedIcon sx={{ fontSize: 22, color: 'var(--gold)' }} />,
    title: 'Challenging worksheets',
    body: 'Transcripts and exercises matched to each video.',
  },
  {
    icon: <QuizOutlinedIcon sx={{ fontSize: 22, color: 'var(--gold)' }} />,
    title: 'Interactive Learning',
    body: 'Engaging tests graded to your CEFR level.',
  },
]

const WORKSHEET_SHEETS = [
  { src: '/homepage/transcript-1.avif', alt: 'Transcript worksheet', left: '2%', rotate: '-10deg', zIndex: 1 },
  { src: '/homepage/worksheet-2.avif', alt: 'Comprehension worksheet', left: '12%', rotate: '0deg', zIndex: 2 },
  { src: '/homepage/worksheet.avif', alt: 'Quiz worksheet', left: '22%', rotate: '10deg', zIndex: 3 },
]

function WorksheetFan() {
  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: 360, sm: 400, md: 440, lg: 500 },
        height: { xs: 360, sm: 400, md: 440, lg: 500 },
        flexShrink: 0,
      }}
    >
      {WORKSHEET_SHEETS.map(({ src, alt, left, rotate, zIndex }) => (
        <Box
          key={src}
          component="img"
          src={src}
          alt={alt}
          sx={{
            position: 'absolute',
            left,
            top: rotate === '0deg' ? '0%' : '4%',
            width: '76%',
            aspectRatio: '3/4',
            objectFit: 'cover',
            borderRadius: '10px',
            border: '3px solid #fff',
            boxShadow: zIndex === 3
              ? '0 18px 48px rgba(44,26,14,0.26)'
              : '0 10px 32px rgba(44,26,14,0.18)',
            transform: `rotate(${rotate})`,
            transformOrigin: 'bottom center',
            zIndex,
          }}
        />
      ))}
    </Box>
  )
}

function ShowImage() {
  return (
    <>
      <Box
        component="img"
        src="/homepage/homepage-desktop-tmnt.avif"
        alt="TMNT Arabic cartoon scene"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: '100%',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(44,26,14,0.2)',
        }}
      />
      <Box
        component="img"
        src="/homepage/homepage-mobile-tmnt.avif"
        alt="TMNT Arabic cartoon scene"
        sx={{
          display: { xs: 'block', md: 'none' },
          width: '100%',
          maxWidth: 460,
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(44,26,14,0.2)',
        }}
      />
    </>
  )
}

function FeatureCard() {
  return (
    <Paper
      elevation={0}
      sx={{
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        p: { xs: 2.5, md: 3.5 },
        border: '1px solid rgba(44,26,14,0.08)',
        boxShadow: '0 8px 32px rgba(44,26,14,0.12)',
        width: '100%',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, md: 3 } }}>
        {FEATURES.map(({ icon, title, body }) => (
          <Box key={title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box
              sx={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f5ede0 0%, #e8d8bf 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mt: '2px',
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography
                sx={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--bark)', mb: 0.3 }}
              >
                {title}
              </Typography>
              <Typography
                sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}
              >
                {body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

function SheetsWithCard({ cardSx }: { cardSx: object }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <WorksheetFan />
      </Box>
      <Box sx={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Box sx={cardSx}>
          <FeatureCard />
        </Box>
      </Box>
    </Box>
  )
}

export default function CartoonSection() {
  const router = useRouter()
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12, lg: 10 },
        px: { xs: 3, sm: 5, md: 8, lg: 12, xl: 16 },
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box>
        <Typography
          component="h2"
          sx={{
            fontFamily: 'var(--font-serif)',
            fontSize: { xs: '1.9rem', sm: '2.5rem', md: '3.2rem' },
            fontWeight: 700,
            lineHeight: 1.12,
            color: 'var(--bark)',
            textAlign: 'center',
            maxWidth: 600,
            mx: 'auto',
            mb: 1.5,
          }}
        >
          Watch and Learn!
        </Typography>

        {/* Mobile: single combined Typography */}
        <Typography
          sx={{
            display: { xs: 'block', md: 'none' },
            fontFamily: 'var(--font-sans)',
            fontSize: '0.93rem',
            color: 'var(--muted)',
            lineHeight: 1.7,
            textAlign: 'center',
            maxWidth: 500,
            mx: 'auto',
            mb: { xs: 4, md: 3 },
          }}
        >
          Watch cartoons in Arabic with English subs and a time-synced transcript. Printable worksheets, interactive quizzes by CEFR level available.
        </Typography>

        {/* Desktop: two separate Typographys */}
        <Typography
          sx={{
            display: { xs: 'none', md: 'block' },
            fontFamily: 'var(--font-sans)',
            fontSize: '1.05rem',
            color: 'var(--muted)',
            lineHeight: 1.7,
            textAlign: 'center',
            mx: 'auto',
          }}
        >
          Watch cartoons in Arabic with English subs and a time-synced transcript.
        </Typography>
        <Typography
          sx={{
            display: { xs: 'none', md: 'block' },
            fontFamily: 'var(--font-sans)',
            fontSize: '1.05rem',
            color: 'var(--muted)',
            lineHeight: 1.7,
            textAlign: 'center',
            maxWidth: 500,
            mx: 'auto',
            mb: { xs: 4, md: 3 },
          }}
        >
          Printable worksheets, interactive quizzes by CEFR level available.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 6, md: 6 } }}>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardSharp />}
            onClick={() => router.push('/cartoons')}
            sx={{
              background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-lt) 100%)',
              color: '#1a0e00',
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontSize: { xs: '0.95rem', md: '1rem' },
              textTransform: 'none',
              borderRadius: '4px',
              px: { xs: 4, md: 5 },
              py: { xs: 1.5, md: 1.7 },
              boxShadow: '0 6px 28px rgba(184,134,11,0.35)',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, var(--gold-lt) 0%, #e6c060 100%)',
                boxShadow: '0 10px 36px rgba(184,134,11,0.5)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Watch and Learn
          </Button>
        </Box>
      </Box>

      {/* ── Mobile layout ── */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          flexDirection: 'column',
          alignItems: 'center',
          gap: 5,
          width: '100%',
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', px: 2 }}>
          <ShowImage />
        </Box>
        <SheetsWithCard
          cardSx={{ mt: { xs: '-180px', sm: '-200px' }, width: '100%', maxWidth: 460, px: 2 }}
        />
      </Box>

      {/* ── Desktop layout ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: { md: '1.4fr 1fr', lg: '1.8fr 1fr' },
          gap: { md: '0 100px', lg: '0 130px' },
          alignItems: 'start',
          justifyItems: 'center',
          width: '100%',
          maxWidth: 1500,
          mx: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: { md: 4, lg: 6 } }}>
          <ShowImage />
        </Box>
        <SheetsWithCard
          cardSx={{ mt: { md: '-260px', lg: '-280px' }, width: '100%', maxWidth: { md: 420, lg: 460 }, mb:15 }}
        />
      </Box>
    </Box>
  )
}