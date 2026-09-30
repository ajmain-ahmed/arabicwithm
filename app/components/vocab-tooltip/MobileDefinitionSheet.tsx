'use client'

import { Box, SwipeableDrawer, useMediaQuery } from '@mui/material'
import { alpha } from '@mui/material/styles'
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
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.92),
            backgroundImage: (theme) => `linear-gradient(145deg, ${alpha(theme.palette.primary.light, 0.08)}, transparent)`,
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            borderBottom: 0,
            boxShadow: (theme) => `0 -18px 52px ${alpha(theme.palette.common.black, 0.26)}`,
          },
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{ width: 42, height: 5, borderRadius: 999, bgcolor: (theme) => alpha(theme.palette.text.primary, 0.24), mx: 'auto', mt: 1.25, mb: 0.5, flex: '0 0 auto' }}
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
