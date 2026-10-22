'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Celebration, CheckCircle, EmojiEvents } from '@mui/icons-material'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, Paper, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { completeWordSearch, fetchPuzzleVocabulary, type WordSearchCompletionResult } from '@/app/actions/puzzles'
import WordSearchShell from './WordSearchShell'
import { generateWordSearch, sameCells, straightLineBetween, WORD_SEARCH_DIFFICULTIES, type PuzzleCell, type PuzzleVocabularySource, type WordSearchDifficulty, type WordSearchPuzzle } from '@/app/lib/transcriptPuzzles'
import { calculateWordSearchAccuracy, formatWordSearchDuration, shouldCompleteWordSearch, type WordSearchCompletionStats } from '@/app/lib/wordSearchProgress'
import WordSearchClues from './WordSearchClues'
import WordSearchDifficultySelector from './WordSearchDifficultySelector'
import { useAuth } from '@/app/AuthContext'

function cellKey(cell: PuzzleCell): string {
  return `${cell.row}:${cell.col}`
}

interface DragSelection {
  pointerId: number
  start: PuzzleCell
  cells: PuzzleCell[]
}

interface CompletionSummary extends WordSearchCompletionStats, WordSearchCompletionResult {}

export default function WordSearchGame({ initialSource, initialPuzzle }: { initialSource: PuzzleVocabularySource | null; initialPuzzle: WordSearchPuzzle | null }) {
  const router = useRouter()
  const { user } = useAuth()
  const [source, setSource] = useState(initialSource)
  const [puzzle, setPuzzle] = useState(initialPuzzle)
  const [selectedDifficulty, setSelectedDifficulty] = useState<WordSearchDifficulty>('regular')
  const [activeDifficulty, setActiveDifficulty] = useState<WordSearchDifficulty>('regular')
  const [started, setStarted] = useState(false)
  const [found, setFound] = useState<Set<string>>(() => new Set())
  const [drag, setDrag] = useState<DragSelection | null>(null)
  const [invalidCells, setInvalidCells] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [mistakes, setMistakes] = useState(0)
  const [revealsUsed, setRevealsUsed] = useState(0)
  const [round, setRound] = useState(0)
  const [completion, setCompletion] = useState<CompletionSummary | null>(null)
  const [pendingCompletion, setPendingCompletion] = useState<WordSearchCompletionStats | null>(null)
  const [completionError, setCompletionError] = useState('')
  const [savingCompletion, setSavingCompletion] = useState(false)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const invalidTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const completionSubmittedRef = useRef(false)
  const completionIdRef = useRef('')

  const foundCells = useMemo(() => new Set(
    puzzle?.placements.filter((placement) => found.has(placement.id)).flatMap((placement) => placement.cells.map(cellKey)) ?? [],
  ), [found, puzzle])
  const dragCells = useMemo(() => new Set(drag?.cells.map(cellKey) ?? []), [drag])
  const complete = Boolean(puzzle?.placements.length) && found.size === puzzle?.placements.length

  useEffect(() => () => {
    if (invalidTimerRef.current !== null) window.clearTimeout(invalidTimerRef.current)
  }, [])

  useEffect(() => {
    if (!started || !source || !puzzle?.placements.length) {
      return
    }
    startedAtRef.current = Date.now()
    completionIdRef.current = crypto.randomUUID()
    completionSubmittedRef.current = false
  }, [puzzle, round, source, started])

  const saveCompletion = async (stats: WordSearchCompletionStats) => {
    if (!source) return
    if (!user) {
      setCompletion({ ...stats, awarded: 0, totalXp: 0, duplicate: false, previousLevel: 1, level: 1 })
      return
    }
    setSavingCompletion(true)
    setCompletionError('')
    const result = await completeWordSearch({
      completionId: completionIdRef.current,
      puzzleId: source.puzzleId,
      sourceType: source.type,
      sourceId: source.id,
      difficulty: activeDifficulty,
      ...stats,
    })
    setSavingCompletion(false)
    if (!result.ok) {
      setCompletionError(result.error)
      return
    }
    setCompletion({ ...stats, ...result.data })
  }

  useEffect(() => {
    if (!puzzle || !source || !shouldCompleteWordSearch(found.size, puzzle.placements.length, completionSubmittedRef.current)) return
    completionSubmittedRef.current = true
    const stats: WordSearchCompletionStats = {
      wordCount: puzzle.placements.length,
      wordsFound: found.size,
      mistakes,
      hintsUsed: 0,
      revealsUsed,
      durationSeconds: Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)),
    }
    setPendingCompletion(stats)
    void saveCompletion(stats)
    // saveCompletion is intentionally invoked only on the first final-word transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found.size, mistakes, puzzle, revealsUsed, source])

  const installPuzzle = (nextSource: PuzzleVocabularySource, nextPuzzle: WordSearchPuzzle, difficulty: WordSearchDifficulty) => {
    setFound(new Set())
    setDrag(null)
    setInvalidCells(new Set())
    setMessage('')
    setMistakes(0)
    setRevealsUsed(0)
    setCompletion(null)
    setPendingCompletion(null)
    setCompletionError('')
    setSource(nextSource)
    setPuzzle(nextPuzzle)
    setActiveDifficulty(difficulty)
    setStarted(true)
    setRound((current) => current + 1)
  }

  const puzzleFor = (candidate: PuzzleVocabularySource, difficulty: WordSearchDifficulty) => {
    const config = WORD_SEARCH_DIFFICULTIES[difficulty]
    const nextPuzzle = generateWordSearch(candidate.words, { difficulty })
    return nextPuzzle.placements.length >= config.minimumWords ? nextPuzzle : null
  }

  const startGame = async () => {
    setBusy(true)
    setMessage('')
    try {
      const config = WORD_SEARCH_DIFFICULTIES[selectedDifficulty]
      let nextSource = source
      let nextPuzzle = nextSource ? puzzleFor(nextSource, selectedDifficulty) : null
      if (!nextSource || !nextPuzzle) {
        nextSource = await fetchPuzzleVocabulary(undefined, config.minimumWords)
        nextPuzzle = nextSource ? puzzleFor(nextSource, selectedDifficulty) : null
      }
      if (!nextSource || !nextPuzzle) {
        setMessage(`Not enough reliable vocabulary is available for a ${config.label.toLowerCase()} puzzle yet.`)
        return
      }
      installPuzzle(nextSource, nextPuzzle, selectedDifficulty)
    } catch (error) {
      console.error('[word-search] Unable to start puzzle:', error)
      setMessage('Unable to create this puzzle. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const newGame = async () => {
    setBusy(true)
    setMessage('')
    setCompletion(null)
    try {
      const config = WORD_SEARCH_DIFFICULTIES[selectedDifficulty]
      const nextSource = await fetchPuzzleVocabulary(source ? `${source.type}:${source.id}` : undefined, config.minimumWords)
      if (!nextSource) {
        setMessage('Not enough reliable vocabulary is available for a new puzzle yet.')
        return
      }
      const nextPuzzle = puzzleFor(nextSource, selectedDifficulty)
      if (!nextPuzzle) {
        setMessage(`This source could not produce a reliable ${config.label.toLowerCase()} word search. Please try another.`)
        return
      }
      installPuzzle(nextSource, nextPuzzle, selectedDifficulty)
    } catch (error) {
      console.error('[word-search] Unable to generate puzzle:', error)
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
    if (!puzzle || complete) return
    const match = puzzle.placements.find((placement) => (
      sameCells(selection, placement.cells) || sameCells(selection, [...placement.cells].reverse())
    ))
    if (!match) {
      flashInvalidSelection(selection)
      if (selection.length > 1) setMistakes((current) => current + 1)
      setMessage(selection.length > 1 ? 'That line is not one of the words. Try again.' : 'Drag across a complete word.')
    } else if (found.has(match.id)) setMessage('You already found that word.')
    else {
      setFound((current) => new Set(current).add(match.id))
      setMessage(`Found: ${match.english}`)
    }
  }

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, cell: PuzzleCell) => {
    if (!puzzle || complete || (event.pointerType === 'mouse' && event.button !== 0)) return
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

  const activeConfig = WORD_SEARCH_DIFFICULTIES[activeDifficulty]
  const selectedConfig = WORD_SEARCH_DIFFICULTIES[selectedDifficulty]
  const controls = started ? (
    <Box sx={{mb:2.5}}>
      <Box sx={{display:'flex',justifyContent:'center',mb:1.25}}><WordSearchDifficultySelector value={selectedDifficulty} disabled={busy || savingCompletion} onChange={setSelectedDifficulty}/></Box>
      <Box data-word-search-status sx={{display:'flex',flexWrap:'wrap',justifyContent:'center',alignItems:'center',gap:.5,'& .MuiChip-root, & .MuiButton-root':{height:44,borderRadius:'999px',fontSize:13,fontWeight:600},'& .MuiChip-root':{color:'var(--awm-bark)',bgcolor:'var(--awm-cream)',border:'1px solid color-mix(in srgb, var(--awm-gold) 30%, transparent)'},'& .MuiChip-label':{px:1}}}>
        <Chip label={`${activeConfig.label} ${activeConfig.gridSize}\u00d7${activeConfig.gridSize}`}/>
        <Chip label={`${found.size} of ${puzzle?.placements.length ?? 0} found`}/>
        <Button aria-label="New game" variant="contained" onClick={()=>void newGame()} disabled={busy} sx={{px:1,minWidth:0,textTransform:'none'}}>{busy?<CircularProgress size={20} aria-label="Loading new game"/>:'New Game'}</Button>
      </Box>
    </Box>
  ) : undefined

  const accuracy = completion ? calculateWordSearchAccuracy(completion.wordsFound, completion.mistakes) : 0

  return (
    <WordSearchShell source={source} controls={controls}>
      {message && <Alert severity={complete ? 'success' : 'info'} sx={{ mb: 2 }}>{message}</Alert>}
      {completionError && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" disabled={savingCompletion} onClick={() => pendingCompletion && void saveCompletion(pendingCompletion)}>Retry save</Button>}>
          {completionError}
        </Alert>
      )}
      {!started ? (
        <Paper elevation={0} sx={{ mx: 'auto', maxWidth: 720, p: { xs: 2, sm: 3 }, textAlign: 'center', borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: { xs: 28, sm: 34 }, fontWeight: 600, color: 'text.primary' }}>Choose your difficulty</Typography>
          <Typography sx={{ mt: 0.5, mb: 2.25, color: 'text.secondary', fontFamily: 'var(--font-sans), sans-serif' }}>Select a level, then start your puzzle.</Typography>
          <WordSearchDifficultySelector value={selectedDifficulty} disabled={busy} onChange={setSelectedDifficulty} />
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75 }}>
            <Chip label={`${selectedConfig.gridSize} × ${selectedConfig.gridSize} grid`} variant="outlined" />
            <Chip label={`${selectedConfig.wordCount} target words`} variant="outlined" />
            <Chip label={selectedDifficulty === 'easy' ? 'Horizontal & vertical' : 'All directions'} variant="outlined" />
          </Box>
          <Button onClick={() => void startGame()} disabled={busy} variant="contained" size="large" sx={{ mt: 2.5, minWidth: 190, minHeight: 48, borderRadius: '10px', textTransform: 'none', fontWeight: 800 }}>
            {busy ? <CircularProgress size={22} color="inherit" /> : `Start ${selectedConfig.label}`}
          </Button>
        </Paper>
      ) : !puzzle || puzzle.placements.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography sx={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: 'text.primary' }}>No puzzle available</Typography>
          <Typography sx={{ mt: 0.75, color: 'text.secondary', fontFamily: 'var(--font-sans), sans-serif' }}>Not enough reliable vocabulary is available for this activity yet.</Typography>
          <Button onClick={() => void newGame()} disabled={busy} variant="contained" sx={{ mt: 2 }}>Try another source</Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 2, lg: 2.5 }, alignItems: 'start' }}>
          <Paper elevation={0} sx={{ minWidth: 0, p: { xs: 0.35, sm: 1.25 }, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box ref={gridRef} role="grid" aria-label={`${activeConfig.label} Arabic word search, ${activeConfig.gridSize} by ${activeConfig.gridSize}. Drag in a straight line to select a word.`} dir="ltr" onPointerMove={updateDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} sx={{ mx: 'auto', width: '100%', maxWidth: activeConfig.maxBoardWidth, display: 'grid', gridTemplateColumns: `repeat(${puzzle.grid.length}, minmax(0, 1fr))`, gap: activeDifficulty === 'easy' ? { xs: '2px', sm: '4px' } : activeDifficulty === 'regular' ? { xs: '1.5px', sm: '3px' } : { xs: '1px', sm: '2px' }, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
              {puzzle.grid.flatMap((row, rowIndex) => row.map((letter, colIndex) => {
                const key = `${rowIndex}:${colIndex}`
                const isDragging = dragCells.has(key)
                const isInvalid = invalidCells.has(key)
                const isFound = foundCells.has(key)
                return (
                  <Box component="button" type="button" role="gridcell" key={key} data-word-search-cell="true" data-row={rowIndex} data-col={colIndex} onPointerDown={(event) => beginDrag(event, { row: rowIndex, col: colIndex })} aria-label={`Arabic letter ${letter}, row ${rowIndex + 1}, column ${colIndex + 1}`} lang="ar" dir="rtl"
                    sx={(theme) => {
                      const dark = theme.palette.mode === 'dark'
                      const borderColor = isInvalid ? theme.palette.error.main : isDragging ? theme.palette.primary.main : isFound ? theme.palette.success.main : theme.palette.divider
                      const backgroundColor = isInvalid ? alpha(theme.palette.error.main, dark ? 0.3 : 0.14) : isDragging ? alpha(theme.palette.primary.main, dark ? 0.24 : 0.17) : isFound ? alpha(theme.palette.success.main, dark ? 0.28 : 0.16) : theme.palette.background.default
                      const mobileFont = activeDifficulty === 'easy' ? 'clamp(.9rem, 7vw, 1.35rem)' : activeDifficulty === 'regular' ? 'clamp(.72rem, 4.8vw, 1.1rem)' : 'clamp(.62rem, 3.7vw, .95rem)'
                      const desktopFont = activeDifficulty === 'easy' ? 28 : activeDifficulty === 'regular' ? 23 : 20
                      return { aspectRatio: '1', minWidth: 0, p: 0, display: 'grid', placeItems: 'center', border: '1px solid', borderColor, borderRadius: activeDifficulty === 'hard' ? { xs: '2px', sm: '5px' } : { xs: '4px', sm: '7px' }, bgcolor: backgroundColor, color: theme.palette.text.primary, fontFamily: 'var(--font-book-naskh), serif', fontSize: { xs: mobileFont, sm: desktopFont }, lineHeight: 1, fontWeight: 700, cursor: complete ? 'default' : 'grab', transform: isDragging ? 'scale(1.055)' : 'scale(1)', boxShadow: isDragging ? `0 0 0 2px ${alpha(theme.palette.primary.main, dark ? 0.2 : 0.13)}` : isFound ? `inset 0 0 0 1px ${alpha(theme.palette.success.main, 0.28)}` : 'none', transition: 'background-color .16s ease, border-color .16s ease, color .16s ease, transform .12s ease, box-shadow .16s ease', '&:active': { cursor: complete ? 'default' : 'grabbing' }, '&:focus-visible': { outline: `3px solid ${alpha(theme.palette.primary.main, 0.55)}`, outlineOffset: 1 }, '@media (prefers-reduced-motion: reduce)': { transition: 'none', transform: 'none' } }
                    }}
                  >{letter}</Box>
                )
              }))}
            </Box>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, minWidth: 0, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 600, color: 'text.primary' }}>Vocabulary</Typography>
            <WordSearchClues key={`${source?.puzzleId}-${round}`} words={puzzle.placements} foundIds={found} sourceLabel={source ? `${source.title} · ${source.subtitle}` : 'Arabic with M'} onReveal={() => setRevealsUsed((current) => current + 1)} />
          </Paper>
        </Box>
      )}

      <Dialog open={Boolean(completion)} fullWidth maxWidth="xs" aria-labelledby="word-search-complete-title" slotProps={{ paper: { sx: { borderRadius: '18px', bgcolor: 'background.paper', overflow: 'hidden' } } }}>
        {completion && (
          <DialogContent sx={{ p: { xs: 2.5, sm: 4 }, textAlign: 'center' }}>
            <Box sx={{ width: 66, height: 66, mx: 'auto', display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'color-mix(in srgb, var(--awm-gold) 16%, transparent)', color: 'var(--awm-gold)', animation: 'awm-complete-pop .42s ease-out', '@keyframes awm-complete-pop': { from: { opacity: 0, transform: 'scale(.72)' }, to: { opacity: 1, transform: 'scale(1)' } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
              {completion.level > completion.previousLevel ? <EmojiEvents sx={{ fontSize: 38 }} /> : <Celebration sx={{ fontSize: 36 }} />}
            </Box>
            <Typography id="word-search-complete-title" component="h2" sx={{ mt: 1.5, fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 600, color: 'text.primary' }}>
              {completion.level > completion.previousLevel ? 'Level Up!' : 'Word Search Complete!'}
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary', fontFamily: 'var(--font-sans), sans-serif' }}>Nice work — you found every word.</Typography>
            <Typography sx={{ mt: 2, color: 'primary.main', fontFamily: 'var(--font-heading)', fontSize: 40, fontWeight: 700, lineHeight: 1 }}>
              {user ? `+${completion.awarded} XP` : 'Sign in to save XP'}
            </Typography>
            {completion.duplicate && <Typography sx={{ mt: 0.65, color: 'text.secondary', fontSize: 12 }}>This completion was already saved, so XP was not awarded twice.</Typography>}
            {completion.level > completion.previousLevel && <Chip icon={<CheckCircle />} label={`Level ${completion.previousLevel} → Level ${completion.level}`} color="success" sx={{ mt: 1.5, fontWeight: 700 }} />}
            <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 1 }}>
              {[
                ['Time', formatWordSearchDuration(completion.durationSeconds)],
                ['Words', `${completion.wordsFound} / ${completion.wordCount}`],
                ['Accuracy', `${accuracy}%`],
              ].map(([label, value]) => <Box key={label} sx={{ minWidth: 0, p: 1.25, borderRadius: '10px', bgcolor: 'action.hover' }}><Typography sx={{ color: 'text.secondary', fontFamily: 'var(--font-sans), sans-serif', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' }}>{label}</Typography><Typography sx={{ mt: 0.3, overflowWrap: 'anywhere', color: 'text.primary', fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700 }}>{value}</Typography></Box>)}
            </Box>
            <Typography sx={{ mt: 1.5, color: 'text.secondary', fontFamily: 'var(--font-sans), sans-serif', fontSize: 12 }}>{completion.mistakes} mistake{completion.mistakes === 1 ? '' : 's'} · {completion.revealsUsed} reveal{completion.revealsUsed === 1 ? '' : 's'}</Typography>
            <Button fullWidth variant="contained" onClick={() => router.push('/')} sx={{ mt: 2.5, minHeight: 48, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>Continue</Button>
            <Button fullWidth color="secondary" onClick={() => void newGame()} sx={{ mt: 0.75, textTransform: 'none' }}>Play Again</Button>
          </DialogContent>
        )}
      </Dialog>
    </WordSearchShell>
  )
}
