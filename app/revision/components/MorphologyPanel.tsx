'use client'

import { Box, Typography } from '@mui/material'
import type { RevisionCard } from '@/app/actions/revision'

function parseForms(formsJson: any): { type: string; conjugations: Record<string, any> }[] {
  if (!formsJson) return []
  const parsed = typeof formsJson === 'string' ? JSON.parse(formsJson) : formsJson
  if (!Array.isArray(parsed)) return []
  return parsed
}

export default function MorphologyPanel({ card, textScale }: {
  card: RevisionCard; textScale: number
}) {
  const forms = parseForms((card as any).forms)
  const root = card.root

  if (!root && forms.length === 0) return null

  return (
    <Box sx={{ background: 'rgba(245,237,224,0.4)', border: '1px solid rgba(184,134,11,0.12)', borderRadius: '10px', p: { xs: '1rem', md: '1.25rem 1.5rem' }, mb: { xs: '0.75rem', md: '0.25rem' } }}>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.7rem * ${textScale})`, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b8860b', mb: 1.5 }}>
        Word Family
      </Typography>

      {root && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.75rem * ${textScale})`, color: '#9e8a7a', mb: 0.5 }}>
            Root
          </Typography>
          <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: `calc(1.5rem * ${textScale})`, fontWeight: 700, color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.3 }}>
            {root}
          </Typography>
        </Box>
      )}

      {forms.map((form, i) => (
        <Box key={i} sx={{ ...(i > 0 && { mt: 2, pt: 2, borderTop: '1px solid rgba(184,134,11,0.1)' }) }}>
          <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.75rem * ${textScale})`, color: '#9e8a7a', textTransform: 'capitalize', mb: 1 }}>
            {form.type}
          </Typography>
          {form.conjugations && Object.entries(form.conjugations).map(([tense, data]) => {
            if (!data || typeof data !== 'object') return null
            const entries = Array.isArray(data) ? data : [data]
            return (
              <Box key={tense} sx={{ mb: 1.5 }}>
                <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.7rem * ${textScale})`, fontWeight: 600, color: '#7a6e65', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.75 }}>
                  {tense}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {entries.map((entry: any, idx: number) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: `calc(1.15rem * ${textScale})`, color: '#2c1a0e', direction: 'rtl', lineHeight: 1.4 }}>
                        {entry.con_ar ?? entry.ar ?? ''}
                      </Typography>
                      {entry.con_en && (
                        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.85rem * ${textScale})`, color: '#7a6e65' }}>
                          {entry.con_en}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}
