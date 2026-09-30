'use client'

import { useMemo, useState } from 'react'
import { CheckCircle, LightbulbOutlined, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Typography } from '@mui/material'
import { fetchPuzzleVocabulary } from '@/app/actions/puzzles'
import GamePageShell from '@/app/components/puzzles/GamePageShell'
import { generateWordSearch, sameCells, straightLineBetween, type PuzzleCell, type PuzzleVocabularySource, type WordSearchPuzzle } from '@/app/lib/transcriptPuzzles'

function cellKey(cell: PuzzleCell): string {
  return `${cell.row}:${cell.col}`
}

export default function WordSearchGame({ initialSource, initialPuzzle }: { initialSource: PuzzleVocabularySource | null; initialPuzzle: WordSearchPuzzle | null }) {
  const [source, setSource] = useState(initialSource)
  const [puzzle, setPuzzle] = useState(initialPuzzle)
  const [found, setFound] = useState<Set<string>>(() => new Set())
  const [start, setStart] = useState<PuzzleCell | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const foundCells = useMemo(() => new Set(
    puzzle?.placements.filter((placement) => found.has(placement.id)).flatMap((placement) => placement.cells.map(cellKey)) ?? [],
  ), [found, puzzle])
  const solutionCells = useMemo(() => new Set(
    revealed ? puzzle?.placements.flatMap((placement) => placement.cells.map(cellKey)) ?? [] : [],
  ), [puzzle, revealed])
  const complete = Boolean(puzzle?.placements.length) && found.size === puzzle?.placements.length

  const reset = () => {
    setFound(new Set())
    setStart(null)
    setRevealed(false)
    setMessage('')
  }

  const newGame = async () => {
    setBusy(true)
    setMessage('')
    try {
      const nextSource = await fetchPuzzleVocabulary(source?.episodeId)
      if (!nextSource) {
        setMessage('No transcript vocabulary is available for a new puzzle right now.')
        return
      }
      const nextPuzzle = generateWordSearch(nextSource.words, { count: 8 })
      if (nextPuzzle.placements.length === 0) {
        setMessage('This transcript could not produce a word search. Please try again.')
        return
      }
      setSource(nextSource)
      setPuzzle(nextPuzzle)
      reset()
    } catch {
      setMessage('Unable to create a new puzzle. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const selectCell = (cell: PuzzleCell) => {
    if (!puzzle || revealed) return
    if (!start) {
      setStart(cell)
      setMessage('Select the final letter of the Arabic word.')
      return
    }
    const selection = straightLineBetween(start, cell)
    const match = puzzle.placements.find((placement) => (
      sameCells(selection, placement.cells) || sameCells(selection, [...placement.cells].reverse())
    ))
    if (!match) setMessage(selection.length ? 'That line is not one of the words. Try again.' : 'Select a horizontal, vertical, or diagonal line.')
    else if (found.has(match.id)) setMessage('You already found that word.')
    else {
      setFound((current) => new Set(current).add(match.id))
      setMessage(`Found: ${match.english}`)
    }
    setStart(null)
  }

  const controls = (
    <Box sx={{ mb: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <Chip label={`${found.size} / ${puzzle?.placements.length ?? 0} found`} sx={{ bgcolor: 'color-mix(in srgb, var(--awm-gold) 14%, transparent)', color: 'var(--awm-bark)', fontWeight: 800 }} />
      <Button onClick={reset} disabled={!puzzle || busy} startIcon={<Refresh />} sx={{ color: 'var(--awm-forest)', textTransform: 'none' }}>Reset</Button>
      <Button onClick={() => { setRevealed(true); setStart(null); setMessage('Solution revealed.') }} disabled={!puzzle || revealed || busy} startIcon={<LightbulbOutlined />} sx={{ color: 'var(--awm-forest)', textTransform: 'none' }}>Reveal solution</Button>
      <Button onClick={() => void newGame()} disabled={busy} variant="contained" sx={{ ml: { sm: 'auto' }, bgcolor: 'var(--awm-gold)', color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#946c08' } }}>{busy ? <CircularProgress size={20} color="inherit" /> : 'New Game'}</Button>
    </Box>
  )

  return (
    <GamePageShell title="Word Search" intro="Use each English meaning as a clue, then find its Arabic word in the letter grid." source={source} controls={controls}>
      {message && <Alert severity={complete ? 'success' : 'info'} sx={{ mb: 2 }}>{message}</Alert>}
      {complete && <Alert icon={<CheckCircle />} severity="success" sx={{ mb: 2 }}>Puzzle complete — you found every word.</Alert>}
      {!puzzle || puzzle.placements.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)' }}>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: 'var(--awm-bark)' }}>No puzzle available</Typography>
          <Button onClick={() => void newGame()} disabled={busy} variant="contained" sx={{ mt: 2, bgcolor: 'var(--awm-gold)' }}>Try another transcript</Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) 300px' }, gap: 2.5, alignItems: 'start' }}>
          <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 }, borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', bgcolor: 'var(--awm-white)' }}>
            <Box role="grid" aria-label="Arabic word search" dir="ltr" sx={{ mx: 'auto', width: '100%', maxWidth: 560, display: 'grid', gridTemplateColumns: `repeat(${puzzle.grid.length}, minmax(0, 1fr))`, gap: { xs: 0.35, sm: 0.6 } }}>
              {puzzle.grid.flatMap((row, rowIndex) => row.map((letter, colIndex) => {
                const key = `${rowIndex}:${colIndex}`
                const selected = start?.row === rowIndex && start.col === colIndex
                const isFound = foundCells.has(key)
                const isSolution = solutionCells.has(key)
                return (
                  <Box
                    component="button"
                    type="button"
                    role="gridcell"
                    key={key}
                    onClick={() => selectCell({ row: rowIndex, col: colIndex })}
                    aria-label={`Arabic letter ${letter}, row ${rowIndex + 1}, column ${colIndex + 1}`}
                    lang="ar"
                    dir="rtl"
                    sx={{ aspectRatio: '1', minWidth: 0, p: 0, display: 'grid', placeItems: 'center', border: '1px solid', borderColor: selected ? 'var(--awm-forest)' : isFound ? '#4f7f64' : isSolution ? 'var(--awm-gold)' : 'color-mix(in srgb, var(--awm-bark) 18%, transparent)', borderRadius: { xs: '4px', sm: '7px' }, bgcolor: selected ? 'color-mix(in srgb, var(--awm-forest) 16%, white)' : isFound ? 'color-mix(in srgb, #4f7f64 24%, white)' : isSolution ? 'color-mix(in srgb, var(--awm-gold) 22%, white)' : 'var(--awm-white)', color: 'var(--awm-bark)', fontFamily: 'var(--font-book-naskh), serif', fontSize: { xs: 'clamp(.85rem, 5vw, 1.25rem)', sm: 24 }, fontWeight: 700, cursor: 'pointer', '&:focus-visible': { outline: '3px solid var(--awm-gold)', outlineOffset: 1 } }}
                  >{letter}</Box>
                )
              }))}
            </Box>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--awm-bark) 12%, transparent)', bgcolor: 'var(--awm-white)' }}>
            <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 600, color: 'var(--awm-bark)' }}>Find these meanings</Typography>
            <Box component="ol" sx={{ m: 0, mt: 1.5, pl: 2.5, display: 'grid', gap: 1 }}>
              {puzzle.placements.map((word) => <Typography component="li" key={word.id} sx={{ color: found.has(word.id) ? '#4f7f64' : 'var(--awm-bark)', fontFamily: 'Jost, sans-serif', fontWeight: found.has(word.id) ? 700 : 500, textDecoration: found.has(word.id) ? 'line-through' : 'none' }}>{word.english}</Typography>)}
            </Box>
          </Paper>
        </Box>
      )}
    </GamePageShell>
  )
}
