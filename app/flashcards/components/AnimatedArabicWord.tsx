'use client'

import React from 'react'
import { Box, Fade, Typography } from '@mui/material'

interface AnimatedArabicWordProps {
    word: string
    wordDiacritic: string
    showDiacritics: boolean
    textScale: number
}

function AnimatedArabicWord({ word, wordDiacritic, showDiacritics, textScale }: AnimatedArabicWordProps) {
    const scaledSize = (size: number) => `${size * textScale}rem`
    return (
        <Box sx={{
            position: 'relative', textAlign: 'center', margin: '0.5rem 0 1.5rem',
            height: { xs: `calc(3.2rem * ${textScale})`, md: `calc(4.5rem * ${textScale})` },
        }}>
            <Fade in={!showDiacritics} timeout={300} unmountOnExit>
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: { xs: scaledSize(2.4), md: scaledSize(3.8) },
                    fontWeight: 700, direction: 'rtl', textAlign: 'center',
                    color: '#2c1a0e', lineHeight: 1.2,
                    position: 'absolute', top: 0, left: 0, right: 0,
                }}>{word}</Typography>
            </Fade>
            <Fade in={showDiacritics} timeout={300} unmountOnExit>
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: { xs: scaledSize(2.4), md: scaledSize(3.8) },
                    fontWeight: 700, direction: 'rtl', textAlign: 'center',
                    color: '#0e2e1f', lineHeight: 1.2,
                    position: 'absolute', top: 0, left: 0, right: 0,
                }}>{wordDiacritic}</Typography>
            </Fade>
        </Box>
    )
}

export default React.memo(AnimatedArabicWord)
