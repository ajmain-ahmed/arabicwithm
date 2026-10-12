'use client'

import { useState } from 'react'
import { ExpandLess, ExpandMore, Visibility, VisibilityOff } from '@mui/icons-material'
import { Box, Button, Collapse, IconButton, Tooltip, Typography } from '@mui/material'
import { normalizePuzzleArabic, type WordSearchPlacement } from '@/app/lib/transcriptPuzzles'

export default function WordSearchClues({
  words,
  foundIds,
  sourceLabel,
  onReveal,
}: {
  words: readonly WordSearchPlacement[]
  foundIds: ReadonlySet<string>
  sourceLabel: string
  onReveal: () => void
}) {
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const toggleReveal = (id: string) => {
    setRevealed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        onReveal()
      }
      return next
    })
  }

  return (
    <Box component="ol" sx={{ m: 0, mt: 1.5, pl: 2.5, display: 'grid', gap: 1 }}>
      {words.map((word) => {
        const wordRevealed = revealed.has(word.id)
        const contextExpanded = expanded.has(word.id)
        const found = foundIds.has(word.id)
        const differentSurface = normalizePuzzleArabic(word.surfaceForm) !== normalizePuzzleArabic(word.lemma)
        return (
          <Box component="li" key={word.id} sx={{ minWidth: 0, pl: 0.25, py: 0.4 }}>
            <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere', color: found ? 'success.main' : 'text.primary', fontFamily: 'Jost, sans-serif', fontWeight: found ? 700 : 500, textDecoration: found ? 'line-through' : 'none' }}>
                {word.english}
              </Typography>
              <Tooltip title={wordRevealed ? 'Hide Arabic' : 'Show Arabic'}>
                <IconButton
                  type="button"
                  onClick={() => toggleReveal(word.id)}
                  aria-label={`${wordRevealed ? 'Hide' : 'Show'} Arabic for ${word.english}`}
                  size="small"
                  sx={{ width: 40, height: 40, flexShrink: 0, color: 'secondary.main' }}
                >
                  {wordRevealed ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
            {wordRevealed && (
              <Box sx={{ animation: 'awm-clue-reveal .18s ease-out', '@keyframes awm-clue-reveal': { from: { opacity: 0, transform: 'translateY(-3px)' }, to: { opacity: 1, transform: 'translateY(0)' } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
                <Typography lang="ar" dir="rtl" sx={{ mt: 0.1, color: 'primary.main', fontFamily: 'var(--font-book-naskh), serif', fontSize: 20, fontWeight: 700, lineHeight: 1.35, textAlign: 'right' }}>
                  {word.lemma}
                </Typography>
                {differentSurface && (
                  <Typography sx={{ mt: 0.2, color: 'text.secondary', fontFamily: 'Jost, sans-serif', fontSize: 11.5 }}>
                    Seen as <Box component="span" lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-book-naskh), serif', fontSize: 15 }}>{word.surfaceForm}</Box>
                  </Typography>
                )}
              </Box>
            )}
            {word.context?.sentenceArabic && (
              <>
                <Button
                  type="button"
                  size="small"
                  color="secondary"
                  onClick={() => setExpanded((current) => {
                    const next = new Set(current)
                    if (next.has(word.id)) next.delete(word.id)
                    else next.add(word.id)
                    return next
                  })}
                  endIcon={contextExpanded ? <ExpandLess /> : <ExpandMore />}
                  sx={{ mt: 0.15, minHeight: 32, px: 0, fontSize: 11, textTransform: 'none' }}
                >
                  {contextExpanded ? 'Hide example' : 'View example'}
                </Button>
                <Collapse in={contextExpanded} unmountOnExit>
                  <Box sx={{ mt: 0.4, p: 1, borderRadius: '8px', bgcolor: 'action.hover' }}>
                    <Typography lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-book-naskh), serif', fontSize: 17, lineHeight: 1.55, textAlign: 'right' }}>
                      {word.context.sentenceArabic}
                    </Typography>
                    {word.context.translation && <Typography sx={{ mt: 0.35, color: 'text.secondary', fontFamily: 'Jost, sans-serif', fontSize: 11.5, lineHeight: 1.45 }}>{word.context.translation}</Typography>}
                    <Typography sx={{ mt: 0.45, color: 'text.secondary', fontFamily: 'Jost, sans-serif', fontSize: 10.5 }}>{sourceLabel}</Typography>
                  </Box>
                </Collapse>
              </>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
