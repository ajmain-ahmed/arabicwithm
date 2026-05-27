'use client'

import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { PlayArrow } from '@mui/icons-material'

interface CartoonContext {
  show: string
  episode: string
  timestamp: number | null
  arabic: string
  english: string
}

let cache: Record<string, CartoonContext[]> | null = null
let fetching = false
let waiters: ((data: Record<string, CartoonContext[]>) => void)[] = []

async function loadContextMap(): Promise<Record<string, CartoonContext[]>> {
  if (cache) return cache
  if (fetching) {
    return new Promise(resolve => { waiters.push(resolve) })
  }
  fetching = true
  try {
    const res = await fetch('/cartoon-word-context.json')
    const data = await res.json()
    cache = data
    waiters.forEach(w => w(data))
    waiters = []
    return data
  } catch {
    return {}
  } finally {
    fetching = false
  }
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function CartoonContextPanel({ plainWord, textScale }: {
  plainWord: string
  textScale: number
}) {
  const [contexts, setContexts] = useState<CartoonContext[]>([])

  useEffect(() => {
    loadContextMap().then(map => {
      setContexts(map[plainWord] ?? [])
    })
  }, [plainWord])

  if (contexts.length === 0) return null

  return (
    <Box sx={{ background: 'rgba(14,46,31,0.03)', border: '1px solid rgba(184,134,11,0.12)', borderRadius: '10px', p: { xs: '1rem', md: '1.25rem 1.5rem' }, mb: { xs: '0.75rem', md: '0.25rem' } }}>
      <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.7rem * ${textScale})`, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b8860b', mb: 1.5 }}>
        From Cartoons
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {contexts.map((ctx, i) => (
          <Box key={i} sx={{ ...(i > 0 && { pt: 1.5, borderTop: '1px solid rgba(184,134,11,0.1)' }) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.75rem * ${textScale})`, fontWeight: 600, color: '#7a6e65' }}>
                {ctx.show}
              </Typography>
              {ctx.timestamp != null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, background: 'rgba(184,134,11,0.1)', borderRadius: '4px', px: 0.75, py: 0.25 }}>
                  <PlayArrow sx={{ fontSize: '0.7rem', color: '#b8860b' }} />
                  <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.7rem * ${textScale})`, color: '#b8860b', fontWeight: 600 }}>
                    {formatTime(ctx.timestamp)}
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography sx={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: `calc(1.15rem * ${textScale})`, color: '#2c1a0e', direction: 'rtl', textAlign: 'right', lineHeight: 1.4, mb: 0.35 }}>
              {ctx.arabic}
            </Typography>
            {ctx.english && (
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: `calc(0.85rem * ${textScale})`, color: '#7a6e65', fontStyle: 'italic', lineHeight: 1.4 }}>
                {ctx.english}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
