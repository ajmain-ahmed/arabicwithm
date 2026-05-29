'use client'

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'

interface DeleteConfirmDialogProps {
  open: boolean
  wordAr: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmDialog({ open, wordAr, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: '14px', background: '#fff', p: 1 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberRoundedIcon sx={{ color: '#f57c00', fontSize: 28 }} />
          <Typography
            sx={{
              fontFamily: "'EB Garamond', serif",
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#2c1a0e',
            }}
          >
            Remove word?
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', color: '#7a6e65', lineHeight: 1.6 }}>
          Are you sure you want to remove{' '}
          <Box component="span" sx={{ fontWeight: 600, color: '#2c1a0e', direction: 'rtl', display: 'inline' }}>
            {wordAr}
          </Box>{' '}
          from your list?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontWeight: 500,
            textTransform: 'none',
            color: '#7a6e65',
            borderRadius: '10px',
            px: 3,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            background: '#c62828',
            color: '#fff',
            borderRadius: '10px',
            px: 3,
            '&:hover': { background: '#a31616' },
          }}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  )
}
