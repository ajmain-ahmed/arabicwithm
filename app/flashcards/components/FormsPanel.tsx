'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import type { FormRow } from '@/app/actions/vocab'

const FORM_TYPE_LABELS: Record<string, string> = {
    past: 'Past',
    present: 'Present',
    verbal_noun: 'Verbal Noun',
    active_participle: 'Active Participle',
    passive_participle: 'Passive Participle',
}

interface FormsPanelProps {
    forms: FormRow[]
    showDiacritics: boolean
    textScale: number
}

export default function FormsPanel({ forms, showDiacritics, textScale }: FormsPanelProps) {
    if (!forms || forms.length === 0) {
        return (
            <Box sx={{
                background: 'rgba(245,237,224,0.4)',
                border: '1px solid rgba(184,134,11,0.12)',
                borderRadius: '10px',
                p: { xs: '1rem', md: '1.25rem 1.5rem' },
                mb: { xs: '0.75rem', md: '0.25rem' },
                textAlign: 'center',
            }}>
                <Typography sx={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: `calc(0.85rem * ${textScale})`,
                    fontWeight: 500,
                    color: '#6b5f55',
                }}>
                    No forms available for this word.
                </Typography>
            </Box>
        )
    }

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
                mb: 1.5,
            }}>
                Forms
            </Typography>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.5,
            }}>
                {forms.map((form, i) => (
                    <Box key={i} sx={{
                        background: '#fff',
                        border: '1px solid rgba(184,134,11,0.1)',
                        borderRadius: '8px',
                        p: { xs: '0.875rem', md: '1rem' },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                    }}>
                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: `calc(0.65rem * ${textScale})`,
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#6b5f55',
                        }}>
                            {FORM_TYPE_LABELS[form.type] ?? form.type}
                        </Typography>

                        <Typography sx={{
                            fontFamily: "'EB Garamond', serif",
                            fontSize: `calc(1.5rem * ${textScale})`,
                            fontWeight: 700,
                            color: '#2c1a0e',
                            direction: 'rtl',
                            textAlign: 'right',
                            lineHeight: 1.3,
                        }}>
                            {showDiacritics ? form.con_di : form.con_ar}
                        </Typography>

                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: `calc(0.85rem * ${textScale})`,
                            color: '#b8860b',
                            lineHeight: 1.3,
                        }}>
                            {form.con_tr}
                        </Typography>

                        <Typography sx={{
                            fontFamily: 'Jost, sans-serif',
                            fontSize: `calc(0.9rem * ${textScale})`,
                            color: '#7a6e65',
                            lineHeight: 1.3,
                        }}>
                            {form.con_en}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
