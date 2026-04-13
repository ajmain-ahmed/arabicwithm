'use client'

import { ArrowForwardSharp } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
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
    --row-gap: 3px;
  }

  @media (max-width: 600px) {
    :root { --row-gap: 15px; }
    .strip-wrap {
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%);
      mask-image: linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%);
    }
  }

  html, body { background: var(--cream); margin: 0; }

  .strip-wrap { overflow: hidden; line-height: 0; flex: 1; min-height: 0; }

  .strip-track {
    display: flex;
    gap: var(--row-gap);
    width: max-content;
    will-change: transform;
    transform: translate3d(0, 0, 0);
  }

  .sl-a { animation: sl 130s linear infinite; }
  .sr-a { animation: sr 130s linear infinite; }
  .sl-b { animation: sl 160s linear infinite; }
  .sr-b { animation: sr 160s linear infinite; }
  .sl-c { animation: sl 110s linear infinite; }
  .sr-c { animation: sr 110s linear infinite; }

  @keyframes sl { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-33.3333%, 0, 0); } }
  @keyframes sr { from { transform: translate3d(-33.3333%, 0, 0); } to { transform: translate3d(0, 0, 0); } }

  .thumb {
    width: 300px; height: auto; aspect-ratio: 16 / 9; object-fit: cover;
    border-radius: 8px; display: block; flex-shrink: 0; transform: translateZ(0);
  }
`;

const triple = (arr: number[]) => [...arr, ...arr, ...arr];
const ROWS = [
  { imgs: triple([1, 4, 7, 10, 13, 16, 19, 2, 5]), cls: 'sl-a' },
  { imgs: triple([8, 11, 14, 17, 20, 3, 6, 9, 12]), cls: 'sr-a' },
  { imgs: triple([15, 18, 1, 4, 7, 10, 13, 16, 19]), cls: 'sl-b' },
  { imgs: triple([2, 5, 8, 11, 14, 17, 20, 3, 6]), cls: 'sr-b' },
  { imgs: triple([9, 12, 15, 18, 1, 4, 7, 10, 13]), cls: 'sl-c' },
  { imgs: triple([16, 19, 2, 5, 8, 11, 14, 17, 20]), cls: 'sr-c' },
];

export default function HomePage() {
  const router = useRouter();
  const [isArabic, setIsArabic] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setIsArabic((prev) => !prev), 7000);
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
      <Box component="main" sx={{ background: 'var(--cream)', minHeight: '100vh' }}>
        <Box sx={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 'var(--row-gap)', transform: 'rotate(-1.5deg) scale(1.07)' }}>
            {ROWS.map((row, ri) => (
              <div key={ri} className="strip-wrap">
                <div className={`strip-track ${row.cls}`}>
                  {row.imgs.map((n, i) => (
                    <img key={i} className="thumb" src={`/hero/awm${n}.png`} alt="" loading={ri < 2 ? 'eager' : 'lazy'} />
                  ))}
                </div>
              </div>
            ))}
          </Box>
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'rgba(4,10,6,0.5)' }} />
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, rgba(4,10,6,0.3) 50%, rgba(4,10,6,0.8) 85%, rgba(4,10,6,0.95) 100%)` }} />

          <Box sx={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
            <Box sx={{ height: { xs: '200px', md: '280px' }, position: 'relative', width: '100%' }}>
              <AnimatePresence mode="wait">
                {!isArabic ? (
                  <motion.div key="en" variants={headlineVariants} initial="initial" animate="animate" exit="exit" transition={{ type: "spring", damping: 20, stiffness: 300 }} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography component="h1" sx={{ fontFamily: '"EB Garamond", serif', fontSize: { xs: '3rem', sm: '4.5rem', md: '6rem', lg: '7rem' }, fontWeight: 700, lineHeight: 1.1, color: '#ffffff', textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                      Learn Arabic<br /><em style={{ color: 'var(--gold-lt)', fontStyle: 'italic' }}>the fun way.</em>
                    </Typography>
                  </motion.div>
                ) : (
                  <motion.div key="ar" variants={headlineVariants} initial="initial" animate="animate" exit="exit" transition={{ type: "spring", damping: 20, stiffness: 300 }} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography component="h1" dir="rtl" sx={{ fontFamily: '"EB Garamond", serif', fontSize: { xs: '3rem', sm: '4.5rem', md: '6rem', lg: '7rem' }, fontWeight: 700, lineHeight: 1.3, color: '#ffffff', textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
                      تعلم العربية<br /><span style={{ color: 'var(--gold-lt)' }}>بطريقة ممتعة</span>
                    </Typography>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: '1rem', md: '1.15rem' }, color: 'rgba(255, 255, 255, 0.9)', mb: 5, maxWidth: 800 }}>
                Master Arabic through the shows you already love, from SpongeBob to Gumball.
              </Typography>
            </motion.div>
            <Button variant="contained" size="large" endIcon={<ArrowForwardSharp />} onClick={() => router.push('/learn')} sx={{ background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-lt) 100%)', color: 'var(--bark)', fontWeight: 600, px: 4, py: 1.6 }}>
              Start Learning
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
}