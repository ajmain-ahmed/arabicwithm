'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Box, Fab, Zoom, useMediaQuery, useTheme } from '@mui/material'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import { useAuth } from '@/app/AuthContext'
import WordBankDialog from './wordbank/WordBankDialog'

export default function WordBankWidget() {
  const [open, setOpen] = useState(false)
  const [customQuizActive, setCustomQuizActive] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user } = useAuth()

  useEffect(() => {
    const check = () => setCustomQuizActive(document.body.classList.contains('revision-custom-active'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const handleOpen = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])

  if (!user) return null

  return (
    <>
      <Zoom in={!open}>
        <Fab
          aria-label="House of Cards"
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            ...(customQuizActive && isMobile
              ? { top: 80, left: 16 }
              : { bottom: isMobile ? 80 : 24, right: 24 }
            ),
            zIndex: 1200,
            background: '#b8860b',
            color: '#fff',
            width: 52,
            height: 52,
            boxShadow: '0 3px 12px rgba(184,134,11,0.35)',
            '&:hover': {
              background: '#9c6b00',
              boxShadow: '0 5px 16px rgba(184,134,11,0.45)',
            },
          }}
        >
          <FormatListBulletedIcon sx={{ fontSize: 24 }} />
        </Fab>
      </Zoom>

      <WordBankDialog open={open} onClose={handleClose} />
    </>
  )
}
