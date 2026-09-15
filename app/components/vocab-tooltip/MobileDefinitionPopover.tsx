'use client'

import { useEffect, useRef } from 'react'
import { Fade, Paper, Popper, useMediaQuery } from '@mui/material'
import WordTooltip from './WordTooltip'
import type { VocabEntry } from './index'

export default function MobileDefinitionPopover({
  anchor,
  entry,
  onClose,
  textScale = 1,
}: {
  anchor: HTMLElement | null
  entry: VocabEntry | null
  onClose: () => void
  textScale?: number
}) {
  const paperRef = useRef<HTMLDivElement | null>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const open = Boolean(anchor && entry)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && (paperRef.current?.contains(target) || anchor?.contains(target))) return
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const handleScroll = () => onClose()

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [anchor, onClose, open])

  return (
    <Popper
      open={open}
      anchorEl={anchor}
      placement="auto"
      transition
      modifiers={[
        { name: 'flip', enabled: true },
        { name: 'preventOverflow', enabled: true, options: { boundary: 'viewport', padding: 12 } },
        { name: 'offset', options: { offset: [0, 8] } },
      ]}
      sx={{ zIndex: 1500 }}
    >
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={reduceMotion ? 0 : 130}>
          <Paper
            ref={paperRef}
            role="dialog"
            aria-label="Word definition"
            elevation={0}
            onPointerDown={(event) => event.stopPropagation()}
            sx={{
              width: 'min(280px, calc(100vw - 24px))',
              maxHeight: 'min(46dvh, 360px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              p: 1.5,
              borderRadius: '13px',
              bgcolor: 'rgba(255,252,247,.97)',
              border: '1px solid rgba(184,134,11,.25)',
              boxShadow: '0 12px 34px rgba(44,26,14,.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {entry && <WordTooltip entry={entry} textScale={Math.min(textScale, 1.05)} />}
          </Paper>
        </Fade>
      )}
    </Popper>
  )
}
