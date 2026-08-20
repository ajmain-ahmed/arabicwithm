'use client'

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Slider, Typography } from '@mui/material'
import { Close } from '@mui/icons-material'
import type { BookReaderFont } from '@/app/lib/bookReaderSettings'
import {
  BOOK_TEXT_SCALE_STEP,
  MAX_BOOK_TEXT_SCALE,
  MIN_BOOK_TEXT_SCALE,
} from '@/app/lib/bookReaderSettings'

const FONT_OPTIONS: Array<{ value: BookReaderFont; label: string }> = [
  { value: 'naskh', label: 'Naskh' },
  { value: 'sans', label: 'Modern' },
  { value: 'amiri', label: 'Classic' },
]

export default function BookReaderSettingsDialog({
  open,
  onClose,
  readerFont,
  onReaderFontChange,
  textScale,
  onTextScaleChange,
}: {
  open: boolean
  onClose: () => void
  readerFont: BookReaderFont
  onReaderFontChange: (font: BookReaderFont) => void
  textScale: number
  onTextScaleChange: (scale: number) => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: '100%', maxWidth: 480, m: 2, borderRadius: '16px' } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--awm-bark)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
        Reading settings
        <IconButton onClick={onClose} aria-label="Close reading settings" sx={{ color: 'var(--awm-muted)' }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px!important' }}>
        <Box sx={{ p: 2, border: '1px solid rgba(122,110,101,0.18)', borderRadius: '12px', bgcolor: 'rgba(122,110,101,0.04)' }}>
          <Typography sx={{ mb: 1.25, color: 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>
            Arabic font
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
            {FONT_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                onClick={() => onReaderFontChange(value)}
                variant={readerFont === value ? 'contained' : 'outlined'}
                sx={{ minWidth: 0, color: readerFont === value ? '#fff' : 'var(--awm-bark)', bgcolor: readerFont === value ? '#b8860b' : 'transparent', borderColor: 'rgba(184,134,11,0.4)', borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: readerFont === value ? '#966d09' : 'rgba(184,134,11,0.08)' } }}
              >
                {label}
              </Button>
            ))}
          </Box>
        </Box>

        <Box sx={{ p: 2, border: '1px solid rgba(122,110,101,0.18)', borderRadius: '12px', bgcolor: 'rgba(122,110,101,0.04)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
            <Box>
              <Typography sx={{ color: 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>
                Text size
              </Typography>
              <Typography sx={{ mt: 0.25, color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 12.5 }}>
                Adjust the chapter text
              </Typography>
            </Box>
            <Typography aria-live="polite" sx={{ color: 'var(--awm-gold)', fontFamily: 'Jost, sans-serif', fontWeight: 700 }}>
              {Math.round(textScale * 100)}%
            </Typography>
          </Box>
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '32px minmax(150px, 1fr) 42px', alignItems: 'center', columnGap: { xs: 1.5, sm: 2.5 } }}>
            <Typography aria-hidden="true" sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>A</Typography>
            <Slider
              value={textScale}
              min={MIN_BOOK_TEXT_SCALE}
              max={MAX_BOOK_TEXT_SCALE}
              step={BOOK_TEXT_SCALE_STEP}
              onChange={(_, value) => onTextScaleChange(value as number)}
              aria-label="Book text size"
              sx={{ color: '#b8860b', '& .MuiSlider-thumb': { width: 18, height: 18 }, '& .MuiSlider-track, & .MuiSlider-rail': { height: 5 } }}
            />
            <Typography aria-hidden="true" sx={{ color: 'var(--awm-muted)', fontFamily: 'Jost, sans-serif', fontSize: 24, lineHeight: 1, fontWeight: 700, textAlign: 'center' }}>A</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: '#2c1a0e', color: '#f5ede0', borderRadius: '9px', px: 3, textTransform: 'none', '&:hover': { bgcolor: '#1a0f08' } }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
