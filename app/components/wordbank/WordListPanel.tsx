'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Box,
  Grid,
  Typography,
  Button,
  Pagination,
  useTheme,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SchoolIcon from '@mui/icons-material/School'
import { useRouter } from 'next/navigation'
import { removeWordProgress } from '@/app/actions/vocab'
import { useVocabStore } from '@/store/vocabStore'
import type { ProgressWord } from '@/app/actions/profile'
import DeleteConfirmDialog from './DeleteConfirmDialog'

const ITEMS_PER_PAGE = 10

const LEVEL_COLORS: Record<string, string> = {
  A0: '#2d6a4f',
  A1: '#1976d2',
  A2: '#388e3c',
  B1: '#f57c00',
  B2: '#7b1fa2',
  C1: '#00796b',
  C2: '#c2185b',
}

interface WordListPanelProps {
  words: ProgressWord[]
  totalWordsOfType: number
  type: 'revision' | 'completed'
  isMobile: boolean
  searchQuery: string
  levelFilter: string
}

function WordCard({
  word,
  onRemoveClick,
}: {
  word: ProgressWord
  onRemoveClick: (word: ProgressWord) => void
}) {
  return (
    <Box
      sx={{
        background: '#fff',
        borderRadius: '10px',
        p: { xs: 2, md: 2.25 },
        border: '1px solid rgba(44,26,14,0.05)',
        transition: 'all 0.18s ease',
        '&:hover': {
          borderColor: 'rgba(184,134,11,0.2)',
          boxShadow: '0 3px 10px rgba(44,26,14,0.05)',
        },
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      {/* Top row: Arabic + Level + Remove */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontFamily: "'EB Garamond', serif",
              fontSize: { xs: '1.35rem', md: '1.5rem' },
              fontWeight: 700,
              color: '#2c1a0e',
              direction: 'rtl',
              lineHeight: 1.25,
            }}
          >
            {word.word_di}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <Box
            sx={{
              px: 0.8,
              py: 0.25,
              borderRadius: '5px',
              background: `${LEVEL_COLORS[word.level] ?? '#7a6e65'}12`,
              color: LEVEL_COLORS[word.level] ?? '#7a6e65',
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.68rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {word.level}
          </Box>
          <Button
            onClick={() => onRemoveClick(word)}
            size="small"
            sx={{
              minWidth: 0,
              width: 28,
              height: 28,
              borderRadius: '6px',
              color: '#9e8a7a',
              p: 0,
              '&:hover': { color: '#c62828', background: 'rgba(198,40,40,0.06)' },
            }}
            aria-label={`Remove ${word.word_ar}`}
          >
            <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
          </Button>
        </Box>
      </Box>

      {/* Transliteration */}
      <Typography
        sx={{
          fontFamily: 'Jost, sans-serif',
          fontSize: '0.85rem',
          color: '#7a6e65',
          fontWeight: 500,
        }}
      >
        {word.word_tr}
      </Typography>

      {/* Meaning */}
      {word.meaning && (
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.82rem',
            color: '#6b5f55',
            lineHeight: 1.4,
          }}
        >
          {word.meaning}
        </Typography>
      )}
    </Box>
  )
}

export default function WordListPanel({ words, totalWordsOfType, type, isMobile, searchQuery, levelFilter }: WordListPanelProps) {
  const [page, setPage] = useState(1)
  const [confirmWord, setConfirmWord] = useState<ProgressWord | null>(null)
  const invalidateUserProgress = useVocabStore((s) => s.invalidateUserProgress)
  const router = useRouter()

  useEffect(() => {
    setPage(1)
  }, [words.length, searchQuery, levelFilter, type])

  const sortedWords = useMemo(() => {
    return [...words].sort((a, b) => a.word_ar.localeCompare(b.word_ar, 'ar'))
  }, [words])

  const pageCount = Math.ceil(sortedWords.length / ITEMS_PER_PAGE)
  const paginatedWords = useMemo(() => {
    return sortedWords.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  }, [sortedWords, page])

  const handleRemoveClick = useCallback((word: ProgressWord) => {
    setConfirmWord(word)
  }, [])

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmWord) return
    setConfirmWord(null)
    try {
      await removeWordProgress(confirmWord.vocab_id)
      invalidateUserProgress()
    } catch (err) {
      console.error('Failed to remove word:', err)
    }
  }, [confirmWord, invalidateUserProgress])

  const handleCancelRemove = useCallback(() => {
    setConfirmWord(null)
  }, [])

  if (words.length === 0) {
    const hasNoWordsEver = totalWordsOfType === 0
    return (
      <Box sx={{ p: { xs: 5, md: 7 }, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
        <SchoolIcon sx={{ fontSize: 48, color: 'rgba(184,134,11,0.25)' }} />
        <Box>
          <Typography
            sx={{
              fontFamily: "'EB Garamond', serif",
              fontSize: '1.15rem',
              fontWeight: 600,
              color: '#7a6e65',
            }}
          >
            {hasNoWordsEver
              ? `No ${type} words yet`
              : 'No words found'}
          </Typography>
          {hasNoWordsEver && (
            <Typography sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem', color: '#9e8a7a', mt: 0.5 }}>
              {type === 'revision'
                ? 'Words you mark for revision will appear here.'
                : 'Complete words in flashcards to see them here.'}
            </Typography>
          )}
        </Box>
        {hasNoWordsEver && (
          <Button
            variant="contained"
            onClick={() => router.push('/flashcards')}
            startIcon={<SchoolIcon sx={{ fontSize: 18 }} />}
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: 600,
              textTransform: 'none',
              background: '#b8860b',
              color: '#fff',
              borderRadius: '10px',
              px: 3,
              py: 1,
              fontSize: '0.9rem',
              '&:hover': { background: '#9c6b00' },
            }}
          >
            Start Learning
          </Button>
        )}
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ p: { xs: 1.5, md: 2 }, pb: 0 }}>
        <Grid container spacing={1.5}>
          {paginatedWords.map((word) => (
            <Grid key={word.vocab_id} size={{ xs: 12, md: 6 }}>
              <WordCard word={word} onRemoveClick={handleRemoveClick} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Sticky pagination */}
      {pageCount > 1 && (
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            py: 1.5,
            px: 2,
            background: '#f5ede0',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, v) => setPage(v)}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              '& .MuiPaginationItem-root': {
                fontFamily: 'Jost, sans-serif',
                fontWeight: 500,
                color: '#7a6e65',
                borderRadius: '8px',
              },
              '& .MuiPaginationItem-root.Mui-selected': {
                background: '#b8860b',
                color: '#fff',
                '&:hover': { background: '#9c6b00' },
              },
            }}
          />
        </Box>
      )}

      <DeleteConfirmDialog
        open={!!confirmWord}
        wordAr={confirmWord?.word_ar ?? ''}
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
      />
    </>
  )
}
