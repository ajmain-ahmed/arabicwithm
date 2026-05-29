'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import { stripDiacritics } from '@/app/lib/arabic'
import type { VocabRow } from '@/app/actions/vocab'

interface DefinitionPanelProps {
    card: VocabRow
    showDiacritics: boolean
    textScale: number
}

function DefinitionPanel({ card, showDiacritics, textScale }: DefinitionPanelProps) {
    const hasDef = card.def_ar || card.def_tr || card.def_en
    if (!hasDef) return null

    const defArDisplay = showDiacritics
        ? (card.def_ar ?? '')
        : stripDiacritics(card.def_ar ?? '')

    return (
        <Box sx={{
            background: 'rgba(245,237,224,0.4)',
            border: '1px solid rgba(184,134,11,0.12)',
            borderRadius: '10px',
            p: { xs: '1rem', md: '1.25rem 1.5rem' },
            mb: { xs: '0.75rem', md: '0.25rem' },
        }}>
            <Typography sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: `calc(0.7rem * ${textScale})`,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#b8860b',
                mb: 1,
            }}>
                Definition
            </Typography>

            {card.def_ar && (
                <Typography sx={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: `calc(1.35rem * ${textScale})`,
                    color: '#2c1a0e',
                    direction: 'rtl',
                    textAlign: 'right',
                    lineHeight: 1.5,
                    mb: 0.5,
                }}>
                    {defArDisplay}
                </Typography>
            )}

            {card.def_tr && (
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: `calc(0.9rem * ${textScale})`,
                    color: '#6b5f55',
                    textAlign: 'left',
                    lineHeight: 1.5,
                    mb: 0.5,
                }}>
                    {card.def_tr}
                </Typography>
            )}

            {card.def_en && (
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: `calc(1rem * ${textScale})`,
                    color: '#7a6e65',
                    textAlign: 'left',
                    lineHeight: 1.5,
                }}>
                    {card.def_en}
                </Typography>
            )}
        </Box>
    )
}

export default React.memo(DefinitionPanel)
