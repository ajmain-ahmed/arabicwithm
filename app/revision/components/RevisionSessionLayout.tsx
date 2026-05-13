'use client'

import { useState } from 'react'
import { Box, Container, Typography, IconButton, Dialog } from '@mui/material'
import { HelpOutlineRounded, Settings, Star, Close } from '@mui/icons-material'
import DesktopTextScaleSlider from './DesktopTextScaleSlider'
import PillToggle from './PillToggle'

export default function RevisionSessionLayout({
    children,
    sidePanel,
    textScale,
    onTextScaleChange,
    showDiacritics,
    onDiacriticsToggle,
    displayPoints,
    onInfoClick,
    onSettingsClick,
}: {
    children: React.ReactNode
    sidePanel: React.ReactNode
    textScale: number
    onTextScaleChange: (v: number) => void
    showDiacritics: boolean
    onDiacriticsToggle: () => void
    displayPoints: number
    onInfoClick: () => void
    onSettingsClick: () => void
}) {
    const [mobilePointsOpen, setMobilePointsOpen] = useState(false)

    return (
        <>
            <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
                <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
                    {/* Desktop header */}
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { sm: '1.6rem', md: '2rem' }, fontWeight: 700, color: '#2c1a0e' }}>Word Bank</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <DesktopTextScaleSlider textScale={textScale} onChange={onTextScaleChange} />
                            <PillToggle enabled={showDiacritics} onToggle={onDiacriticsToggle} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                            <IconButton onClick={onInfoClick} size="small" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}><HelpOutlineRounded sx={{ fontSize: '1rem' }} /></IconButton>
                        </Box>
                    </Box>

                    {/* Mobile header */}
                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
                        <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#2c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, mr: 1 }}>Word Bank</Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
                            {/* Rounded points pill button */}
                            <Box
                                onClick={() => setMobilePointsOpen(true)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.6,
                                    px: 1.6,
                                    py: 0.6,
                                    borderRadius: '999px',
                                    border: '1.5px solid rgba(184,134,11,0.35)',
                                    background: 'rgba(184,134,11,0.08)',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        background: 'rgba(184,134,11,0.14)',
                                        borderColor: 'rgba(184,134,11,0.55)',
                                        transform: 'translateY(-1px)',
                                    },
                                    '&:active': {
                                        transform: 'translateY(0)',
                                        background: 'rgba(184,134,11,0.18)',
                                    },
                                }}
                            >
                                <Star sx={{ fontSize: 16, color: '#b8860b' }} />
                                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#b8860b', lineHeight: 1 }}>
                                    {displayPoints.toLocaleString()}
                                </Typography>
                            </Box>

                            <IconButton onClick={onSettingsClick} size="small" sx={{ width: 36, height: 36, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}>
                                <Settings sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 200px' }, gap: { xs: 2, lg: 3 }, alignItems: 'start' }}>
                        <Box>
                            {children}
                        </Box>
                        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                            {sidePanel}
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* Mobile Points Breakdown Dialog */}
            <Dialog
                open={mobilePointsOpen}
                onClose={() => setMobilePointsOpen(false)}
                fullScreen
                slotProps={{
                    paper: {
                        sx: {
                            background: '#faf7f2',
                            display: 'flex',
                            flexDirection: 'column',
                        }
                    }
                }}
            >
                <Box sx={{ p: { xs: 2.5, sm: 3 }, flex: 1, overflow: 'auto' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Typography sx={{
                            fontFamily: "'EB Garamond', serif",
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: '#2c1a0e',
                        }}>
                            Score Breakdown
                        </Typography>
                        <IconButton
                            onClick={() => setMobilePointsOpen(false)}
                            size="small"
                            sx={{
                                width: 36,
                                height: 36,
                                border: '1px solid rgba(122,110,101,0.25)',
                                borderRadius: '50%',
                                color: '#7a6e65',
                            }}
                        >
                            <Close sx={{ fontSize: '1.1rem' }} />
                        </IconButton>
                    </Box>
                    {sidePanel}
                </Box>
            </Dialog>
        </>
    )
}