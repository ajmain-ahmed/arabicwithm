'use client'

import { ArrowForwardSharp, ArticleOutlined, PlayCircleFilledSharp, QuizOutlined } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from "react";
import Navbar from "./components/navbar";
import CartoonSection from "./components/CartoonSection";

/* ─────────────────────────────────────────────
   Global CSS — system fonts only
───────────────────────────────────────────── */
const PAGE_CSS = `
  :root {
    --bark:   #2c1a0e;
    --forest: #0e2e1f;
    --gold:   #b8860b;
    --gold-lt:#d4a843;
    --muted:  #7a6e65;
    --font-serif: Georgia, "Times New Roman", serif;
    --font-sans:  system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  html, body { background: #fff; margin: 0; }

  @keyframes heroZoom {
    from { transform: scale(1.04); }
    to   { transform: scale(1); }
  }
`;

/* ─────────────────────────────────────────────
   Rotating sub-headlines
───────────────────────────────────────────── */
const SUBHEADLINES = [
  "with movies",
  "with cartoons",
  "with poetry",
  "with quotes",
  "with stories",
];

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const [subIndex, setSubIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSubIndex((p) => (p + 1) % SUBHEADLINES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const textVariants = {
    initial: { opacity: 0, y: 16, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -16, filter: 'blur(8px)' },
  };

  return (
    <>
      <style>{PAGE_CSS}</style>
      <Navbar />

      <Box component="main" sx={{ background: '#fff', minHeight: '100vh' }}>

        {/* ══════════════════════════════════════════════
            HERO BANNER
            - Clears fixed navbar with margin-top
            - Text centred with flexbox (no padding hacks)
            - Larger mobile type scale
            - Single concave curve at bottom only
        ══════════════════════════════════════════════ */}
        <Box
          sx={{
            position: 'relative',
            // Clear the fixed navbar (56px mobile / 64px desktop)
            mt: { xs: '56px', md: '64px' },
            // Full viewport minus navbar, with sensible min/max bounds
            height: { xs: 'calc(70vh - 56px)', md: 'calc(100vh - 64px)' },
            minHeight: { xs: 520, sm: 580, md: 640 },
            maxHeight: { xs: 800, md: 950 },
            overflow: 'hidden',
          }}
        >
          {/* ── Background image ── */}
          <Box
            component="img"
            src="/hero/hero.avif"
            alt=""
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              animation: 'heroZoom 14s ease-out forwards',
            }}
          />

          {/* ── Gradient overlay ── */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(
                to bottom,
                rgba(0,0,0,0.52) 0%,
                rgba(0,0,0,0.28) 30%,
                rgba(0,0,0,0.35) 60%,
                rgba(0,0,0,0.65) 85%,
                rgba(0,0,0,0.85) 100%
              )`,
            }}
          />

          {/* ── Content: dead-centre in the visible frame ── */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',      // true vertical centre
              px: { xs: 3, sm: 4, md: 6 },
              textAlign: 'center',
              // Keep text clear of the curve at the bottom
              pb: { xs: 10, sm: 12, md: 14 },
            }}
          >
            {/* Static first line */}
            <Typography
              component="h1"
              sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.6rem', lg: '5.6rem' },
                fontWeight: 700,
                lineHeight: 1.08,
                color: '#fff',
                textShadow: '0 2px 18px rgba(0,0,0,0.55)',
                mb: { xs: 0.75, md: 1 },
              }}
            >
              Learn Arabic
            </Typography>

            {/* Animated rotating second line */}
            <Box
              sx={{
                height: { xs: '3rem', sm: '3.8rem', md: '5.2rem', lg: '6.2rem' },
                position: 'relative',
                width: '100%',
                mb: { xs: 2.5, md: 3.5 },
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={subIndex}
                  variants={textVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.6rem', lg: '5.6rem' },
                      fontWeight: 700,
                      fontStyle: 'italic',
                      lineHeight: 1.08,
                      color: 'var(--gold-lt)',
                      textShadow: '0 2px 18px rgba(0,0,0,0.55)',
                    }}
                  >
                    {SUBHEADLINES[subIndex]}
                  </Typography>
                </motion.div>
              </AnimatePresence>
            </Box>

            {/* Sub-copy — bolder, more visible */}
            <Typography
              sx={{
                fontFamily: 'var(--font-sans)',
                fontSize: { xs: '1rem', sm: '1.05rem', md: '1.15rem' },
                fontWeight: 500,
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: '0.01em',
                lineHeight: 1.6,
                maxWidth: 520,
                px: 2,
                mb: { xs: 3, md: 4 },
                textShadow: '0 1px 8px rgba(0,0,0,0.4)',
              }}
            >
              CEFR-based flashcards, worksheets, subbed animations and more.
            </Typography>

            {/* CTA button — larger touch target on mobile */}
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardSharp />}
              onClick={() => router.push('/learn')}
              sx={{
                background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-lt) 100%)',
                color: '#1a0e00',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: { xs: '0.95rem', md: '1rem' },
                textTransform: 'none',
                borderRadius: '4px',
                px: { xs: 4, md: 5 },
                py: { xs: 1.7, md: 1.9 },
                minHeight: { xs: 52, md: 56 },
                boxShadow: '0 6px 28px rgba(184,134,11,0.45)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, var(--gold-lt) 0%, #e6c060 100%)',
                  boxShadow: '0 10px 36px rgba(184,134,11,0.55)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Start Learning
            </Button>
          </Box>

          {/* ── Concave bottom curve ───────────────────────────
              Curve dips DOWN in the centre so the white page
              below appears to scoop upward into the hero.
          ─────────────────────────────────────────────────── */}
          <Box
            component="svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 90"
            preserveAspectRatio="none"
            aria-hidden="true"
            sx={{
              position: 'absolute',
              bottom: -1,   // -1px kills sub-pixel hairline gaps
              left: 0,
              width: '100%',
              height: { xs: 50, sm: 70, md: 90 },
              display: 'block',
              zIndex: 3,
            }}
          >
            <path
              d="M0,0 C360,90 1080,90 1440,0 L1440,90 L0,90 Z"
              fill="#ffffff"
            />
          </Box>
        </Box>

        <CartoonSection />

      </Box>
    </>
  );
}