'use client'

import { ArrowForwardSharp } from "@mui/icons-material";
import { Box, Button, Container, Typography, Collapse } from "@mui/material";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Lenis from 'lenis';
import Navbar from "./components/navbar";
import { useVocabStore, type Vocab } from "@/store/vocabStore";

/* ─────────────────────────────────────────────
   Global CSS
───────────────────────────────────────────── */
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

  /* ── hero strips ── */
  .strip-wrap {
    overflow: hidden;
    line-height: 0;
    flex: 1;
    min-height: 0;
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
  }
  .strip-track {
    display: flex;
    gap: 3px;
    width: max-content;
    will-change: transform;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    contain: layout style;
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
    contain: layout;
  }
  @media (max-width: 768px) { .thumb { filter: blur(0.8px); } }

  /* ── flashcard ── */
  .fc-shell {
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(184,134,11,0.18);
    border-radius: 12px;
    padding: 2rem 1.75rem 1.5rem;
    backdrop-filter: blur(8px);
    transition: border-color 0.2s;
  }
  .fc-shell:hover { border-color: rgba(184,134,11,0.35); }

  .fc-progress-bg {
    height: 2px;
    background: rgba(184,134,11,0.12);
    border-radius: 999px;
    margin-bottom: 1.5rem;
    overflow: hidden;
  }
  .fc-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--gold) 0%, var(--gold-lt) 100%);
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .fc-level-badge {
    display: inline-flex;
    align-items: center;
    font-family: 'Jost', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 999px;
    margin-right: 6px;
  }
  .fc-badge-A0 { background: rgba(14,46,31,0.08); color: var(--forest); }
  .fc-badge-A1 { background: rgba(184,134,11,0.1); color: var(--gold); }
  .fc-badge-A2 { background: rgba(44,26,14,0.08); color: var(--bark); }
  .fc-badge-B1 { background: rgba(122,110,101,0.12); color: var(--muted); }

  .fc-type-badge {
    display: inline-flex;
    align-items: center;
    font-family: 'Jost', sans-serif;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(122,110,101,0.08);
    color: var(--muted);
  }

  .fc-arabic {
    font-family: 'EB Garamond', serif;
    font-size: clamp(3rem, 8vw, 4.5rem);
    font-weight: 700;
    direction: rtl;
    text-align: center;
    color: var(--bark);
    margin: 1rem 0 0.2rem;
    line-height: 1.35;
  }

  .fc-diacritic {
    font-family: 'EB Garamond', serif;
    font-size: 1.25rem;
    direction: rtl;
    text-align: center;
    color: var(--muted);
    margin-bottom: 1.25rem;
  }

  .fc-divider {
    border: none;
    border-top: 1px solid rgba(184,134,11,0.1);
    margin: 0.75rem 0 1rem;
  }

  .fc-transliteration {
    font-family: 'Jost', sans-serif;
    font-size: 0.85rem;
    font-style: italic;
    color: var(--gold);
    text-align: center;
    margin-bottom: 0.2rem;
    letter-spacing: 0.04em;
  }

  .fc-definition {
    font-family: 'EB Garamond', serif;
    font-size: 2rem;
    font-weight: 700;
    color: var(--bark);
    text-align: center;
    margin-bottom: 0.25rem;
  }

  .fc-root {
    font-family: 'Jost', sans-serif;
    font-size: 0.75rem;
    color: var(--muted);
    text-align: center;
    direction: rtl;
    opacity: 0.7;
    margin-bottom: 0.5rem;
  }

  /* Anki grade buttons — match japanese page's ToggleButton feel */
  .fc-btn-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 1rem;
  }

  .fc-grade-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 0.55rem 0.25rem;
    border-radius: 4px;
    border: 1px solid;
    background: transparent;
    font-family: 'Jost', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .fc-grade-btn:active { transform: scale(0.97); }

  .fc-grade-btn .fc-interval {
    font-size: 9px;
    font-weight: 400;
    opacity: 0.7;
  }

  .fc-btn-again { border-color: #c62828; color: #c62828; }
  .fc-btn-again:hover { background: rgba(198,40,40,0.06); }

  .fc-btn-hard  { border-color: #e65100; color: #e65100; }
  .fc-btn-hard:hover  { background: rgba(230,81,0,0.06); }

  .fc-btn-good  { border-color: #2e7d32; color: #2e7d32; }
  .fc-btn-good:hover  { background: rgba(46,125,50,0.06); }

  .fc-btn-easy  { border-color: #1565c0; color: #1565c0; }
  .fc-btn-easy:hover  { background: rgba(21,101,192,0.06); }

  .fc-show-btn {
    width: 100%;
    margin-top: 1.25rem;
    padding: 0.6rem;
    background: transparent;
    border: 1px solid rgba(184,134,11,0.3);
    border-radius: 4px;
    color: var(--bark);
    font-family: 'Jost', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .fc-show-btn:hover {
    background: rgba(184,134,11,0.06);
    border-color: rgba(184,134,11,0.5);
  }

  .fc-stat-pill {
    font-family: 'Jost', sans-serif;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid rgba(122,110,101,0.2);
    color: var(--muted);
  }

  .fc-stat-pill.due   { border-color: rgba(198,40,40,0.2);  color: #c62828; }
  .fc-stat-pill.done  { border-color: rgba(46,125,50,0.2);   color: #2e7d32; }

  /* skeleton shimmer for loading state */
  .fc-skeleton {
    background: linear-gradient(90deg, rgba(184,134,11,0.06) 25%, rgba(184,134,11,0.12) 50%, rgba(184,134,11,0.06) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }
  @keyframes shimmer { to { background-position: -200% 0; } }

  /* done state checkmark */
  .fc-done-circle {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 1.5px solid rgba(14,46,31,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    color: var(--forest);
    font-size: 1.4rem;
  }
`;

/* ─────────────────────────────────────────────
   Hero strip config
───────────────────────────────────────────── */
const triple = (arr: number[]) => [...arr, ...arr, ...arr];

const ROWS: { imgs: number[]; cls: string }[] = [
  { imgs: triple([1, 4, 7, 10, 13, 16, 19, 2, 5]), cls: 'sl-a' },
  { imgs: triple([8, 11, 14, 17, 20, 3, 6, 9, 12]), cls: 'sr-a' },
  { imgs: triple([15, 18, 1, 4, 7, 10, 13, 16, 19]), cls: 'sl-b' },
  { imgs: triple([2, 5, 8, 11, 14, 17, 20, 3, 6]), cls: 'sr-b' },
  { imgs: triple([9, 12, 15, 18, 1, 4, 7, 10, 13]), cls: 'sl-c' },
  { imgs: triple([16, 19, 2, 5, 8, 11, 14, 17, 20]), cls: 'sr-c' },
];

/* ─────────────────────────────────────────────
   SM-2 spaced repetition types & helpers
───────────────────────────────────────────── */
type CardState = Vocab & {
  interval: number;    // days
  easeFactor: number;
  repetitions: number;
  due: number;         // ms timestamp
};

function initCard(v: Vocab): CardState {
  return { ...v, interval: 0, easeFactor: 2.5, repetitions: 0, due: 0 };
}

function getNextIntervals(card: CardState): [number, number, number, number] {
  const ef = card.easeFactor;
  const again = 1 / 1440;
  const hard = card.interval > 0 ? Math.max(card.interval * 1.2, 1 / 24) : 6 / 1440;
  const good = card.interval > 0 ? card.interval * ef : 10 / 1440;
  const easy = card.interval > 0 ? card.interval * ef * 1.3 : 4;
  return [again, hard, good, easy];
}

function applyGrade(card: CardState, grade: 0 | 1 | 2 | 3): CardState {
  const intervals = getNextIntervals(card);
  const efDeltas = [-0.8, -0.15, 0, 0.15];
  return {
    ...card,
    interval: intervals[grade],
    easeFactor: Math.max(1.3, card.easeFactor + efDeltas[grade]),
    repetitions: grade === 0 ? 0 : card.repetitions + 1,
    due: Date.now() + intervals[grade] * 86_400_000,
  };
}

function fmtInterval(days: number): string {
  if (days < 1 / 1440) return '<1m';
  if (days < 1 / 24) return Math.round(days * 1440) + 'm';
  if (days < 1) return Math.round(days * 24) + 'h';
  if (days < 30) return Math.round(days) + 'd';
  return Math.round(days / 30) + 'mo';
}

/* ─────────────────────────────────────────────
   Flashcard demo component
───────────────────────────────────────────── */
const DEMO_COUNT = 10;

const FALLBACK_VOCAB: Vocab[] = [
  { idx: 0, id: 1, word: "أبدا", word_diacritic: "أَبَداً", transliteration: "abadan", definition: "never", level: "A0", type: "adv", root: "أ-ب-د" },
  { idx: 1, id: 2, word: "أحيانًا", word_diacritic: "أَحْيَاناً", transliteration: "ahyanan", definition: "sometimes", level: "A0", type: "adv", root: "ح-ي-ن" },
  { idx: 2, id: 3, word: "أين", word_diacritic: "أَيْنَ", transliteration: "ayna", definition: "where", level: "A0", type: "adv", root: "أ-ي-ن" },
  { idx: 3, id: 4, word: "بيت", word_diacritic: "بَيْت", transliteration: "bayt", definition: "house", level: "A0", type: "noun", root: "ب-ي-ت" },
  { idx: 4, id: 5, word: "كتب", word_diacritic: "كَتَبَ", transliteration: "kataba", definition: "he wrote", level: "A1", type: "verb", root: "ك-ت-ب" },
  { idx: 5, id: 6, word: "قرأ", word_diacritic: "قَرَأَ", transliteration: "qara'a", definition: "he read", level: "A1", type: "verb", root: "ق-ر-أ" },
  { idx: 6, id: 7, word: "جميل", word_diacritic: "جَمِيل", transliteration: "jameel", definition: "beautiful", level: "A1", type: "adj", root: "ج-م-ل" },
  { idx: 7, id: 8, word: "سعيد", word_diacritic: "سَعِيد", transliteration: "sa'eed", definition: "happy", level: "A1", type: "adj", root: "س-ع-د" },
  { idx: 8, id: 9, word: "ذهب", word_diacritic: "ذَهَبَ", transliteration: "dhahaba", definition: "he went", level: "A2", type: "verb", root: "ذ-ه-ب" },
  { idx: 9, id: 10, word: "كلام", word_diacritic: "كَلَام", transliteration: "kalaam", definition: "speech", level: "A2", type: "noun", root: "ك-ل-م" },
];

function FlashcardDemo() {
  const storeVocab = useVocabStore((s) => s.vocab);
  const isLoading = useVocabStore((s) => s.isLoading);

  const sampleVocab = useMemo<Vocab[]>(() => {
    const source = storeVocab.length >= DEMO_COUNT ? storeVocab : FALLBACK_VOCAB;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, DEMO_COUNT);
  }, [storeVocab]);

  const [queue, setQueue] = useState<CardState[]>([]);
  const [current, setCurrent] = useState<CardState | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const reset = useCallback((vocab: Vocab[]) => {
    const deck = vocab.map(initCard);
    setQueue(deck.slice(1));
    setCurrent(deck[0]);
    setRevealed(false);
    setDoneCount(0);
    setIsDone(false);
  }, []);

  useEffect(() => { reset(sampleVocab); }, [sampleVocab]);

  const grade = useCallback((g: 0 | 1 | 2 | 3) => {
    if (!current) return;
    const graded = applyGrade(current, g);

    setQueue(prev => {
      let next = [...prev];
      if (g === 0) {
        // Again: reinsert ~5 cards ahead
        next.splice(Math.min(4, next.length), 0, graded);
      }
      // else card is retired from this session

      if (next.length === 0) {
        setIsDone(true);
        setCurrent(null);
        setDoneCount(d => d + (g > 0 ? 1 : 0));
        return [];
      }

      const [nextCard, ...rest] = next;
      setCurrent(nextCard);
      setRevealed(false);
      setDoneCount(d => d + (g > 0 ? 1 : 0));
      return rest;
    });
  }, [current]);

  const progressPct = isDone
    ? 100
    : Math.round((doneCount / DEMO_COUNT) * 100);

  const newCount = current ? queue.filter(c => c.repetitions === 0).length + 1 : 0;
  const dueCount = queue.filter(c => c.repetitions > 0 && c.due <= Date.now()).length;
  const intervals = current ? getNextIntervals(current) : [0, 0, 0, 0] as [number, number, number, number];

  if (isLoading) {
    return (
      <Box className="fc-shell" sx={{ minHeight: 320 }}>
        <Box className="fc-progress-bg"><Box className="fc-progress-fill" sx={{ width: '0%' }} /></Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {[60, 50, 55].map((w, i) => <Box key={i} className="fc-skeleton" sx={{ height: 20, width: w }} />)}
        </Box>
        <Box className="fc-skeleton" sx={{ height: 80, width: '60%', mx: 'auto', mb: 1 }} />
        <Box className="fc-skeleton" sx={{ height: 24, width: '30%', mx: 'auto', mb: 3 }} />
        <Box className="fc-skeleton" sx={{ height: 42, width: '100%' }} />
      </Box>
    );
  }

  return (
    <Box className="fc-shell">
      {/* progress */}
      <Box className="fc-progress-bg">
        <Box className="fc-progress-fill" sx={{ width: `${progressPct}%` }} />
      </Box>

      {/* stats */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <span className="fc-stat-pill">{newCount} new</span>
        <span className={`fc-stat-pill${dueCount > 0 ? ' due' : ''}`}>{dueCount} due</span>
        <span className={`fc-stat-pill${doneCount > 0 ? ' done' : ''}`}>{doneCount} done</span>
      </Box>

      <AnimatePresence mode="wait">
        {isDone ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box className="fc-done-circle">✓</Box>
              <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: '1.6rem', fontWeight: 700, color: 'var(--bark)', mb: 0.5 }}>
                Session complete
              </Typography>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', color: 'var(--muted)', mb: 3 }}>
                You reviewed all {DEMO_COUNT} words.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => reset(sampleVocab)}
                sx={{
                  borderColor: 'var(--gold)',
                  color: 'var(--bark)',
                  fontFamily: 'Jost, sans-serif',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  borderRadius: '4px',
                  px: 3,
                  '&:hover': { background: 'rgba(184,134,11,0.06)', borderColor: 'var(--gold-lt)' },
                }}
              >
                Start over
              </Button>
            </Box>
          </motion.div>
        ) : current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {/* badges */}
            <Box sx={{ textAlign: 'center', mb: 0.5 }}>
              <span className={`fc-level-badge fc-badge-${current.level}`}>{current.level}</span>
              <span className="fc-type-badge">{current.type}</span>
            </Box>

            {/* arabic */}
            <Box className="fc-arabic">{current.word}</Box>
            <Box className="fc-diacritic">{current.word_diacritic}</Box>

            {/* revealed answer */}
            <Collapse in={revealed} timeout={220}>
              <hr className="fc-divider" />
              <Box className="fc-transliteration">{current.transliteration}</Box>
              <Box className="fc-definition">{current.definition}</Box>
              <Box className="fc-root">root · {current.root}</Box>

              <Box className="fc-btn-row">
                {(
                  [
                    { label: 'Again', cls: 'fc-btn-again', g: 0 },
                    { label: 'Hard', cls: 'fc-btn-hard', g: 1 },
                    { label: 'Good', cls: 'fc-btn-good', g: 2 },
                    { label: 'Easy', cls: 'fc-btn-easy', g: 3 },
                  ] as { label: string; cls: string; g: 0 | 1 | 2 | 3 }[]
                ).map(({ label, cls, g }) => (
                  <button key={label} className={`fc-grade-btn ${cls}`} onClick={() => grade(g)}>
                    {label}
                    <span className="fc-interval">{fmtInterval(intervals[g])}</span>
                  </button>
                ))}
              </Box>
            </Collapse>

            {!revealed && (
              <button className="fc-show-btn" onClick={() => setRevealed(true)}>
                Show answer
              </button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Box>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */

const SUBHEADLINES = [
  "with movies",
  "with cartoons",
  "with poetry",
  "with quotes",
  "with stories",
  "WithM"
];

export default function HomePage() {
  const router = useRouter();
  const fetchVocab = useVocabStore((s) => s.fetch);
  const [subIndex, setSubIndex] = useState(0);

  // kick off vocab fetch
  useEffect(() => { fetchVocab(); }, [fetchVocab]);

  // Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  // sub-headline rotation every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSubIndex((prev) => (prev + 1) % SUBHEADLINES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const textVariants = {
    initial: { opacity: 0, y: 20, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -20, filter: 'blur(10px)' },
  };

  return (
    <>
      <style>{PAGE_CSS}</style>
      <Navbar />

      <Box component="main" sx={{ background: 'var(--cream)', minHeight: '100vh', overflow: 'hidden' }}>

        {/* ── HERO ── */}
        <Box sx={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* strip grid */}
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', gap: '3px', py: '0px',
              transform: 'rotate(-1.5deg) scale(1.07)',
              transformOrigin: 'center center',
            }}
          >
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

          {/* overlays */}
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'rgba(4,10,6,0.5)' }} />
          <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, rgba(4,10,6,0.3) 50%, rgba(4,10,6,0.8) 85%, rgba(4,10,6,0.95) 100%)' }} />

          {/* hero content */}
          <Box sx={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>

            {/* Static first line */}
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
                mb: 1
              }}
            >
              Learn Arabic
            </Typography>

            {/* Animated second line */}
            <Box sx={{ height: { xs: '80px', md: '100px' }, position: 'relative', width: '100%', mb: 4 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={subIndex}
                  variants={textVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: '"EB Garamond", serif',
                      fontSize: { xs: '3rem', sm: '4.5rem', md: '6rem', lg: '7rem' },
                      fontWeight: 700,
                      lineHeight: 1.1,
                      color: 'var(--gold-lt)',
                      fontStyle: 'italic',
                      letterSpacing: '-0.02em',
                      textShadow: '0 4px 24px rgba(0,0,0,0.6)',
                    }}
                  >
                    {SUBHEADLINES[subIndex]}
                  </Typography>
                </motion.div>
              </AnimatePresence>
            </Box>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}>
              <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '1rem', md: '1.15rem' },
                fontWeight: 500, color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.7, maxWidth: 800, mx: 'auto', mb: 5,
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}>
                Master Arabic through the shows you already love, from SpongeBob to Gumball.
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
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
                  transition: 'all 0.25s ease', // smooth out the change
                  '&:hover': {
                    background: 'linear-gradient(135deg, var(--gold-lt) 0%, #e6c060 100%)', // shift the gradient instead of killing it
                    boxShadow: '0 12px 40px rgba(184,134,11,0.5)',
                    transform: 'translateY(-1px)', // subtle lift instead of blink
                  },
                }}
              >
                Start Learning
              </Button>
            </motion.div>
          </Box>

          {/* scroll hint */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}
          >
            <Box sx={{
              width: 1, height: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            }}>
              <Box sx={{ width: 1, height: 24, borderLeft: '1px solid rgba(255,255,255,0.25)' }} />
              <Box sx={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'rgba(255,255,255,0.4)',
                animation: 'scrollDot 1.8s ease-in-out infinite',
              }} />
            </Box>
          </motion.div>
        </Box>

        {/* ── FLASHCARD DEMO SECTION ── */}
        <Box sx={{ background: 'var(--cream)', py: { xs: 10, md: 14 } }}>
          <Container maxWidth="sm">

            {/* section label */}
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.7rem', fontWeight: 600,
                letterSpacing: '0.22em', color: 'var(--gold)',
                textTransform: 'uppercase', mb: 1.5,
              }}>
                Try it now
              </Typography>
              <Typography sx={{
                fontFamily: '"EB Garamond", serif',
                fontSize: { xs: '2.4rem', md: '3.2rem' },
                fontWeight: 700, color: 'var(--bark)', lineHeight: 1.1, mb: 2,
              }}>
                Vocabulary that <em>sticks</em>
              </Typography>
              <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                FontSize: '0.95rem', color: 'var(--muted)',
                lineHeight: 1.8, maxWidth: 400, mx: 'auto',
              }}>
                Spaced repetition shows you each word at the exact moment you're about to forget it.
              </Typography>
            </Box>

            {/* the card */}
            <FlashcardDemo />

            {/* caption */}
            <Typography sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.75rem', color: 'var(--muted)',
              textAlign: 'center', mt: 2.5, opacity: 0.7,
            }}>
              Ratings use the SM-2 algorithm — the same one that powers Anki.
            </Typography>

          </Container>
        </Box>

        {/* ── FOOTER ── */}
        <Box sx={{
          py: 4, borderTop: '1px solid rgba(184,134,11,0.1)',
          background: 'var(--cream)', textAlign: 'center',
        }}>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.8rem', color: 'var(--muted)' }}>
            © {new Date().getFullYear()} ArabicWithM. All rights reserved.
          </Typography>
        </Box>

      </Box>

      {/* scroll dot keyframe (injected once) */}
      <style>{`
        @keyframes scrollDot {
          0%,100% { opacity: 0.4; transform: translateY(0); }
          50%      { opacity: 1;   transform: translateY(6px); }
        }
      `}</style>
    </>
  );
}