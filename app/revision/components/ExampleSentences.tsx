'use client'

import { Box, Typography } from '@mui/material'

interface Example {
    arabic: string
    diacritic: string
    english: string
}

export default function ExampleSentences({ examples, showDiacritics, textScale }: {
    examples: Example[]; showDiacritics: boolean; textScale: number
}) {
    if (examples.length === 0) return null
    return (
        <Box sx={{ background: 'rgba(245,237,224,0.5)', borderRadius: '8px', padding: { xs: '1rem', sm: '1.25rem' }, borderLeft: '3px solid #b8860b', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {examples.map((ex, i) => (
                <Box key={i} sx={{ ...(i > 0 && { borderTop: '1px solid rgba(184,134,11,0.12)', pt: 1.5 }) }}>
                    <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: { xs: `calc(1.2rem * ${textScale})`, sm: `calc(1.35rem * ${textScale})` }, color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.5, mb: 0.35 }}>
                        {showDiacritics ? ex.diacritic : ex.arabic}
                    </Typography>
                    <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: { xs: `calc(0.9rem * ${textScale})`, sm: `calc(1rem * ${textScale})` }, color: '#7a6e65', fontStyle: 'italic', textAlign: 'left', lineHeight: 1.5 }}>
                        {ex.english}
                    </Typography>
                </Box>
            ))}
        </Box>
    )
}
