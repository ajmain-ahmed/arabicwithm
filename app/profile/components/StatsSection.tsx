'use client'

import { Box, Fade, Grid, Typography } from '@mui/material'
import { type ProfileData, type LevelStat } from '@/app/actions/profile'
import ChartSection from './ChartSection'
import LevelCard from './LevelCard'

interface StatsSectionProps {
    profile: ProfileData
    chartLevel: LevelStat | null
    selectedLevelCode: string | null
    onCardClick: (code: string) => void
}

export default function StatsSection({ profile, chartLevel, selectedLevelCode, onCardClick }: StatsSectionProps) {
    return (
        <Box>
            <Fade in timeout={400}>
                <Box>
                    <ChartSection level={chartLevel} />
                </Box>
            </Fade>

            <Box sx={{ mb: { xs: 2.5, md: 3 } }}>
                <Typography
                    sx={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: { xs: '1.5rem', md: '2rem' },
                        fontWeight: 700,
                        color: 'var(--awm-bark)',
                    }}
                >
                    Levels
                </Typography>
                <Typography
                    sx={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: { xs: '0.85rem', md: '0.95rem' },
                        color: 'var(--awm-muted)',
                        mt: 0.5,
                    }}
                >
                    Click a card to filter the overview
                </Typography>
            </Box>

            <Fade in timeout={600}>
                <Grid container spacing={3}>
                    {profile.levels.map((level) => (
                        <Grid key={level.code} size={{ xs: 12, sm: 6, lg: 4 }}>
                            <LevelCard
                                level={level}
                                isSelected={selectedLevelCode === level.code}
                                onClick={() => onCardClick(level.code)}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Fade>
        </Box>
    )
}
