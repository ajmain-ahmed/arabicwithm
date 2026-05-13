'use client'

import { Box, Container, Typography, IconButton } from '@mui/material'
import { HelpOutlineRounded, Settings, Star } from '@mui/icons-material'
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
    return (
        <Box component="main" sx={{ background: '#faf7f2', minHeight: '100vh', pt: { xs: 8, sm: 10 } }}>
            <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { sm: '1.6rem', md: '2rem' }, fontWeight: 700, color: '#2c1a0e' }}>Word Bank</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <DesktopTextScaleSlider textScale={textScale} onChange={onTextScaleChange} />
                        <PillToggle enabled={showDiacritics} onToggle={onDiacriticsToggle} label={showDiacritics ? 'Hide diacritics' : 'Show diacritics'} activeColor="#b8860b" />
                        <IconButton onClick={onInfoClick} size="small" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}><HelpOutlineRounded sx={{ fontSize: '1rem' }} /></IconButton>
                    </Box>
                </Box>

                <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#2c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, mr: 1 }}>Word Bank</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Star sx={{ fontSize: 18, color: '#b8860b' }} />
                            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#b8860b' }}>
                                {displayPoints}
                            </Typography>
                        </Box>
                        <IconButton onClick={onSettingsClick} size="small" sx={{ width: 32, height: 32, border: '1px solid rgba(122,110,101,0.3)', borderRadius: '50%', color: '#7a6e65', flexShrink: 0 }}><Settings sx={{ fontSize: '1rem' }} /></IconButton>
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
    )
}
