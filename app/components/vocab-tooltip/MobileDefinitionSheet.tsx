'use client'

import { Box, IconButton, SwipeableDrawer, Typography, useMediaQuery } from '@mui/material'
import { CloseRounded } from '@mui/icons-material'
import WordTooltip from './WordTooltip'
import type { VocabEntry } from './index'

export default function MobileDefinitionSheet({
  open,
  entry,
  onClose,
  textScale = 1,
}: {
  open: boolean
  entry: VocabEntry | null
  onClose: () => void
  textScale?: number
}) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const titleId = 'awm-mobile-definition-title'

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
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(14, 46, 31, 0.28)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          },
        },
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
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
        sx={{ width: 42, height: 5, borderRadius: 999, bgcolor: 'rgba(44,26,14,.24)', mx: 'auto', mt: 1.25, flex: '0 0 auto' }}
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 54,
          px: 2,
          borderBottom: '1px solid rgba(44,26,14,.08)',
          flex: '0 0 auto',
        }}
      >
        <Typography id={titleId} sx={{ fontFamily: 'Jost, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--awm-bark)', letterSpacing: '.02em' }}>
          Word definition
        </Typography>
        <IconButton
          autoFocus={open}
          onClick={onClose}
          aria-label="Close word definition"
          sx={{ width: 44, height: 44, color: 'var(--awm-bark)', bgcolor: 'rgba(44,26,14,.05)', '&:hover': { bgcolor: 'rgba(44,26,14,.09)' } }}
        >
          <CloseRounded />
        </IconButton>
      </Box>
      <Box
        sx={{
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          px: { xs: 2.5, sm: 3.5 },
          pt: 2.25,
          pb: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        {entry && <WordTooltip entry={entry} textScale={textScale} />}
      </Box>
    </SwipeableDrawer>
  )
}
