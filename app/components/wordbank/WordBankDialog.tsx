'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  IconButton,
  Typography,
  Tabs,
  Tab,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import { useVocabStore } from '@/store/vocabStore'
import { stripLatinDiacritics } from '@/app/lib/arabic'
import WordListPanel from './WordListPanel'

const LEVEL_CODES = ['ALL', 'A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LEVEL_LABELS: Record<string, string> = {
  ALL: 'All Levels',
  A0: 'A0 — Absolute Beginner',
  A1: 'A1 — Beginner',
  A2: 'A2 — Elementary',
  B1: 'B1 — Lower Intermediate',
  B2: 'B2 — Upper Intermediate',
  C1: 'C1 — Advanced',
  C2: 'C2 — Proficiency',
}

type TabValue = 'revision' | 'completed'

interface WordBankDialogProps {
  open: boolean
  onClose: () => void
}

export default function WordBankDialog({ open, onClose }: WordBankDialogProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [activeTab, setActiveTab] = useState<TabValue>('revision')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')

  const userProgressWords = useVocabStore((s) => s.userProgressWords)
  const userProgressLoading = useVocabStore((s) => s.userProgressLoading)

  const filteredWords = useMemo(() => {
    let words = userProgressWords ?? []
    if (levelFilter !== 'ALL') {
      words = words.filter((w) => w.level === levelFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      const normalizedQ = stripLatinDiacritics(q)
      words = words.filter((w) => {
        const arMatch = w.word_ar.toLowerCase().includes(q)
        const diMatch = w.word_di.toLowerCase().includes(q)
        const trMatch = stripLatinDiacritics(w.word_tr).toLowerCase().includes(normalizedQ)
        const enMatch = w.meaning ? w.meaning.toLowerCase().includes(q) : false
        return arMatch || diMatch || trMatch || enMatch
      })
    }
    return words
  }, [userProgressWords, levelFilter, search])

  const revisionWords = useMemo(
    () => filteredWords.filter((w) => w.status === 'revision'),
    [filteredWords]
  )
  const completedWords = useMemo(
    () => filteredWords.filter((w) => w.status === 'completed'),
    [filteredWords]
  )

  const handleClose = useCallback(() => {
    onClose()
    setSearch('')
    setLevelFilter('ALL')
    setActiveTab('revision')
  }, [onClose])

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : '14px',
            background: '#f5ede0',
            overflow: 'hidden',
            maxHeight: isMobile ? '100vh' : '85vh',
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: { xs: 2, md: 2.5 },
          pb: { xs: 1.5, md: 1.5 },
          background: '#fff',
          borderBottom: '1px solid rgba(184,134,11,0.10)',
        }}
      >
        <Typography
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontSize: { xs: '1.25rem', md: '1.45rem' },
            fontWeight: 700,
            color: '#2c1a0e',
          }}
        >
          House of Cards
        </Typography>
        <IconButton onClick={handleClose} size="small" aria-label="Close" sx={{ color: '#9e8a7a' }}>
          <CloseIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </DialogTitle>

      {/* Search + Filter bar */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          p: { xs: 1.5, md: 2 },
          pb: { xs: 1, md: 1.5 },
          background: '#fff',
          borderBottom: '1px solid rgba(44,26,14,0.06)',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <TextField
          placeholder="Search Arabic or transliteration..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              background: '#f5ede0',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.88rem',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9e8a7a', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            displayEmpty
            sx={{
              borderRadius: '10px',
              background: '#f5ede0',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.88rem',
            }}
          >
            {LEVEL_CODES.map((code) => (
              <MenuItem key={code} value={code} sx={{ fontFamily: 'Jost, sans-serif' }}>
                {LEVEL_LABELS[code]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Tabs */}
      <Box sx={{ background: '#fff', px: { xs: 1.5, md: 2 } }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 44,
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.9rem',
              fontWeight: 500,
              textTransform: 'none',
              color: '#7a6e65',
              minHeight: 44,
              px: 2.5,
              transition: 'color 0.2s ease',
              '&.Mui-selected': {
                fontWeight: 700,
              },
            },
          }}
        >
          <Tab
            value="revision"
            label="Revision"
            sx={{
              '&.Mui-selected': { color: '#1565c0' },
            }}
          />
          <Tab
            value="completed"
            label="Completed"
            sx={{
              '&.Mui-selected': { color: '#2e7d32' },
            }}
          />
        </Tabs>
      </Box>

      {/* Content */}
      <DialogContent
        sx={{
          p: 0,
          background: '#f5ede0',
          '&.MuiDialogContent-root': { p: 0 },
          overflowY: 'auto',
        }}
      >
        {activeTab === 'revision' && (
          <WordListPanel
            words={revisionWords}
            totalWordsOfType={(userProgressWords ?? []).filter((w) => w.status === 'revision').length}
            type="revision"
            isMobile={isMobile}
            searchQuery={search}
            levelFilter={levelFilter}
            loading={userProgressLoading}
          />
        )}
        {activeTab === 'completed' && (
          <WordListPanel
            words={completedWords}
            totalWordsOfType={(userProgressWords ?? []).filter((w) => w.status === 'completed').length}
            type="completed"
            isMobile={isMobile}
            searchQuery={search}
            levelFilter={levelFilter}
            loading={userProgressLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
