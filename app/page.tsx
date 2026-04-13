'use client'

import { ArrowForwardSharp, Person } from "@mui/icons-material";
import { Box, Button, Container, Typography } from "@mui/material";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from "react";
import Navbar from "./components/navbar";

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cookie&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Jost:wght@300;400;500;600&display=swap');

  :root {
    --sand:   #f5ede0;
    --cream:  #faf7f2;
    --bark:   #2c1a0e;
    --forest: #0e2e1f;
    --gold:   #b8860b;
    --gold-lt:#d4a843;
    --muted:  #7a6e65;
  }

  html, body { background: var(--cream); margin: 0; }

  .strip-wrap {
    overflow: hidden;
    line-height: 0;
    flex: 1;
    min-height: 0;
  }

  .strip-track {
    display: flex;
    gap: 3px;
    width: max-content;
    will-change: transform;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .sl-a { animation: sl 130s linear infinite; }
  .sr-a { animation: sr 130s linear infinite; }
  .sl-b { animation: sl 160s linear infinite; }
  .sr-b { animation: sr 160s linear infinite; }
  .sl-c { animation: sl 110s linear infinite; }
  .sr-c { animation: sr 110s linear infinite; }

  @keyframes sl {
    from { transform: translate3d(0,         0, 0); }
    to   { transform: translate3d(-33.3333%, 0, 0); }
  }
  @keyframes sr {
    from { transform: translate3d(-33.3333%, 0, 0); }
    to   { transform: translate3d(0,         0, 0); }
  }

  .thumb {
    width: 300px;
    height: auto;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 8px;
    display: block;
    flex-shrink: 0;
    transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  /* Very subtle blur on mobile only */
  @media (max-width: 768px) {
    .thumb {
      filter: blur(0.8px);
    }
  }

  .feature-card {
    padding: 24px;
    border: 1px solid rgba(184,134,11,0.18);
    border-radius: 4px;
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(6px);
    transition: border-color 0.22s, background 0.22s;
  }
  .feature-card:hover {
    border-color: rgba(184,134,11,0.4);
    background: rgba(255,255,255,0.95);
  }
`;

const triple = (arr: number[]) => [...arr, ...arr, ...arr];

const ROWS: { imgs: number[]; cls: string }[] = [
  { imgs: triple([1, 4, 7, 10, 13, 16, 19, 2, 5]), cls: 'sl-a' },
  { imgs: triple([8, 11, 14, 17, 20, 3, 6, 9, 12]), cls: 'sr-a' },
  { imgs: triple([15, 18, 1, 4, 7, 10, 13, 16, 19]), cls: 'sl-b' },
  { imgs: triple([2, 5, 8, 11, 14, 17, 20, 3, 6]), cls: 'sr-b' },
  { imgs: triple([9, 12, 15, 18, 1, 4, 7, 10, 13]), cls: 'sl-c' },
  { imgs: triple([16, 19, 2, 5, 8, 11, 14, 17, 20]), cls: 'sr-c' },
];

const STATS = [
  { value: '50+', label: 'Video Lessons' },
  { value: '10k+', label: 'Students Reached' },
  { value: '5★', label: 'Average Rating' },
];

const FEATURES = [
  { icon: '🎬', title: 'Cartoon-based', body: 'Learn through SpongeBob, Gumball, Powerpuff Girls and more.' },
  { icon: '🗣️', title: 'Real Arabic', body: 'Modern Standard Arabic in authentic, memorable context.' },
  { icon: '🎯', title: 'All levels', body: 'From your first words to fluid comprehension.' },
  { icon: '📱', title: 'Your pace', body: 'Short, focused videos you can watch anywhere, anytime.' },
];

export default function HomePage() {
  const router = useRouter();
  const [isArabic, setIsArabic] = useState(false);

  // Switch text every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setIsArabic((prev) => !prev);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const headlineVariants = {
    initial: { opacity: 0, y: 20, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -20, filter: "blur(10px)" }
  };

  return (
    <>
      <style>{PAGE_CSS}</style>

      <Navbar />

      <Box component="main" sx={{ background: 'var(--cream)', minHeight: '100vh', overflow: 'hidden' }}>

        <Box
          sx={{
            position: 'relative',
            height: '100vh',
            minHeight: 600,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Strip grid background */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              py: '0px',
              transform: 'rotate(-1.5deg) scale(1.07)',
              transformOrigin: 'center center',
            }}
          >
            {ROWS.map((row, ri) => (
              <div key={ri} className="strip-wrap">
                <div className={`strip-track ${row.cls}`}>
                  {row.imgs.map((n, i) => (
                    <img
                      key={i}
                      className="thumb"
                      src={`/hero/awm${n}.png`}
                      alt=""
                      loading={ri < 2 ? 'eager' : 'lazy'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </Box>

          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'rgba(4,10,6,0.5)' }} />
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, rgba(4,10,6,0.3) 50%, rgba(4,10,6,0.8) 85%, rgba(4,10,6,0.95) 100%)` }} />

          {/* Hero Content */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Box sx={{ height: { xs: '200px', md: '280px' }, position: 'relative', width: '100%' }}>
              <AnimatePresence mode="wait">
                {!isArabic ? (
                  <motion.div
                    key="english-hero"
                    variants={headlineVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Typography
                      component="h1"
                      sx={{
                        fontFamily: '"EB Garamond", serif',
                        fontSize: { xs: '3rem', sm: '4.5rem', md: '6rem', lg: '7rem' },
                        fontWeight: 700,
                        lineHeight: 1.1,
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                        textShadow: '0 4px 24px rgba(0,0,0,0.6)',
                      }}
                    >
                      Learn Arabic
                      <br />
                      <em style={{ color: 'var(--gold-lt)', fontStyle: 'italic' }}>the fun way.</em>
                    </Typography>
                  </motion.div>
                ) : (
                  <motion.div
                    key="arabic-hero"
                    variants={headlineVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Typography
                      component="h1"
                      dir="rtl"
                      sx={{
                        fontFamily: '"EB Garamond", serif',
                        fontSize: { xs: '3rem', sm: '4.5rem', md: '6rem', lg: '7rem' },
                        fontWeight: 700,
                        lineHeight: 1.3,
                        color: '#ffffff',
                        textShadow: '0 4px 24px rgba(0,0,0,0.6)',
                      }}
                    >
                      تعلم العربية
                      <br />
                      <span style={{ color: 'var(--gold-lt)' }}>بطريقة ممتعة</span>
                    </Typography>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}>
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.7,
                  maxWidth: 800,
                  mx: 'auto',
                  mb: 5,
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                Master Arabic through the shows you already love, from SpongeBob to Gumball.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.8 }}
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}
            >
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardSharp />}
                onClick={() => router.push('/learn')}
                sx={{
                  background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-lt) 100%)',
                  color: 'var(--bark)',
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  borderRadius: '4px',
                  px: 4,
                  py: 1.6,
                  boxShadow: '0 8px 30px rgba(184,134,11,0.4)',
                  '&:hover': { background: 'var(--gold-lt)' },
                }}
              >
                Start Learning
              </Button>

            </motion.div>
          </Box>
        </Box>

        {/* STATS SECTION */}
        <Box sx={{ background: '#fff', borderBottom: '1px solid rgba(184,134,11,0.1)' }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
              {STATS.map(({ value, label }, i) => (
                <Box key={label} sx={{
                  py: 4, textAlign: 'center',
                  borderRight: i < STATS.length - 1 ? { md: '1px solid rgba(184,134,11,0.1)' } : 'none',
                }}>
                  <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: { xs: '2.2rem', md: '2.8rem' }, fontWeight: 700, color: 'var(--forest)', lineHeight: 1 }}>
                    {value}
                  </Typography>
                  <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', mt: 1 }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* FEATURES SECTION */}
        <Container maxWidth="lg">
          <Box sx={{ py: { xs: 8, md: 12 } }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase', mb: 2 }}>
                The Method
              </Typography>
              <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: { xs: '2.5rem', md: '3.5rem' }, fontWeight: 700, color: 'var(--bark)', lineHeight: 1.1 }}>
                Arabic you actually <em>remember</em>
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
              {FEATURES.map(({ icon, title, body }) => (
                <Box key={title} className="feature-card">
                  <Typography sx={{ fontSize: '2.5rem', mb: 2 }}>{icon}</Typography>
                  <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--bark)', mb: 1 }}>
                    {title}
                  </Typography>
                  <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.7 }}>
                    {body}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>

        {/* CTA BANNER */}
        <Box sx={{ background: 'linear-gradient(135deg, var(--forest) 0%, #071a0f 100%)', py: 12, position: 'relative', overflow: 'hidden' }}>
          <Typography aria-hidden="true" sx={{ position: 'absolute', top: -40, left: -20, fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: '18rem', color: 'rgba(255,255,255,0.03)', userSelect: 'none' }}>
            عربي
          </Typography>
          <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: { xs: '2.2rem', md: '3.2rem' }, fontWeight: 700, color: 'var(--sand)', mb: 3 }}>
              Ready to start your Arabic journey?
            </Typography>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: 'rgba(245,237,224,0.6)', mb: 5 }}>
              Join thousands of learners using cartoons to master Arabic.
            </Typography>
            <Button
              variant="outlined" size="large"
              endIcon={<ArrowForwardSharp />}
              onClick={() => router.push('/learn')}
              sx={{ borderColor: 'var(--gold-lt)', color: 'var(--gold-lt)', px: 5, py: 1.5, borderRadius: '4px', textTransform: 'none', '&:hover': { background: 'rgba(212,168,67,0.1)', borderColor: 'var(--gold-lt)' } }}
            >
              Explore the lessons
            </Button>
          </Container>
        </Box>

        <Box sx={{ py: 4, borderTop: '1px solid rgba(184,134,11,0.1)', background: 'var(--cream)', textAlign: 'center' }}>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: 'var(--muted)' }}>
            © {new Date().getFullYear()} ArabicWithM. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </>
  );
}