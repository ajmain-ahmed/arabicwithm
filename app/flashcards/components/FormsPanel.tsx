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
      <Box
        sx={{
          background: 'rgba(245,237,224,0.4)',
          border: '1px solid rgba(184,134,11,0.12)',
          borderRadius: '10px',
          p: { xs: '1rem', md: '1.25rem 1.5rem' },
          mb: { xs: '0.75rem', md: '0.25rem' },
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: `calc(0.95rem * ${textScale})`,
            fontWeight: 500,
            color: '#6b5f55',
          }}
        >
          No forms available for this word.
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: { xs: 1.5, md: 2 },
      }}
    >
      {forms.map((form, i) => {
        const label =
          FORM_TYPE_LABELS[form.type] ??
          form.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

        return (
          <Box
            key={i}
            sx={{
              background: '#fff',
              border: '1px solid rgba(184,134,11,0.12)',
              borderRadius: '12px',
              p: { xs: '1rem 1.25rem', md: '1.25rem 1.5rem' },
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 0.75, md: 1 },
              boxShadow: '0 1px 3px rgba(44,26,14,0.04)',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: `calc(0.75rem * ${textScale})`,
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: '#b8860b',
                textTransform: 'capitalize',
              }}
            >
              {label}
            </Typography>

            <Typography
              sx={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: `calc(1.6rem * ${textScale})`,
                fontWeight: 700,
                color: '#2c1a0e',
                direction: 'rtl',
                textAlign: 'right',
                lineHeight: 1.3,
              }}
            >
              {showDiacritics ? form.con_di : form.con_ar}
            </Typography>

            {form.con_tr && (
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: `calc(0.95rem * ${textScale})`,
                  color: '#9e8a7a',
                  letterSpacing: '0.03em',
                  lineHeight: 1.3,
                }}
              >
                {form.con_tr}
              </Typography>
            )}

            {form.con_en && (
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: `calc(0.95rem * ${textScale})`,
                  color: '#7a6e65',
                  lineHeight: 1.3,
                }}
              >
                {form.con_en}
              </Typography>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
