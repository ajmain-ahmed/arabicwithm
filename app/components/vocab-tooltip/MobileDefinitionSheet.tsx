'use client'

import { Box, SwipeableDrawer, useMediaQuery } from '@mui/material'
import type { SyntheticEvent } from 'react'
import WordTooltip from './WordTooltip'
import type { VocabEntry } from './index'

export default function MobileDefinitionSheet({
  open,
  entry,
  onClose,
  onExited,
  textScale = 1,
}: {
  open: boolean
  entry: VocabEntry | null
  onClose: () => void
  onExited?: () => void
  textScale?: number
}) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const stopBackdropEvent = (event: SyntheticEvent) => {
    event.stopPropagation()
  }
  const consumeBackdropClick = (event: SyntheticEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onOpen={() => undefined}
      onClose={onClose}
      disableSwipeToOpen
      disableDiscovery
      hysteresis={0.3}
      minFlingVelocity={350}
      transitionDuration={reduceMotion ? 0 : { enter: 280, exit: 220 }}
      ModalProps={{ onTransitionExited: onExited }}
      slotProps={{
        backdrop: {
          onPointerDown: stopBackdropEvent,
          onPointerUp: stopBackdropEvent,
          onTouchStart: stopBackdropEvent,
          onTouchEnd: stopBackdropEvent,
          onClick: consumeBackdropClick,
          sx: {
            bgcolor: 'rgba(14, 46, 31, 0.28)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            pointerEvents: 'auto',
            touchAction: 'none',
          },
        },
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-label': 'Word definition',
          sx: {
            width: '100%',
            maxWidth: 680,
            maxHeight: 'min(82dvh, 760px)',
            mx: 'auto',
            overflow: 'hidden',
            borderRadius: '22px 22px 0 0',
            bgcolor: 'rgba(255, 252, 247, 0.9)',
            backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,.5), rgba(245,237,224,.25))',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid color-mix(in srgb, var(--awm-gold) 30%, transparent)',
            borderBottom: 0,
            boxShadow: '0 -18px 52px rgba(14,46,31,.24)',
          },
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{ width: 42, height: 5, borderRadius: 999, bgcolor: 'rgba(44,26,14,.24)', mx: 'auto', mt: 1.25, mb: 0.5, flex: '0 0 auto' }}
      />
      <Box
        sx={{
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          px: { xs: 2.5, sm: 3.5 },
          pt: { xs: 1.75, sm: 2.25 },
          pb: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        {entry && <WordTooltip entry={entry} textScale={textScale} />}
      </Box>
    </SwipeableDrawer>
  )
}
