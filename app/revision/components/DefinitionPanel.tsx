'use client'

import { Box, Typography } from '@mui/material'
import type { RevisionCard } from '@/app/actions/revision'

export default function DefinitionPanel({ card, showDiacritics, textScale }: {
    card: RevisionCard; showDiacritics: boolean; textScale: number
}) {
    const hasDef = card.def_ar || card.def_tr || card.def_en
    if (!hasDef) return null
    const stripDia = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, '')
    const defArDisplay = showDiacritics ? (card.def_ar ?? '') : stripDia(card.def_ar ?? '')
    return (
        <Box sx={{ background: 'rgba(245,237,224,0.4)', border: '1px solid rgba(184,134,11,0.12)', borderRadius: '10px', p: { xs: '1rem', md: '1.25rem 1.5rem' }, mb: { xs: '0.75rem', md: '0.25rem' } }}>
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.7rem * ${textScale})`, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b8860b', mb: 1 }}>Definition</Typography>
            {card.def_ar && <Typography sx={{ fontFamily: "'EB Garamond', serif", fontSize: `calc(1.35rem * ${textScale})`, color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.5, mb: 0.5 }}>{defArDisplay}</Typography>}
            {card.def_tr && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.9rem * ${textScale})`, color: '#9e8a7a', textAlign: 'left', lineHeight: 1.5, mb: 0.5 }}>{card.def_tr}</Typography>}
            {card.def_en && <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(1rem * ${textScale})`, color: '#7a6e65', textAlign: 'left', lineHeight: 1.5 }}>{card.def_en}</Typography>}
        </Box>
    )
}
