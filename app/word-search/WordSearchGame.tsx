'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CheckCircle, LightbulbOutlined, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { fetchPuzzleVocabulary } from '@/app/actions/puzzles'
import GamePageShell from '@/app/components/puzzles/GamePageShell'
import { generateWordSearch, sameCells, straightLineBetween, type PuzzleCell, type PuzzleVocabularySource, type WordSearchPuzzle } from '@/app/lib/transcriptPuzzles'

function cellKey(cell: PuzzleCell): string {
  return `${cell.row}:${cell.col}`
}

interface DragSelection {
  pointerId: number
  start: PuzzleCell
  cells: PuzzleCell[]
}

export default function WordSearchGame({ initialSource, initialPuzzle }: { initialSource: PuzzleVocabularySource | null; initialPuzzle: WordSearchPuzzle | null }) {
  const [source, setSource] = useState(initialSource)
  const [puzzle, setPuzzle] = useState(initialPuzzle)
  const [found, setFound] = useState<Set<string>>(() => new Set())
  const [drag, setDrag] = useState<DragSelection | null>(null)
  const [invalidCells, setInvalidCells] = useState<Set<string>>(() => new Set())
  const [revealed, setRevealed] = useState(false)
  const [revealedWords, setRevealedWords] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const gridRef = useRef<HTMLDivElement | null>(null)
  const invalidTimerRef = useRef<number | null>(null)

  const foundCells = useMemo(() => new Set(
    puzzle?.placements.filter((placement) => found.has(placement.id)).flatMap((placement) => placement.cells.map(cellKey)) ?? [],
  ), [found, puzzle])
  const solutionCells = useMemo(() => new Set(
    revealed ? puzzle?.placements.flatMap((placement) => placement.cells.map(cellKey)) ?? [] : [],
  ), [puzzle, revealed])
  const dragCells = useMemo(() => new Set(drag?.cells.map(cellKey) ?? []), [drag])
  const complete = Boolean(puzzle?.placements.length) && found.size === puzzle?.placements.length

  useEffect(() => () => {
    if (invalidTimerRef.current !== null) window.clearTimeout(invalidTimerRef.current)
  }, [])

  const reset = () => {
    setFound(new Set())
    setDrag(null)
    setInvalidCells(new Set())
    setRevealed(false)
    setRevealedWords(new Set())
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

  const cellAtPointer = (event: ReactPointerEvent): PuzzleCell | null => {
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-word-search-cell="true"]')
    if (!element || !gridRef.current?.contains(element)) return null
    const row = Number(element.dataset.row)
    const col = Number(element.dataset.col)
    return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : null
  }

  const flashInvalidSelection = (selection: readonly PuzzleCell[]) => {
    if (invalidTimerRef.current !== null) window.clearTimeout(invalidTimerRef.current)
    setInvalidCells(new Set(selection.map(cellKey)))
    invalidTimerRef.current = window.setTimeout(() => {
      setInvalidCells(new Set())
      invalidTimerRef.current = null
    }, 220)
  }

  const checkSelection = (selection: PuzzleCell[]) => {
    if (!puzzle) return
    const match = puzzle.placements.find((placement) => (
      sameCells(selection, placement.cells) || sameCells(selection, [...placement.cells].reverse())
    ))
    if (!match) {
      flashInvalidSelection(selection)
      setMessage(selection.length > 1 ? 'That line is not one of the words. Try again.' : 'Drag across a complete word.')
    }
    else if (found.has(match.id)) setMessage('You already found that word.')
    else {
      setFound((current) => new Set(current).add(match.id))
      setMessage(`Found: ${match.english}`)
    }
  }

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, cell: PuzzleCell) => {
    if (!puzzle || revealed || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    if (invalidTimerRef.current !== null) window.clearTimeout(invalidTimerRef.current)
    setInvalidCells(new Set())
    setMessage('')
    setDrag({ pointerId: event.pointerId, start: cell, cells: [cell] })
    gridRef.current?.setPointerCapture(event.pointerId)
  }

  const updateDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()
    const end = cellAtPointer(event)
    if (!end) return
    const cells = straightLineBetween(drag.start, end)
    setDrag((current) => current && current.pointerId === event.pointerId
      ? { ...current, cells: cells.length > 0 ? cells : [current.start] }
      : current)
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()
    const end = cellAtPointer(event)
    const finalCells = end ? straightLineBetween(drag.start, end) : drag.cells
    const selection = finalCells.length > 0 ? finalCells : drag.cells
    setDrag(null)
    if (gridRef.current?.hasPointerCapture(event.pointerId)) gridRef.current.releasePointerCapture(event.pointerId)
    checkSelection(selection)
  }

  const cancelDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    setDrag(null)
    if (gridRef.current?.hasPointerCapture(event.pointerId)) gridRef.current.releasePointerCapture(event.pointerId)
  }

  const controls = (
    <Box sx={{ mb: 2.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <Chip label={`${found.size} / ${puzzle?.placements.length ?? 0} found`} sx={(theme) => ({ bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12), color: 'text.primary', fontWeight: 800 })} />
      <Button onClick={reset} disabled={!puzzle || busy} startIcon={<Refresh />} color="secondary">Reset</Button>
      <Button onClick={() => { setRevealed(true); setDrag(null); setMessage('Solution revealed.') }} disabled={!puzzle || revealed || busy} startIcon={<LightbulbOutlined />} color="secondary">Reveal solution</Button>
      <Button onClick={() => void newGame()} disabled={busy} variant="contained" sx={{ ml: { sm: 'auto' } }}>{busy ? <CircularProgress size={20} color="inherit" /> : 'New Game'}</Button>
    </Box>
  )

  return (
    <GamePageShell title="Word Search" intro="Use each English meaning as a clue, then find its Arabic word in the letter grid." source={source} controls={controls}>
      {message && <Alert severity={complete ? 'success' : 'info'} sx={{ mb: 2 }}>{message}</Alert>}
      {complete && <Alert icon={<CheckCircle />} severity="success" sx={{ mb: 2 }}>Puzzle complete — you found every word.</Alert>}
      {!puzzle || puzzle.placements.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: 'text.primary' }}>No puzzle available</Typography>
          <Button onClick={() => void newGame()} disabled={busy} variant="contained" sx={{ mt: 2 }}>Try another transcript</Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) 300px' }, gap: 2.5, alignItems: 'start' }}>
          <Paper elevation={0} sx={{ p: { xs: 0.75, sm: 2 }, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box ref={gridRef} role="grid" aria-label="Arabic word search. Drag in a straight line to select a word." dir="ltr" onPointerMove={updateDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} sx={{ mx: 'auto', width: '100%', maxWidth: 560, display: 'grid', gridTemplateColumns: `repeat(${puzzle.grid.length}, minmax(0, 1fr))`, gap: { xs: 0.3, sm: 0.6 }, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
              {puzzle.grid.flatMap((row, rowIndex) => row.map((letter, colIndex) => {
                const key = `${rowIndex}:${colIndex}`
                const isDragging = dragCells.has(key)
                const isInvalid = invalidCells.has(key)
                const isFound = foundCells.has(key)
                const isSolution = solutionCells.has(key)
                return (
                  <Box
                    component="button"
                    type="button"
                    role="gridcell"
                    key={key}
                    data-word-search-cell="true"
                    data-row={rowIndex}
                    data-col={colIndex}
                    onPointerDown={(event) => beginDrag(event, { row: rowIndex, col: colIndex })}
                    aria-label={`Arabic letter ${letter}, row ${rowIndex + 1}, column ${colIndex + 1}`}
                    lang="ar"
                    dir="rtl"
                    sx={(theme) => {
                      const dark = theme.palette.mode === 'dark'
                      const borderColor = isInvalid
                        ? theme.palette.error.main
                        : isDragging
                          ? theme.palette.primary.main
                          : isFound
                            ? theme.palette.success.main
                            : isSolution
                              ? theme.palette.secondary.main
                              : theme.palette.divider
                      const backgroundColor = isInvalid
                        ? alpha(theme.palette.error.main, dark ? 0.3 : 0.14)
                        : isDragging
                          ? alpha(theme.palette.primary.main, dark ? 0.24 : 0.17)
                          : isFound
                            ? alpha(theme.palette.success.main, dark ? 0.28 : 0.16)
                            : isSolution
                              ? alpha(theme.palette.secondary.main, dark ? 0.22 : 0.13)
                              : theme.palette.background.default
                      return { aspectRatio: '1', minWidth: 0, p: 0, display: 'grid', placeItems: 'center', border: '1px solid', borderColor, borderRadius: { xs: '4px', sm: '7px' }, bgcolor: backgroundColor, color: theme.palette.text.primary, fontFamily: 'var(--font-book-naskh), serif', fontSize: { xs: 'clamp(.78rem, 4.4vw, 1.2rem)', sm: 24 }, fontWeight: 700, cursor: revealed ? 'default' : 'grab', transform: isDragging ? 'scale(1.055)' : 'scale(1)', boxShadow: isDragging ? `0 0 0 2px ${alpha(theme.palette.primary.main, dark ? 0.2 : 0.13)}` : isFound ? `inset 0 0 0 1px ${alpha(theme.palette.success.main, 0.28)}` : 'none', transition: 'background-color .16s ease, border-color .16s ease, color .16s ease, transform .12s ease, box-shadow .16s ease', '&:active': { cursor: revealed ? 'default' : 'grabbing' }, '&:focus-visible': { outline: `3px solid ${alpha(theme.palette.primary.main, 0.55)}`, outlineOffset: 1 }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' } }
                    }}
                  >{letter}</Box>
                )
              }))}
            </Box>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 600, color: 'text.primary' }}>Find these meanings</Typography>
            <Box component="ol" sx={{ m: 0, mt: 1.5, pl: 2.5, display: 'grid', gap: 1.15 }}>
              {puzzle.placements.map((word) => {
                const wordRevealed = revealedWords.has(word.id)
                return (
                  <Box component="li" key={word.id} sx={{ pl: 0.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ minWidth: 0, color: found.has(word.id) ? 'success.main' : 'text.primary', fontFamily: 'Jost, sans-serif', fontWeight: found.has(word.id) ? 700 : 500, textDecoration: found.has(word.id) ? 'line-through' : 'none' }}>{word.english}</Typography>
                      {!wordRevealed && <Button size="small" color="secondary" onClick={() => setRevealedWords((current) => new Set(current).add(word.id))} aria-label={`Reveal Arabic for ${word.english}`} sx={{ minWidth: 0, flexShrink: 0, px: 0.75, fontSize: 10.5 }}>Reveal Arabic</Button>}
                    </Box>
                    {wordRevealed && <Typography lang="ar" dir="rtl" sx={{ mt: 0.25, color: 'primary.main', fontFamily: 'var(--font-book-naskh), serif', fontSize: 19, fontWeight: 700, lineHeight: 1.25, animation: 'awm-clue-reveal .18s ease-out', '@keyframes awm-clue-reveal': { from: { opacity: 0, transform: 'translateY(-3px)' }, to: { opacity: 1, transform: 'translateY(0)' } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>{word.arabic}</Typography>}
                  </Box>
                )
              })}
            </Box>
          </Paper>
        </Box>
      )}
    </GamePageShell>
  )
}
