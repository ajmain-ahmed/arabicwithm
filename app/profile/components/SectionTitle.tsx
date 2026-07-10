'use client'

import { Box, Typography } from '@mui/material'

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography variant="overline" sx={{ mb: 1 }}>
            {children}
        </Typography>
    )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                fontFamily: 'var(--font-serif)',
                fontSize: { xs: '1.4rem', md: '1.6rem' },
                fontWeight: 600,
                color: 'var(--awm-bark)',
                lineHeight: 1.2,
                mb: 3,
            }}
        >
            {children}
        </Typography>
    )
}

export function HeroDivider() {
    return (
        <Box
            sx={{
                height: '1px',
                background: 'color-mix(in srgb, var(--awm-gold) 18%, transparent)',
                my: 1,
            }}
        />
    )
}
