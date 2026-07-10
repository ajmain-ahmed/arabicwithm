'use client'

import { Box } from '@mui/material'

export default function GoldLine() {
    return (
        <Box
            sx={{
                height: '1px',
                background:
                    'linear-gradient(90deg, transparent, color-mix(in srgb, var(--awm-gold) 40%, transparent), transparent)',
                width: '100%',
            }}
        />
    )
}
