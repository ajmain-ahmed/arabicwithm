'use client'

import { Box, Typography } from '@mui/material'
import type { RevisionCard } from '@/app/actions/revision'

const TENSE_LABELS: Record<string, string> = {
  past: 'Past',
  present: 'Present',
  verbal_noun: 'Verbal Noun',
  active_participle: 'Active Participle',
  passive_participle: 'Passive Participle',
}

function parseForms(formsJson: any): { type: string; conjugations: Record<string, any> }[] {
  if (!formsJson) return []
  const parsed = typeof formsJson === 'string' ? JSON.parse(formsJson) : formsJson
  if (!Array.isArray(parsed)) return []
  return parsed
}

export default function MorphologyPanel({
  card,
  showDiacritics,
  textScale,
}: {
  card: RevisionCard
  showDiacritics: boolean
  textScale: number
}) {
  const forms = parseForms((card as any).forms)

  if (forms.length === 0) return null

  const allConjugations: { key: string; label: string; entry: any }[] = []

  for (const form of forms) {
    if (form.conjugations && typeof form.conjugations === 'object') {
      for (const [tense, data] of Object.entries(form.conjugations)) {
        if (!data || typeof data !== 'object') continue
        const entries = Array.isArray(data) ? data : [data]
        for (const entry of entries) {
          allConjugations.push({
            key: tense,
            label: TENSE_LABELS[tense] ?? tense.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            entry,
          })
        }
      }
    }
  }

  if (allConjugations.length === 0) return null

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: { xs: 1.5, md: 2 },
      }}
    >
      {allConjugations.map((item, i) => {
        const ar = showDiacritics
          ? (item.entry.con_di ?? item.entry.con_ar ?? '')
          : (item.entry.con_ar ?? '')
        const tr = item.entry.con_tr ?? ''
        const en = item.entry.con_en ?? ''

        return (
          <Box
            key={`${item.key}-${i}`}
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
              {item.label}
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
              {ar}
            </Typography>

            {tr && (
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: `calc(0.95rem * ${textScale})`,
                  color: '#9e8a7a',
                  letterSpacing: '0.03em',
                  lineHeight: 1.3,
                }}
              >
                {tr}
              </Typography>
            )}

            {en && (
              <Typography
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: `calc(0.95rem * ${textScale})`,
                  color: '#7a6e65',
                  lineHeight: 1.3,
                }}
              >
                {en}
              </Typography>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
