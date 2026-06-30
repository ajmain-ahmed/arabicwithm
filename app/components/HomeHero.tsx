'use client'

import { ArrowForwardSharp } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from "react";

/* ─────────────────────────────────────────────
   Rotating sub-headlines
───────────────────────────────────────────── */
const SUBHEADLINES = [
  "with movies",
  "with cartoons",
  "with poetry",
  "with quotes",
  "with stories",
  "with flashcards",
];

/* ─────────────────────────────────────────────
   CTA config: label + route per headline
───────────────────────────────────────────── */
function getCtaConfig(subheadline: string) {
  const sh = subheadline.toLowerCase();
  if (sh.includes("movies") || sh.includes("cartoons")) {
    return { label: "Start Watching", href: "/cartoons" };
  }
  if (sh.includes("flashcards")) {
    return { label: "Start Learning", href: "/flashcards" };
  }
  return { label: "Start Reading", href: "/" };
}

export default function HomeHero() {
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

  const { label: ctaLabel, href: ctaHref } = getCtaConfig(SUBHEADLINES[subIndex]);

  return (
    <Box
      sx={{
        position: 'relative',
        // Pull the hero up into the navbar padding area so the background
        // starts flush with the top of the viewport (under the fixed navbar).
        mt: { xs: '-56px', md: '-64px' },
        height: { xs: 'calc(70vh - 56px)', md: 'calc(100vh - 64px)' },
        minHeight: { xs: 520, sm: 580, md: 640 },
        maxHeight: { xs: 800, md: 950 },
        overflow: 'hidden',
      }}
    >
      {/* ── Background image ── */}
      <Box
        component="img"
        src="/homepage/hero.avif"
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

      {/* ── Content ── */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 4, md: 6 },
          textAlign: 'center',
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

        {/* Sub-copy */}
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

        {/* CTA pill button — fixed width, dynamic label + route */}
        <Button
          variant="contained"
          size="large"
          onClick={() => router.push(ctaHref)}
          sx={{
            background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-lt) 100%)',
            color: '#1a0e00',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: { xs: '0.95rem', md: '1rem' },
            textTransform: 'none',
            borderRadius: '9999px',
            width: { xs: 220, sm: 230, md: 250 },
            minHeight: { xs: 52, md: 56 },
            px: 0,
            py: { xs: 1.5, md: 1.7 },
            boxShadow: '0 6px 28px rgba(184,134,11,0.45)',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: 'linear-gradient(135deg, var(--gold-lt) 0%, #e6c060 100%)',
              boxShadow: '0 10px 36px rgba(184,134,11,0.55)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={ctaLabel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
              }}
            >
              {ctaLabel}
              <ArrowForwardSharp fontSize="small" />
            </motion.span>
          </AnimatePresence>
        </Button>
      </Box>

      {/* ── Concave bottom curve ── */}
      {/* Curve shape definition for clip-path */}
      <Box
        component="svg"
        width="0"
        height="0"
        sx={{ position: 'absolute' }}
      >
        <defs>
          <clipPath id="heroCurve" clipPathUnits="objectBoundingBox">
            <path d="M0,0 C0.25,1 0.75,1 1,0 L1,1 L0,1 Z" />
          </clipPath>
        </defs>
      </Box>

      {/* White curve */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -1,
          left: 0,
          width: '100%',
          height: { xs: 50, sm: 70, md: 90 },
          background: '#ffffff',
          clipPath: 'url(#heroCurve)',
          zIndex: 3,
        }}
      />

      {/* Stripe overlay on curve */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -1,
          left: 0,
          width: '100%',
          height: { xs: 50, sm: 70, md: 90 },
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23b8860b' stroke-width='1.2'%3E%3Cpath d='M-1 1l2-2M0 8L8 0M7 9l2-2'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '8px 8px',
          opacity: 0.08,
          clipPath: 'url(#heroCurve)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
