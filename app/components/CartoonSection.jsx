'use client'

import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { PlayCircleOutlineSharp } from '@mui/icons-material'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import { motion } from 'framer-motion'

const FEATURES = [
  {
    icon: <PlayCircleOutlineSharp sx={{ fontSize: 22, color: 'var(--gold)' }} />,
    title: 'Arabic Audio & Subtitles',
    body: 'Follow every word with Arabic audio with English & Arabic subtitles.',
  },
  {
    icon: <ArticleOutlinedIcon sx={{ fontSize: 22, color: 'var(--gold)' }} />,
    title: 'Challenging worksheets',
    body: 'Transcripts and comprehension exercises matched to each video.',
  },
  {
    icon: <QuizOutlinedIcon sx={{ fontSize: 22, color: 'var(--gold)' }} />,
    title: 'Interactive quizzes',
    body: 'Instant-feedback quizzes graded to your CEFR level.',
  },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, delay },
})

const WORKSHEET_SHEETS = [
  { src: '/worksheets/transcript-1.avif', alt: 'Transcript worksheet', left: '2%', rotate: '-10deg', zIndex: 1 },
  { src: '/worksheets/worksheet-2.avif', alt: 'Comprehension worksheet', left: '12%', rotate: '0deg', zIndex: 2 },
  { src: '/worksheets/worksheet.avif', alt: 'Quiz worksheet', left: '22%', rotate: '10deg', zIndex: 3 },
]

function WorksheetFan() {
  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: 320, sm: 380, md: 440, lg: 500 },
        height: { xs: 320, sm: 380, md: 440, lg: 500 },
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

function VideoEmbed() {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: 280, sm: 320, md: 300, lg: 340 },
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(44,26,14,0.2)',
        background: '#000',
        aspectRatio: '9/16',
        position: 'relative',
      }}
    >
      <Box
        component="iframe"
        src="https://www.youtube.com/embed/4ty6uk3w6po?rel=0&modestbranding=1"
        title="Arabic cartoon with subtitles"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
      />
    </Box>
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

function SheetsWithCard({ cardSx }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
      <motion.div {...fadeUp(0.1)} style={{ position: 'relative', zIndex: 1 }}>
        <WorksheetFan />
      </motion.div>
      <motion.div {...fadeUp(0.25)} style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Box sx={cardSx}>
          <FeatureCard />
        </Box>
      </motion.div>
    </Box>
  )
}

export default function CartoonSection() {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12, lg: 14 },
        px: { xs: 3, sm: 5, md: 8, lg: 12, xl: 16 },
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <motion.div {...fadeUp()}>
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
          Arabic you actually find interesting
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-sans)',
            fontSize: { xs: '0.93rem', md: '1.05rem' },
            color: 'var(--muted)',
            lineHeight: 1.7,
            textAlign: 'center',
            maxWidth: 500,
            mx: 'auto',
            mb: { xs: 6, md: 8 },
          }}
        >
          Watch subtitled animations, then test yourself with printable worksheets
          and interactive quizzes, graded to your CEFR level.
        </Typography>
      </motion.div>

      {/* Mobile layout */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <SheetsWithCard cardSx={{ mt: { xs: '-180px', sm: '-200px' }, width: '100%', maxWidth: 400, px: 2 }} />
        <motion.div {...fadeUp(0.3)} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ mt: 5, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <VideoEmbed />
          </Box>
        </motion.div>
      </Box>

      {/* Desktop layout */}
      <Box
        sx={{
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: '1fr 1fr',
          gap: '0 40px',
          alignItems: 'start',
          justifyItems: 'center',
          width: '100%',
          maxWidth: 1100,
          mx: 'auto',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
        >
          <VideoEmbed />
        </motion.div>
        <SheetsWithCard cardSx={{ mt: { md: '-260px', lg: '-280px' }, width: '100%', maxWidth: { md: 420, lg: 460 } }} />
      </Box>
    </Box>
  )
}