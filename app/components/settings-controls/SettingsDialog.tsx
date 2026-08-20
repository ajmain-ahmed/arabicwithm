'use client'

import React from 'react'
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Slider, Typography,
} from '@mui/material'
import { Close } from '@mui/icons-material'
import ToggleRow from './ToggleRow'

export interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  showDiacritics: boolean
  onToggleDiacritics: () => void
  textScale: number
  onTextScaleChange: (value: number) => void
  textSizeDescription?: string
  textScaleMin?: number
  textScaleMax?: number
  onEdit?: () => void
}

export default function SettingsDialog({
  open, onClose,
  showDiacritics, onToggleDiacritics,
  textScale, onTextScaleChange,
  textSizeDescription = 'Adjust Arabic text size',
  textScaleMin = 0.9,
  textScaleMax = 1.5,
  onEdit,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} slotProps={{ paper: { sx: { borderRadius: '16px', width: '100%', maxWidth: 360, m: 2, overflow: 'hidden', boxShadow: '0 24px 64px rgba(44,26,14,0.2)' } } }}>
      <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--awm-bark)', pb: 0.5, pt: 2.5, px: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Settings
        <IconButton onClick={onClose} size="small" aria-label="Close settings" sx={{ color: 'var(--awm-muted)', mr: -0.5 }}><Close sx={{ fontSize: '1.2rem' }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, pt: 1.5, pb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <ToggleRow label="Show Diacritics" description="Display vowel marks on Arabic words" enabled={showDiacritics} onToggle={onToggleDiacritics} activeColor="#b8860b" />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, px: 1.5, borderRadius: '10px', border: '1px solid rgba(122,110,101,0.15)', background: 'rgba(122,110,101,0.03)', gap: 2 }}>
            <Box sx={{ pr: 2, flex: '0 0 auto' }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.95rem', fontWeight: 600, color: 'var(--awm-bark)' }}>Text Size</Typography>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.78rem', color: 'var(--awm-muted)', mt: 0.3 }}>{textSizeDescription}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, maxWidth: 180 }}>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--awm-muted)', flexShrink: 0 }}>A</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Slider value={textScale} min={textScaleMin} max={textScaleMax} step={0.1} size="small" onChange={(_, v) => onTextScaleChange(v as number)} sx={{ color: '#b8860b', width: '100%', '& .MuiSlider-thumb': { width: 14, height: 14 } }} />
              </Box>
              <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--awm-muted)', flexShrink: 0 }}>A</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0.5, display: 'flex', gap: 1.5 }}>
        {onEdit && (
          <Button
            fullWidth
            variant="outlined"
            onClick={() => { onClose(); onEdit(); }}
            sx={{
              flex: 1,
              color: 'var(--awm-bark)',
              borderColor: 'rgba(44,26,14,0.25)',
              fontFamily: 'Jost, sans-serif',
              fontWeight: 600,
              fontSize: '0.9rem',
              textTransform: 'none',
              borderRadius: '10px',
              py: 1,
              '&:hover': { background: 'rgba(44,26,14,0.06)', borderColor: 'rgba(44,26,14,0.4)' },
            }}
          >
            Edit episode
          </Button>
        )}
        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          disableElevation
          sx={{
            flex: onEdit ? 1 : undefined,
            background: '#2c1a0e',
            color: '#f5ede0',
            fontFamily: 'Jost, sans-serif',
            fontWeight: 600,
            fontSize: '0.95rem',
            textTransform: 'none',
            borderRadius: '10px',
            py: 1.1,
            '&:hover': { background: '#1a0f08' },
          }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
