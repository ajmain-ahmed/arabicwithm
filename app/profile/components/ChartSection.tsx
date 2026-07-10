'use client'

import { Box, Typography } from '@mui/material'
import { type LevelStat } from '@/app/actions/profile'

export default function ChartSection({ level }: { level: LevelStat | null }) {
    if (!level) return null

    const total = level.totalWords
    const label = level.code === 'ALL' ? 'All Levels' : `${level.label} (${level.code})`

    return (
        <Box
            sx={{
                background: 'var(--awm-white)',
                border: '1px solid color-mix(in srgb, var(--awm-gold) 15%, transparent)',
                borderRadius: 'var(--awm-radius-md)',
                p: { xs: 3, md: 4 },
                mb: { xs: 3, md: 4 },
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                gap: { xs: 3, md: 5 },
            }}
        >
            <Box sx={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="var(--awm-gold)"
                        strokeOpacity={0.12}
                        strokeWidth={3}
                        strokeDashoffset="0"
                    />
                </svg>
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                    }}
                >
                    <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--awm-bark)' }}>
                        {total.toLocaleString()}
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            color: 'var(--awm-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                        }}
                    >
                        words
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ flex: 1, width: '100%' }}>
                <Typography
                    sx={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: 'var(--awm-bark)',
                        mb: 0.5,
                    }}
                >
                    {label}
                </Typography>
                <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--awm-muted)', mb: 2.5 }}>
                    {level.totalThemes} themes
                </Typography>

                <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, mt: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 'var(--awm-radius-none)', background: 'var(--awm-forest)' }} />
                        <Typography sx={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--awm-muted)' }}>
                            Explore vocabulary by theme
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
