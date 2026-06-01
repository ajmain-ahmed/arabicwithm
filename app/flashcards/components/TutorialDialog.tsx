'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  Button,
  MobileStepper,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material'

const TUTORIAL_KEY = 'arabicwithm-flashcard-tutorial-seen'

const DESKTOP_PAGES = [
  {
    title: 'Welcome to Flashcards',
    body: 'Master Arabic vocabulary one card at a time. Each card shows an Arabic word — press Show answer to reveal its meaning, transliteration, and example sentences.',
    image: '/homepage/homepage-desktop-flashcards.avif',
  },
  {
    title: 'Reveal & Customise',
    body: 'Press Show answer to see the full card. Use the toolbar switches to show or hide diacritics, keep answers permanently visible, or adjust text size.',
    image: '/themes/study.avif',
  },
  {
    title: 'Take Action',
    body: 'Mark a word as Complete when you know it, or save it to Revision for later review. Use Back and Next to move between cards, or jump to any theme from the sidebar.',
    image: '/themes/weather.avif',
  },
  {
    title: 'Ready?',
    body: 'Words are organised by theme and CEFR level. Finish a theme to unlock the next one. Your progress is saved automatically.',
    image: '/homepage/hero.avif',
  },
]

const MOBILE_PAGES = [
  {
    title: 'Welcome to Flashcards',
    body: 'Master Arabic vocabulary one card at a time. Each card shows an Arabic word — press Show answer to reveal its meaning, transliteration, and example sentences.',
    image: '/homepage/homepage-desktop-flashcards.avif',
  },
  {
    title: 'Reveal & Customise',
    body: 'Press Show answer to see the full card. Tap the settings icon to adjust diacritics, text size, and more.',
    image: '/themes/study.avif',
  },
  {
    title: 'Swipe to Navigate',
    body: 'Swipe left to mark a word for revision, swipe right to mark it as complete. Pull far enough and the card slides away; release early and it smoothly bounces back to centre.',
    image: '/themes/weather.avif',
  },
  {
    title: 'Themes & Actions',
    body: 'Tap the Themes button to switch between topics. Use the action buttons at the bottom to mark words for revision or complete them.',
    image: '/cartoons/al-sha3b-yurid/al-sha3b-yurid-hero.avif',
  },
  {
    title: 'Ready?',
    body: 'Words are organised by theme and CEFR level. Finish a theme to unlock the next one. Your progress is saved automatically.',
    image: '/homepage/hero.avif',
  },
]

export function useTutorialSeen() {
  const [seen, setSeen] = useState(true)
  useEffect(() => {
    try {
      setSeen(localStorage.getItem(TUTORIAL_KEY) === 'true')
    } catch {
      setSeen(false)
    }
  }, [])

  const markSeen = () => {
    try {
      localStorage.setItem(TUTORIAL_KEY, 'true')
      setSeen(true)
    } catch {
      /* ignore */
    }
  }

  return { seen, markSeen }
}

export default function TutorialDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const PAGES = isMobile ? MOBILE_PAGES : DESKTOP_PAGES

  const [activeStep, setActiveStep] = useState(0)
  const maxSteps = PAGES.length

  const handleNext = () => setActiveStep((prev) => prev + 1)
  const handleBack = () => setActiveStep((prev) => prev - 1)

  const page = PAGES[activeStep]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            m: 2,
            background: '#faf7f2',
          },
        },
      }}
    >
      <Box
        component="img"
        src={page.image}
        alt={page.title}
        sx={{
          width: '100%',
          height: 220,
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
        }}
      />

      <DialogContent sx={{ pt: 3, pb: 2, px: 3 }}>
        <Typography
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--bark)',
            mb: 1,
            textAlign: 'center',
          }}
        >
          {page.title}
        </Typography>

        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.95rem',
            color: 'var(--muted)',
            lineHeight: 1.6,
            textAlign: 'center',
            mb: 2,
          }}
        >
          {page.body}
        </Typography>
      </DialogContent>

      <Box sx={{ px: 3, pb: 3 }}>
        <MobileStepper
          variant="dots"
          steps={maxSteps}
          position="static"
          activeStep={activeStep}
          sx={{
            background: 'transparent',
            justifyContent: 'center',
            '& .MuiMobileStepper-dot': { width: 8, height: 8, mx: 0.5 },
            '& .MuiMobileStepper-dotActive': { background: 'var(--gold)' },
            mb: 2,
          }}
          nextButton={
            <Button
              size="small"
              onClick={handleNext}
              disabled={activeStep === maxSteps - 1}
              sx={{ fontFamily: 'Jost, sans-serif', textTransform: 'none', color: 'var(--bark)' }}
            >
              Next
              <KeyboardArrowRight />
            </Button>
          }
          backButton={
            <Button
              size="small"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ fontFamily: 'Jost, sans-serif', textTransform: 'none', color: 'var(--bark)' }}
            >
              <KeyboardArrowLeft />
              Back
            </Button>
          }
        />

        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{
            background: 'var(--forest)',
            color: '#fff',
            fontFamily: 'Jost, sans-serif',
            fontWeight: 600,
            fontSize: '0.95rem',
            textTransform: 'none',
            borderRadius: '10px',
            py: 1.1,
            '&:hover': { background: '#0a1f15' },
          }}
        >
          {activeStep === maxSteps - 1 ? 'Start Studying' : 'Skip Tutorial'}
        </Button>
      </Box>
    </Dialog>
  )
}
