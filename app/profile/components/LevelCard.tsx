'use client'

import { Box, LinearProgress, Typography } from '@mui/material'
import { type LevelStat } from '@/app/actions/profile'

interface LevelCardProps {
    level: LevelStat
    isSelected: boolean
    onClick: () => void
}

export default function LevelCard({ level, isSelected, onClick }: LevelCardProps) {
    return (
        <Box
            onClick={onClick}
            sx={{
                background: 'var(--awm-white)',
                border: '2px solid',
                borderColor: isSelected ? 'var(--awm-gold)' : 'color-mix(in srgb, var(--awm-gold) 18%, transparent)',
                borderRadius: 'var(--awm-radius-md)',
                p: { xs: 2.5, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 8px 24px color-mix(in srgb, var(--awm-gold) 12%, transparent)' : 'none',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px color-mix(in srgb, var(--awm-bark) 8%, transparent)',
                    borderColor: isSelected ? 'var(--awm-gold)' : 'color-mix(in srgb, var(--awm-gold) 35%, transparent)',
                },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography
                        sx={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--awm-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}
                    >
                        {level.label}
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1.6rem',
                            fontWeight: 700,
                            color: 'var(--awm-bark)',
                            lineHeight: 1.2,
                            mt: 0.25,
                        }}
                    >
                        {level.code}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        width: 50,
                        height: 50,
                        borderRadius: 'var(--awm-radius-pill)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected
                            ? 'color-mix(in srgb, var(--awm-gold) 12%, transparent)'
                            : 'color-mix(in srgb, var(--awm-gold) 8%, transparent)',
                    }}
                >
                    <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 700, color: 'var(--awm-gold)' }}>
                        {level.totalWords}
                    </Typography>
                </Box>
            </Box>

            <LinearProgress
                variant="determinate"
                value={0}
                sx={{
                    height: 6,
                    borderRadius: 'var(--awm-radius-pill)',
                    backgroundColor: 'color-mix(in srgb, var(--awm-gold) 10%, transparent)',
                    '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, var(--awm-gold), var(--awm-gold-light))',
                        borderRadius: 'var(--awm-radius-pill)',
                    },
                }}
            />

            <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, pt: 0.5 }}>
                <Box>
                    <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--awm-muted)', fontWeight: 500 }}>
                        Words
                    </Typography>
                    <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--awm-bark)' }}>
                        {level.totalWords}
                    </Typography>
                </Box>
                <Box>
                    <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--awm-muted)', fontWeight: 500 }}>
                        Themes
                    </Typography>
                    <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--awm-bark)' }}>
                        {level.totalThemes}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ mt: 'auto', pt: 0.5 }}>
                <Typography
                    sx={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.78rem',
                        color: 'var(--awm-muted)',
                        textAlign: 'center',
                    }}
                >
                    {isSelected ? 'Click again to show all stats' : 'Click to view stats'}
                </Typography>
            </Box>
        </Box>
    )
}
