'use client'

import { Box, Typography, Fade } from '@mui/material'

export default function AnimatedArabicWord({ word, wordDiacritic, showDiacritics, textScale }: {
    word: string; wordDiacritic: string; showDiacritics: boolean; textScale: number
}) {
    const scaledSize = (size: number) => `${size * textScale}rem`
    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            <Fade in={!showDiacritics} timeout={300} unmountOnExit>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: { xs: scaledSize(3.2), md: scaledSize(3.8) },
                        fontWeight: 700, direction: 'rtl', textAlign: 'center', color: '#2c1a0e', lineHeight: 1.2,
                    }}>{word}</Typography>
                </Box>
            </Fade>
            <Fade in={showDiacritics} timeout={300} unmountOnExit>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{
                        fontFamily: "'EB Garamond', serif",
                        fontSize: { xs: scaledSize(3.2), md: scaledSize(3.8) },
                        fontWeight: 700, direction: 'rtl', textAlign: 'center', color: '#0e2e1f', lineHeight: 1.2,
                    }}>{wordDiacritic}</Typography>
                </Box>
            </Fade>
        </Box>
    )
}
