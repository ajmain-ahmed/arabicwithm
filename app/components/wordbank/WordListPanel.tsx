'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Box,
  Grid,
  Typography,
  Button,
  Pagination,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  Skeleton,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import SchoolIcon from '@mui/icons-material/School'
import { useRouter } from 'next/navigation'
import { removeWordProgress, removeWordProgressBatch } from '@/app/actions/vocab'
import { useVocabStore } from '@/store/vocabStore'
import type { ProgressWord } from '@/app/actions/profile'
import DeleteConfirmDialog from './DeleteConfirmDialog'
import BulkDeleteConfirmDialog from './BulkDeleteConfirmDialog'

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 40, 80]

const LEVEL_ORDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const LEVEL_COLORS: Record<string, string> = {
  A0: '#2d6a4f',
  A1: '#1976d2',
  A2: '#388e3c',
  B1: '#f57c00',
  B2: '#7b1fa2',
  C1: '#00796b',
  C2: '#c2185b',
}

type SortOption = 'arabic-asc' | 'arabic-desc' | 'time-newest' | 'time-oldest' | 'level-asc' | 'level-desc'

const SORT_LABELS: Record<SortOption, string> = {
  'arabic-asc': 'Arabic A → Z',
  'arabic-desc': 'Arabic Z → A',
  'time-newest': 'Newest first',
  'time-oldest': 'Oldest first',
  'level-asc': 'Level A0 → C2',
  'level-desc': 'Level C2 → A0',
}

interface WordCardProps {
  word: ProgressWord
  selected: boolean
  onSelectToggle: (word: ProgressWord) => void
  onRemoveClick: (word: ProgressWord) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function WordCard({ word, selected, onSelectToggle, onRemoveClick }: WordCardProps) {
  const dateStr = formatDate(word.updated_at)

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
      {/* Top row: Checkbox + Arabic + Level + Remove */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
          <Checkbox
            checked={selected}
            onChange={() => onSelectToggle(word)}
            sx={{
              p: 0.5,
              color: '#9e8a7a',
              '&.Mui-checked': { color: '#b8860b' },
            }}
            slotProps={{ input: { 'aria-label': `Select ${word.word_ar}` } }}
          />
          <Box sx={{ minWidth: 0 }}>
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
          pl: 3.5,
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
            pl: 3.5,
          }}
        >
          {word.meaning}
        </Typography>
      )}

      {/* Date */}
      {dateStr && (
        <Typography
          sx={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.72rem',
            color: '#9e8a7a',
            mt: 'auto',
            textAlign: 'right',
            pt: 0.5,
          }}
        >
          {dateStr}
        </Typography>
      )}
    </Box>
  )
}

interface WordListPanelProps {
  words: ProgressWord[]
  totalWordsOfType: number
  type: 'revision' | 'completed'
  isMobile: boolean
  searchQuery: string
  levelFilter: string
  loading?: boolean
}

function SkeletonCard() {
  return (
    <Box
      sx={{
        background: '#fff',
        borderRadius: '10px',
        p: { xs: 2, md: 2.25 },
        border: '1px solid rgba(44,26,14,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Skeleton variant="circular" width={20} height={20} sx={{ flexShrink: 0 }} />
          <Skeleton variant="text" width='60%' height={28} sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <Skeleton variant="rounded" width={32} height={20} sx={{ borderRadius: '5px' }} />
          <Skeleton variant="circular" width={28} height={28} sx={{ flexShrink: 0 }} />
        </Box>
      </Box>
      <Skeleton variant="text" width='45%' height={18} sx={{ pl: 3.5 }} />
      <Skeleton variant="text" width='70%' height={16} sx={{ pl: 3.5 }} />
      <Skeleton variant="text" width='30%' height={14} sx={{ ml: 'auto' }} />
    </Box>
  )
}

export default function WordListPanel({ words, totalWordsOfType, type, isMobile, searchQuery, levelFilter, loading }: WordListPanelProps) {
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [sortBy, setSortBy] = useState<SortOption>('arabic-asc')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmWord, setConfirmWord] = useState<ProgressWord | null>(null)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkDialogMode, setBulkDialogMode] = useState<'selected' | 'all'>('selected')

  const invalidateUserProgress = useVocabStore((s) => s.invalidateUserProgress)
  const router = useRouter()

  // Reset page & selection when filters or tab change (but NOT on page change)
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [words.length, searchQuery, levelFilter, type])

  const sortedWords = useMemo(() => {
    const list = [...words]
    switch (sortBy) {
      case 'arabic-asc':
        list.sort((a, b) => a.word_ar.localeCompare(b.word_ar, 'ar'))
        break
      case 'arabic-desc':
        list.sort((a, b) => b.word_ar.localeCompare(a.word_ar, 'ar'))
        break
      case 'time-newest':
        list.sort((a, b) => {
          const da = a.updated_at ? Date.parse(a.updated_at) : 0
          const db = b.updated_at ? Date.parse(b.updated_at) : 0
          return db - da
        })
        break
      case 'time-oldest':
        list.sort((a, b) => {
          const da = a.updated_at ? Date.parse(a.updated_at) : 0
          const db = b.updated_at ? Date.parse(b.updated_at) : 0
          return da - db
        })
        break
      case 'level-asc':
        list.sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))
        break
      case 'level-desc':
        list.sort((a, b) => LEVEL_ORDER.indexOf(b.level) - LEVEL_ORDER.indexOf(a.level))
        break
    }
    return list
  }, [words, sortBy])

  const pageCount = Math.ceil(sortedWords.length / itemsPerPage)
  const paginatedWords = useMemo(() => {
    return sortedWords.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  }, [sortedWords, page, itemsPerPage])

  // Page-scoped select-all state
  const allSelectedOnPage = paginatedWords.length > 0 && paginatedWords.every((w) => selectedIds.has(w.vocab_id))
  const someSelectedOnPage = paginatedWords.some((w) => selectedIds.has(w.vocab_id)) && !allSelectedOnPage
  const selectedCount = selectedIds.size

  const handleSelectToggle = useCallback((word: ProgressWord) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(word.vocab_id)) {
        next.delete(word.vocab_id)
      } else {
        next.add(word.vocab_id)
      }
      return next
    })
  }, [])

  const handleSelectAllPageToggle = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelectedOnPage) {
        for (const w of paginatedWords) {
          next.delete(w.vocab_id)
        }
      } else {
        for (const w of paginatedWords) {
          next.add(w.vocab_id)
        }
      }
      return next
    })
  }, [allSelectedOnPage, paginatedWords])

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

  const openBulkDialog = useCallback((mode: 'selected' | 'all') => {
    setBulkDialogMode(mode)
    setBulkDialogOpen(true)
  }, [])

  const closeBulkDialog = useCallback(() => {
    setBulkDialogOpen(false)
  }, [])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleConfirmBulkRemove = useCallback(async () => {
    setBulkDialogOpen(false)
    const idsToRemove = bulkDialogMode === 'all'
      ? sortedWords.map((w) => w.vocab_id)
      : Array.from(selectedIds)

    if (idsToRemove.length === 0) return

    try {
      await removeWordProgressBatch(idsToRemove)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of idsToRemove) next.delete(id)
        return next
      })
      invalidateUserProgress()
    } catch (err) {
      console.error('Failed to remove words:', err)
    }
  }, [bulkDialogMode, sortedWords, selectedIds, invalidateUserProgress])

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        <Grid container spacing={1.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <SkeletonCard />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

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
      {/* Toolbar — Mobile */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          flexDirection: 'column',
          gap: 1.25,
          p: 1.25,
          pb: 0.75,
        }}
      >
        {/* Row 1: dropdowns */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption)
                setPage(1)
              }}
              sx={{
                borderRadius: '10px',
                background: '#fff',
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.8rem',
                '& .MuiSelect-select': { py: 0.875, px: 1 },
              }}
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem' }}>
                  {SORT_LABELS[opt]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              sx={{
                borderRadius: '10px',
                background: '#fff',
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.8rem',
                '& .MuiSelect-select': { py: 0.875, px: 1 },
              }}
            >
              {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem' }}>
                  {opt} / page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Row 2: select controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Checkbox
            checked={allSelectedOnPage}
            indeterminate={someSelectedOnPage}
            onChange={handleSelectAllPageToggle}
            sx={{
              p: 0.25,
              color: '#9e8a7a',
              '&.Mui-checked': { color: '#b8860b' },
              '&.Mui-indeterminate': { color: '#b8860b' },
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.8rem',
              color: '#7a6e65',
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
          </Typography>
          {selectedCount > 0 && (
            <Button
              onClick={handleDeselectAll}
              size="small"
              startIcon={<CloseOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 500,
                textTransform: 'none',
                color: '#7a6e65',
                borderRadius: '8px',
                px: 1.5,
                py: 0.5,
                fontSize: '0.82rem',
                '&:hover': { background: 'rgba(44,26,14,0.04)' },
              }}
            >
              Clear
            </Button>
          )}
        </Box>

        {/* Row 3: delete controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Button
            onClick={() => openBulkDialog('all')}
            variant="outlined"
            size="small"
            startIcon={<DeleteSweepOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: 600,
              textTransform: 'none',
              color: '#c62828',
              borderColor: 'rgba(198,40,40,0.4)',
              borderRadius: '8px',
              px: 1.5,
              py: 0.5,
              fontSize: '0.82rem',
              '&:hover': {
                borderColor: '#c62828',
                background: 'rgba(198,40,40,0.06)',
              },
            }}
          >
            Remove all
          </Button>
          {selectedCount > 0 && (
            <Button
              onClick={() => openBulkDialog('selected')}
              size="small"
              startIcon={<DeleteOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                color: '#c62828',
                borderRadius: '8px',
                px: 1.5,
                py: 0.5,
                fontSize: '0.82rem',
                '&:hover': { background: 'rgba(198,40,40,0.06)' },
              }}
            >
              Remove selected
            </Button>
          )}
        </Box>
      </Box>

      {/* Toolbar — Desktop */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          p: 2,
          pb: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title={allSelectedOnPage ? 'Deselect all on page' : 'Select all on page'}>
            <Checkbox
              checked={allSelectedOnPage}
              indeterminate={someSelectedOnPage}
              onChange={handleSelectAllPageToggle}
              sx={{
                p: 0.5,
                color: '#9e8a7a',
                '&.Mui-checked': { color: '#b8860b' },
                '&.Mui-indeterminate': { color: '#b8860b' },
              }}
            />
          </Tooltip>
          <Typography
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '0.85rem',
              color: '#7a6e65',
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
          </Typography>

          {selectedCount > 0 && (
            <Button
              onClick={handleDeselectAll}
              size="small"
              startIcon={<CloseOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 500,
                textTransform: 'none',
                color: '#7a6e65',
                borderRadius: '8px',
                px: 1.5,
                py: 0.5,
                fontSize: '0.82rem',
                '&:hover': { background: 'rgba(44,26,14,0.04)' },
              }}
            >
              Clear selection
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {selectedCount > 0 && (
            <Button
              onClick={() => openBulkDialog('selected')}
              size="small"
              startIcon={<DeleteOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                color: '#c62828',
                borderRadius: '8px',
                px: 1.5,
                py: 0.5,
                fontSize: '0.82rem',
                '&:hover': { background: 'rgba(198,40,40,0.06)' },
              }}
            >
              Remove selected
            </Button>
          )}

          <Button
            onClick={() => openBulkDialog('all')}
            variant="outlined"
            size="small"
            startIcon={<DeleteSweepOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontFamily: 'Jost, sans-serif',
              fontWeight: 600,
              textTransform: 'none',
              color: '#c62828',
              borderColor: 'rgba(198,40,40,0.4)',
              borderRadius: '8px',
              px: 1.5,
              py: 0.5,
              fontSize: '0.82rem',
              '&:hover': {
                borderColor: '#c62828',
                background: 'rgba(198,40,40,0.06)',
              },
            }}
          >
            Remove all
          </Button>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption)
                setPage(1)
              }}
              sx={{
                borderRadius: '10px',
                background: '#fff',
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.82rem',
                '& .MuiSelect-select': { py: 0.75 },
              }}
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem' }}>
                  {SORT_LABELS[opt]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              sx={{
                borderRadius: '10px',
                background: '#fff',
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.82rem',
                '& .MuiSelect-select': { py: 0.75 },
              }}
            >
              {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ fontFamily: 'Jost, sans-serif', fontSize: '0.82rem' }}>
                  {opt} / page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Grid */}
      <Box sx={{ p: { xs: 1.5, md: 2 }, pt: 0 }}>
        <Grid container spacing={1.5}>
          {paginatedWords.map((word) => (
            <Grid key={word.vocab_id} size={{ xs: 12, md: 6 }}>
              <WordCard
                word={word}
                selected={selectedIds.has(word.vocab_id)}
                onSelectToggle={handleSelectToggle}
                onRemoveClick={handleRemoveClick}
              />
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

      <BulkDeleteConfirmDialog
        open={bulkDialogOpen}
        mode={bulkDialogMode}
        count={bulkDialogMode === 'all' ? sortedWords.length : selectedCount}
        typeLabel={type}
        onConfirm={handleConfirmBulkRemove}
        onCancel={closeBulkDialog}
      />
    </>
  )
}
