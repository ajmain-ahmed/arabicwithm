'use client'

import { useMemo, useState } from 'react'
import { CheckCircle, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Typography } from '@mui/material'
import { fetchPuzzleVocabulary } from '@/app/actions/puzzles'
import GamePageShell from '@/app/components/puzzles/GamePageShell'
import { generateCrossword, normalizePuzzleArabic, type CrosswordEntry, type CrosswordPuzzle, type PuzzleCell, type PuzzleVocabularySource } from '@/app/lib/transcriptPuzzles'

function cellKey(cell: PuzzleCell): string {
  return `${cell.row}:${cell.col}`
}

function entryComplete(entry: CrosswordEntry, values: Record<string, string>): boolean {
  return entry.cells.map((cell) => values[cellKey(cell)] ?? '').join('') === entry.answer
}

export default function CrosswordGame({ initialSource, initialPuzzle }: { initialSource: PuzzleVocabularySource | null; initialPuzzle: CrosswordPuzzle | null }) {
  const [source, setSource] = useState(initialSource)
  const [puzzle, setPuzzle] = useState(initialPuzzle)
  const [values, setValues] = useState<Record<string, string>>({})
  const [selectedEntryId, setSelectedEntryId] = useState(initialPuzzle?.entries[0]?.id ?? '')
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const entriesByCell = useMemo(() => {
    const result = new Map<string, CrosswordEntry[]>()
    for (const entry of puzzle?.entries ?? []) {
      for (const cell of entry.cells) result.set(cellKey(cell), [...(result.get(cellKey(cell)) ?? []), entry])
    }
    return result
  }, [puzzle])
  const correctEntries = useMemo(() => new Set((puzzle?.entries ?? []).filter((entry) => entryComplete(entry, values)).map((entry) => entry.id)), [puzzle, values])
  const completed = Boolean(puzzle?.entries.length) && correctEntries.size === puzzle?.entries.length

  const restart = () => {
    setValues({})
    setSelectedEntryId(puzzle?.entries[0]?.id ?? '')
    setChecked(false)
    setMessage('')
  }

  const newGame = async () => {
    setBusy(true)
    setMessage('')
    try {
      const nextSource = await fetchPuzzleVocabulary(source?.episodeId)
      if (!nextSource) {
        setMessage('No transcript vocabulary is available for a new crossword right now.')
        return
      }
      const nextPuzzle = generateCrossword(nextSource.words, { count: 8 })
      if (nextPuzzle.entries.length < 3) {
        setMessage('That transcript could not produce a connected crossword. Please try again.')
        return
      }
      setSource(nextSource)
      setPuzzle(nextPuzzle)
      setValues({})
      setSelectedEntryId(nextPuzzle.entries[0]?.id ?? '')
      setChecked(false)
    } catch {
      setMessage('Unable to create a new crossword. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const selectCell = (cell: PuzzleCell) => {
    const options = entriesByCell.get(cellKey(cell)) ?? []
    if (options.length === 0) return
    const current = options.findIndex((entry) => entry.id === selectedEntryId)
    setSelectedEntryId(options[(current + 1) % options.length].id)
  }

  const updateCell = (cell: PuzzleCell, rawValue: string) => {
    const letters = Array.from(normalizePuzzleArabic(rawValue).replace(/\s/gu, ''))
    const value = letters.at(-1) ?? ''
    const key = cellKey(cell)
    setValues((current) => ({ ...current, [key]: value }))
    setChecked(false)
    if (!value) return
    const options = entriesByCell.get(key) ?? []
    const entry = options.find((item) => item.id === selectedEntryId) ?? options[0]
    if (!entry) return
    setSelectedEntryId(entry.id)
    const index = entry.cells.findIndex((candidate) => cellKey(candidate) === key)
    const next = entry.cells[index + 1]
    if (next) window.requestAnimationFrame(() => document.getElementById(`crossword-${cellKey(next)}`)?.focus())
  }

  const revealEntry = (entry: CrosswordEntry) => {
    const letters = Array.from(entry.answer)
    setValues((current) => {
      const next = { ...current }
      entry.cells.forEach((cell, index) => { next[cellKey(cell)] = letters[index] })
      return next
    })
    setSelectedEntryId(entry.id)
    setChecked(false)
    setMessage(`${entry.number} ${entry.direction} revealed.`)
  }

  const checkAnswers = () => {
    setChecked(true)
    if (completed) setMessage('Crossword complete — every answer is correct.')
    else setMessage(`${correctEntries.size} of ${puzzle?.entries.length ?? 0} answers are correct.`)
  }

  const controls = (
    <Box sx={{ mb: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <Chip label={`${correctEntries.size} / ${puzzle?.entries.length ?? 0} solved`} sx={{ bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)', color: 'var(--awm-bark)', fontWeight: 800 }} />
      <Button onClick={checkAnswers} disabled={!puzzle || busy} variant="outlined" sx={{ borderColor: 'var(--awm-forest)', color: 'var(--awm-forest)', textTransform: 'none' }}>Check answers</Button>
      <Button onClick={restart} disabled={!puzzle || busy} startIcon={<Refresh />} sx={{ color: 'var(--awm-forest)', textTransform: 'none' }}>Restart</Button>
      <Button onClick={() => void newGame()} disabled={busy} variant="contained" sx={{ ml: { sm: 'auto' }, bgcolor: 'var(--awm-gold)', color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#946c08' } }}>{busy ? <CircularProgress size={20} color="inherit" /> : 'New Game'}</Button>
    </Box>
  )

  const renderClues = (direction: 'across' | 'down') => {
    const entries = (puzzle?.entries ?? []).filter((entry) => entry.direction === direction).sort((a, b) => a.number - b.number)
    return (
      <Box>
        <Typography component="h3" sx={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 600, color: 'var(--awm-bark)', textTransform: 'capitalize' }}>{direction}</Typography>
        <Box component="ol" sx={{ m: 0, mt: 1, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
          {entries.map((entry) => (
            <Box component="li" key={`${entry.id}-${entry.direction}`} sx={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) auto', alignItems: 'start', gap: 0.75, p: 0.75, borderRadius: '8px', bgcolor: selectedEntryId === entry.id ? 'color-mix(in srgb, var(--awm-gold) 10%, transparent)' : 'transparent' }}>
              <Typography sx={{ color: 'var(--awm-gold)', fontWeight: 800 }}>{entry.number}</Typography>
              <Button onClick={() => setSelectedEntryId(entry.id)} sx={{ minWidth: 0, p: 0, justifyContent: 'flex-start', color: correctEntries.has(entry.id) ? '#4f7f64' : 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', textAlign: 'left', textTransform: 'none', textDecoration: correctEntries.has(entry.id) ? 'line-through' : 'none' }}>{entry.english}</Button>
              <Button size="small" onClick={() => revealEntry(entry)} sx={{ minWidth: 0, p: 0.5, color: 'var(--awm-muted)', fontSize: 10, textTransform: 'none' }}>Reveal</Button>
            </Box>
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <GamePageShell title="Crossword" intro="Read the English clues and enter each answer using Arabic letters. Every answer comes from the selected transcript." source={source} controls={controls}>
      {message && <Alert severity={completed ? 'success' : 'info'} sx={{ mb: 2 }}>{message}</Alert>}
      {completed && <Alert icon={<CheckCircle />} severity="success" sx={{ mb: 2 }}>Crossword complete — excellent work.</Alert>}
      {!puzzle || puzzle.entries.length < 2 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)' }}>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: 'var(--awm-bark)' }}>No connected crossword available</Typography>
          <Button onClick={() => void newGame()} disabled={busy} variant="contained" sx={{ mt: 2, bgcolor: 'var(--awm-gold)' }}>Try another transcript</Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 390px' }, gap: 2.5, alignItems: 'start' }}>
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 }, overflowX: 'auto', borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', bgcolor: 'var(--awm-white)' }}>
            <Box role="grid" aria-label="Arabic crossword" dir="ltr" sx={{ '--crossword-cell': `min(42px, calc((100vw - 56px) / ${puzzle.grid[0]?.length ?? 1}))`, mx: 'auto', width: 'fit-content', display: 'grid', gridTemplateColumns: `repeat(${puzzle.grid[0]?.length ?? 1}, var(--crossword-cell))`, gridAutoRows: 'var(--crossword-cell)' }}>
              {puzzle.grid.flatMap((row, rowIndex) => row.map((answer, colIndex) => {
                const cell = { row: rowIndex, col: colIndex }
                const key = cellKey(cell)
                if (!answer) return <Box key={key} aria-hidden="true" />
                const entries = entriesByCell.get(key) ?? []
                const selected = entries.some((entry) => entry.id === selectedEntryId)
                const cellCorrect = entries.some((entry) => correctEntries.has(entry.id))
                const cellWrong = checked && Boolean(values[key]) && !cellCorrect
                const number = puzzle.entries.find((entry) => cellKey(entry.cells[0]) === key)?.number
                return (
                  <Box key={key} sx={{ position: 'relative', minWidth: 0 }}>
                    {number && <Typography component="span" sx={{ position: 'absolute', zIndex: 2, top: 1, right: 2, color: 'var(--awm-muted)', fontSize: 8, lineHeight: 1, pointerEvents: 'none' }}>{number}</Typography>}
                    <Box
                      component="input"
                      id={`crossword-${key}`}
                      value={values[key] ?? ''}
                      onClick={() => selectCell(cell)}
                      onFocus={() => { const first = entries[0]; if (first && !entries.some((entry) => entry.id === selectedEntryId)) setSelectedEntryId(first.id) }}
                      onChange={(event) => updateCell(cell, event.currentTarget.value)}
                      aria-label={`Crossword cell row ${rowIndex + 1}, column ${colIndex + 1}`}
                      lang="ar"
                      dir="rtl"
                      inputMode="text"
                      autoComplete="off"
                      sx={{ boxSizing: 'border-box', width: '100%', height: '100%', p: 0, border: '1px solid', borderColor: cellWrong ? '#b3261e' : selected ? 'var(--awm-gold)' : 'color-mix(in srgb, var(--awm-bark) 34%, transparent)', borderRadius: 0, outline: 0, bgcolor: cellCorrect ? 'color-mix(in srgb, #4f7f64 20%, white)' : selected ? 'color-mix(in srgb, var(--awm-gold) 9%, white)' : '#fff', color: 'var(--awm-bark)', fontFamily: 'var(--font-book-naskh), serif', fontSize: { xs: 20, sm: 25 }, fontWeight: 700, textAlign: 'center', caretColor: 'var(--awm-gold)', '&:focus': { position: 'relative', zIndex: 1, outline: '2px solid var(--awm-gold)', outlineOffset: -2 } }}
                    />
                  </Box>
                )
              }))}
            </Box>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', bgcolor: 'var(--awm-white)' }}>
            <Typography component="h2" sx={{ mb: 1.5, fontFamily: 'var(--font-heading)', fontSize: 25, fontWeight: 600, color: 'var(--awm-bark)' }}>English clues</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', lg: '1fr' }, gap: 2.5 }}>{renderClues('across')}{renderClues('down')}</Box>
          </Paper>
        </Box>
      )}
    </GamePageShell>
  )
}
