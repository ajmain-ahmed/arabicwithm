'use client'

import { Box, Typography } from '@mui/material'
import { CheckCircle, Whatshot } from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import type { MultiplierData } from '../types'

/* ── Color maps: grey inactive, unique color when active ── */
const RATING_COLORS = [
    { inactive: '#bdbdbd', active: '#42a5f5', glow: 'rgba(66,165,245,0.35)' },
    { inactive: '#bdbdbd', active: '#42a5f5', glow: 'rgba(66,165,245,0.35)' },
    { inactive: '#bdbdbd', active: '#ffa726', glow: 'rgba(255,167,38,0.35)' },
    { inactive: '#bdbdbd', active: '#66bb6a', glow: 'rgba(102,187,106,0.35)' },
]

const TIME_COLORS = [
    { inactive: '#bdbdbd', active: '#42a5f5', glow: 'rgba(66,165,245,0.35)' },
    { inactive: '#bdbdbd', active: '#64b5f6', glow: 'rgba(100,181,246,0.35)' },
    { inactive: '#bdbdbd', active: '#ffa726', glow: 'rgba(255,167,38,0.35)' },
    { inactive: '#bdbdbd', active: '#66bb6a', glow: 'rgba(102,187,106,0.35)' },
]

const DIFFICULTY_COLORS = [
    { inactive: '#bdbdbd', active: '#42a5f5', glow: 'rgba(66,165,245,0.35)' },
    { inactive: '#bdbdbd', active: '#64b5f6', glow: 'rgba(100,181,246,0.35)' },
    { inactive: '#bdbdbd', active: '#ffa726', glow: 'rgba(255,167,38,0.35)' },
    { inactive: '#bdbdbd', active: '#ff9800', glow: 'rgba(255,152,0,0.35)' },
    { inactive: '#bdbdbd', active: '#66bb6a', glow: 'rgba(102,187,106,0.35)' },
    { inactive: '#bdbdbd', active: '#43a047', glow: 'rgba(67,160,71,0.35)' },
]

function adaptiveScoreSize(value: number, baseRem: number): string {
    const len = value.toLocaleString().length
    if (len <= 5) return `${baseRem}rem`
    if (len <= 6) return `${baseRem * 0.9}rem`
    if (len <= 7) return `${baseRem * 0.78}rem`
    if (len <= 8) return `${baseRem * 0.68}rem`
    if (len <= 9) return `${baseRem * 0.6}rem`
    return `${baseRem * 0.52}rem`
}

function getCompeteColors(targetPct: number, reached: boolean) {
    if (reached) return {
        border: '#43a047',
        accent: '#66bb6a',
        glow: 'rgba(102,187,106,0.25)',
        bar: 'linear-gradient(90deg, #66bb6a, #43a047)',
        barGlow: 'rgba(102,187,106,0.4)',
        bg: 'linear-gradient(160deg, #0d2818 0%, #1a1a1a 60%, #0d2818 100%)',
        icon: '#66bb6a',
    }
    if (targetPct >= 66) return {
        border: '#ffc107',
        accent: '#ffca28',
        glow: 'rgba(255,202,40,0.2)',
        bar: 'linear-gradient(90deg, #ffc107, #ffca28)',
        barGlow: 'rgba(255,202,40,0.3)',
        bg: 'linear-gradient(160deg, #1a1a1a 0%, #2a1a0a 60%, #1a1a1a 100%)',
        icon: '#ffca28',
    }
    if (targetPct >= 33) return {
        border: '#ff9800',
        accent: '#ffa726',
        glow: 'rgba(255,167,38,0.2)',
        bar: 'linear-gradient(90deg, #ff9800, #ffa726)',
        barGlow: 'rgba(255,167,38,0.3)',
        bg: 'linear-gradient(160deg, #1a1a1a 0%, #2a1a0a 60%, #1a1a1a 100%)',
        icon: '#ffa726',
    }
    return {
        border: '#c62828',
        accent: '#e53935',
        glow: 'rgba(229,57,53,0.2)',
        bar: 'linear-gradient(90deg, #c62828, #ff5252)',
        barGlow: 'rgba(229,57,53,0.3)',
        bg: 'linear-gradient(160deg, #1a1a1a 0%, #2a1a1a 60%, #1a1a1a 100%)',
        icon: '#e53935',
    }
}

function MultiplierGrid({ label, values, activeValue, colors }: {
    label: string
    values: number[]
    activeValue: number
    colors: { inactive: string; active: string; glow: string }[]
}) {
    return (
        <Box sx={{ mb: 2.5 }}>
            <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#9e8a7a',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                mb: 1.25,
                textAlign: 'center',
            }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: 'center' }}>
                {values.map((val, idx) => {
                    const isActive = Math.abs(activeValue - val) < 0.001
                    const c = colors[idx]
                    return (
                        <Box
                            key={val}
                            sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.82rem',
                                fontWeight: isActive ? 700 : 500,
                                px: 1.4,
                                py: 0.5,
                                borderRadius: '8px',
                                border: '1.5px solid',
                                borderColor: isActive ? c.active : 'rgba(189,189,189,0.35)',
                                background: isActive ? `${c.active}18` : 'rgba(189,189,189,0.06)',
                                color: isActive ? c.active : c.inactive,
                                boxShadow: isActive ? `0 0 10px ${c.glow}` : 'none',
                                transition: 'all 0.35s ease',
                                textAlign: 'center',
                                minWidth: 44,
                            }}
                        >
                            {val.toFixed(1)}x
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}

function StreakBar({ value }: { value: number }) {
    const pct = Math.min(100, ((value - 1.0) / 1.0) * 100)
    return (
        <Box sx={{ mb: 1 }}>
            <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#9e8a7a',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                mb: 1.25,
                textAlign: 'center',
            }}>
                Streak
            </Typography>
            <Box sx={{ position: 'relative', height: 6, background: 'rgba(122,110,101,0.08)', borderRadius: '999px', overflow: 'hidden', mx: 0.5 }}>
                <Box sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #b8860b, #d4a843)',
                    borderRadius: '999px',
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5, mt: 0.5 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', color: '#9e8a7a' }}>1.0x</Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#b8860b' }}>
                    {value.toFixed(1)}x
                </Typography>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', color: '#9e8a7a' }}>2.0x</Typography>
            </Box>
        </Box>
    )
}

export default function PointsPanel({
    displayPoints,
    multipliers,
    targetPoints,
    lastPoints,
    pointsAnimKey,
}: {
    displayPoints: number
    multipliers: MultiplierData | null
    targetPoints: number
    lastPoints: number | null
    pointsAnimKey: number
}) {
    const rawDifficulty = multipliers?.difficulty ?? 1.5
    const snappedDifficulty = Math.min(2.5, Math.max(1.5, Math.round((rawDifficulty - 1.5) / 0.2) * 0.2 + 1.5))

    const targetReached = targetPoints > 0 && displayPoints >= targetPoints
    const targetPct = targetPoints > 0 ? Math.min(100, (displayPoints / targetPoints) * 100) : 0
    const c = getCompeteColors(targetPct, targetReached)

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* ═══════════════════════════════════════════════
                COMPETE WITH M — competitive box
            ═══════════════════════════════════════════════ */}
            {targetPoints > 0 && (
                <Box sx={{
                    p: { xs: 3, md: 2.5 },
                    borderRadius: '16px',
                    border: `2px solid ${c.border}`,
                    background: c.bg,
                    boxShadow: `0 16px 40px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.6s ease',
                }}>
                    {/* Ambient glow */}
                    <Box sx={{
                        position: 'absolute',
                        top: -40,
                        right: -40,
                        width: 140,
                        height: 140,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${c.glow}, transparent 70%)`,
                        filter: 'blur(30px)',
                        transition: 'all 0.6s ease',
                    }} />

                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        {/* Header — text gets room, icon is bigger */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{
                                    fontFamily: "'EB Garamond', serif",
                                    fontSize: { xs: '1.3rem', md: '1.5rem' },
                                    fontWeight: 700,
                                    color: '#fff',
                                    lineHeight: 1.2,
                                    letterSpacing: '0.02em',
                                    wordBreak: 'break-word',
                                }}>
                                    Compete with M
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.78rem',
                                    color: 'rgba(255,255,255,0.4)',
                                    mt: 0.5,
                                    letterSpacing: '0.04em',
                                    lineHeight: 1.4,
                                }}>
                                    {targetReached ? 'Objective complete' : 'Reach the target score'}
                                </Typography>
                            </Box>

                            {/* Bigger icon container */}
                            <Box sx={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                mt: 0.25,
                            }}>
                                {targetReached ? (
                                    <CheckCircle sx={{ fontSize: 28, color: c.icon }} />
                                ) : (
                                    <Whatshot sx={{ fontSize: 28, color: c.icon }} />
                                )}
                            </Box>
                        </Box>

                        {/* Target score */}
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: '0.75rem',
                                color: 'rgba(255,255,255,0.4)',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                mb: 1,
                            }}>
                                Target Score
                            </Typography>
                            <Typography sx={{
                                fontFamily: 'Jost, sans-serif',
                                fontSize: { xs: adaptiveScoreSize(targetPoints, 2.4), md: adaptiveScoreSize(targetPoints, 2.8) },
                                fontWeight: 800,
                                color: targetReached ? c.accent : '#fff',
                                lineHeight: 1,
                                transition: 'color 0.5s ease, font-size 0.3s ease',
                                textShadow: targetReached ? `0 0 24px ${c.glow}` : 'none',
                                whiteSpace: 'nowrap',
                            }}>
                                {targetPoints.toLocaleString()}
                            </Typography>
                        </Box>

                        {/* Progress bar */}
                        <Box sx={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden', mb: 1 }}>
                            <Box sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${targetPct}%`,
                                background: c.bar,
                                borderRadius: '999px',
                                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: `0 0 14px ${c.barGlow}`,
                            }} />
                        </Box>

                        {/* Percentage */}
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: '0.9rem',
                            color: c.accent,
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                        }}>
                            {Math.round(targetPct)}%
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* ═══════════════════════════════════════════════
                TOTAL POINTS — with +X pop-up
            ═══════════════════════════════════════════════ */}
            <Box sx={{
                textAlign: 'center',
                p: 2.5,
                background: '#fff',
                border: '1px solid rgba(184,134,11,0.15)',
                borderRadius: '10px',
            }}>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9e8a7a',
                    mb: 1.5,
                }}>
                    Total Points
                </Typography>

                {/* Points row with +X pop-up */}
                <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
                    <Box sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: adaptiveScoreSize(displayPoints, 2.8),
                        fontWeight: 800,
                        color: '#b8860b',
                        lineHeight: 1,
                        textShadow: '0 2px 12px rgba(184,134,11,0.15)',
                        transition: 'font-size 0.3s ease',
                        whiteSpace: 'nowrap',
                    }}>
                        {displayPoints.toLocaleString()}
                    </Box>

                    <AnimatePresence>
                        {lastPoints !== null && (
                            <motion.div
                                key={pointsAnimKey}
                                initial={{ opacity: 0, y: 8, x: 0 }}
                                animate={{ opacity: 1, y: -4, x: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.9, ease: 'easeOut' }}
                                style={{
                                    position: 'absolute',
                                    left: '100%',
                                    top: '50%',
                                    marginLeft: 8,
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: '#43a047',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                }}
                            >
                                +{lastPoints}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>

                {/* Always render multipliers */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <MultiplierGrid
                        label="Rating"
                        values={[0.0, 0.6, 1.0, 1.4]}
                        activeValue={multipliers?.rating ?? -1}
                        colors={RATING_COLORS}
                    />
                    <MultiplierGrid
                        label="Time"
                        values={[0.5, 0.8, 1.0, 1.2]}
                        activeValue={multipliers?.time ?? -1}
                        colors={TIME_COLORS}
                    />
                    <MultiplierGrid
                        label="Difficulty"
                        values={[1.5, 1.7, 1.9, 2.1, 2.3, 2.5]}
                        activeValue={snappedDifficulty}
                        colors={DIFFICULTY_COLORS}
                    />
                    <StreakBar value={multipliers?.streak ?? 1.0} />
                </Box>
            </Box>
        </Box>
    )
}