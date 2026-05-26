'use client'

import { Box, Typography } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import type { MultiplierData } from '../types'

export default function SentencePointsPanel({
    displayPoints,
    multipliers,
    lastPoints,
    pointsAnimKey,
}: {
    displayPoints: number
    multipliers: MultiplierData | null
    lastPoints: number | null
    pointsAnimKey: number
}) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Total Points */}
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

                <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
                    <Box sx={{
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '2.8rem',
                        fontWeight: 800,
                        color: '#b8860b',
                        lineHeight: 1,
                        textShadow: '0 2px 12px rgba(184,134,11,0.15)',
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

                {/* Multipliers display */}
                {multipliers && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {([
                            { label: 'Rating', value: multipliers.rating, color: multipliers.rating === 0 ? '#c62828' : multipliers.rating < 1 ? '#e65100' : multipliers.rating > 1 ? '#1565c0' : '#2e7d32' },
                            { label: 'Time', value: multipliers.time, color: multipliers.time >= 1 ? '#2e7d32' : '#b8860b' },
                            { label: 'Difficulty', value: multipliers.difficulty, color: '#b8860b' },
                            { label: 'Streak', value: multipliers.streak, color: '#d4a843' },
                        ]).map(m => (
                            <Box key={m.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.75rem',
                                    color: '#7a6e65',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                }}>
                                    {m.label}
                                </Typography>
                                <Typography sx={{
                                    fontFamily: 'Jost, sans-serif',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: m.color,
                                }}>
                                    {m.value.toFixed(1)}x
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    )
}
