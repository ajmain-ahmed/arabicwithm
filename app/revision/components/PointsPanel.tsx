'use client'

import { Box, Typography } from '@mui/material'

export default function PointsPanel({ displayPoints, multipliers }: { displayPoints: number; multipliers: { difficulty: string; time: string; rating: string; streak: string } | null }) {
    return (
        <Box sx={{ position: 'sticky', top: 80, textAlign: 'center', p: 2, background: '#fff', border: '1px solid rgba(184,134,11,0.15)', borderRadius: '10px' }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e8a7a', mb: 1 }}>
                Total Points
            </Typography>
            <Box sx={{ fontFamily: 'Jost, sans-serif', fontSize: '2.5rem', fontWeight: 800, color: '#b8860b', lineHeight: 1, mb: 1 }}>
                {displayPoints}
            </Box>
            {multipliers && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 2 }}>
                    {[
                        { label: 'Difficulty', value: multipliers.difficulty },
                        { label: 'Time', value: multipliers.time },
                        { label: 'Rating', value: multipliers.rating },
                        { label: 'Streak', value: multipliers.streak },
                    ].map(m => (
                        <Box key={m.label} sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', color: '#9e8a7a' }}>{m.label}</Typography>
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', fontWeight: 600, color: '#b8860b' }}>{m.value}</Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    )
}
