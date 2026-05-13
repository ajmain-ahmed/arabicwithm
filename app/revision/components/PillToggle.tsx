'use client'

import { Box, Typography } from '@mui/material'

export default function PillToggle({ enabled, onToggle, label, activeColor = '#b8860b' }: {
    enabled: boolean; onToggle: () => void; label: string; activeColor?: string
}) {
    return (
        <Box onClick={onToggle} sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            cursor: 'pointer', userSelect: 'none',
            padding: '5px 12px 5px 6px', borderRadius: '999px',
            border: '1px solid',
            borderColor: enabled ? activeColor : 'rgba(122,110,101,0.25)',
            background: enabled ? `${activeColor}14` : 'transparent',
            transition: 'all 0.15s',
            '&:hover': { borderColor: activeColor, background: `${activeColor}0d` },
            minWidth: 172, justifyContent: 'center',
        }}>
            <Box sx={{
                width: 28, height: 16, borderRadius: '999px',
                background: enabled ? activeColor : 'rgba(122,110,101,0.2)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}>
                <Box sx={{
                    position: 'absolute', top: '2px',
                    left: enabled ? '14px' : '2px',
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </Box>
            <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.95rem' },
                fontWeight: 500, color: enabled ? activeColor : '#7a6e65',
                whiteSpace: 'nowrap', lineHeight: 1, transition: 'color 0.15s',
            }}>
                {label}
            </Typography>
        </Box>
    )
}
