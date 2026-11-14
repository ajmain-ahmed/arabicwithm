'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  fetchGrammarNotes,
  processContentEnrichmentBatch,
  retryContentEnrichment,
  scanContentEnrichment,
  type GrammarDashboard,
  type GrammarNote,
} from '@/app/actions/grammarNotes'
import { CEFR_LEVELS } from '@/app/lib/contentEnrichment/types'
import GrammarNoteEditor from './GrammarNoteEditor'

export default function GrammarNotesPage() {
  const [status, setStatus] = useState<'candidate' | 'approved' | 'rejected'>('candidate')
  const [cefr, setCefr] = useState(''),
    [category, setCategory] = useState(''),
    [search, setSearch] = useState('')
  const [page, setPage] = useState(0),
    [revision, setRevision] = useState(0)
  const [data, setData] = useState<GrammarDashboard | null>(null),
    [selected, setSelected] = useState<GrammarNote | null>(null)
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  const stop = useRef(false)
  useEffect(() => {
    let active = true
    fetchGrammarNotes({
      status,
      cefr: cefr as '' | GrammarNote['rule_cefr'],
      category: category as '' | GrammarNote['category'],
      search,
      page,
    })
      .then((value) => {
        if (active) {
          setData(value)
          setError('')
        }
      })
      .catch(() => {
        if (active)
          setError('Unable to load Grammar Notes. Check the enrichment migration and retry.')
      })
    return () => {
      active = false
    }
  }, [status, cefr, category, search, page, revision])
  const refresh = () => setRevision((value) => value + 1)
  async function scan(mode: 'new' | 'all') {
    setBusy(true)
    setError('')
    stop.current = false
    let cursor = '',
      scanned = 0,
      queued = 0
    try {
      do {
        const batch = await scanContentEnrichment(mode, cursor)
        scanned += batch.scanned
        queued += batch.queued
        cursor = batch.after
        setMessage(`Checked ${scanned} sources. Queued ${queued} analyser jobs.`)
        if (batch.done) break
      } while (!stop.current)
      refresh()
    } catch {
      setError('The scan stopped. Already queued jobs are saved. Retry the scan to continue.')
    } finally {
      setBusy(false)
    }
  }
  async function processBatch() {
    setBusy(true)
    setError('')
    try {
      const results = await processContentEnrichmentBatch()
      setMessage(
        `Processed ${results.filter((result) => result.processed).length} chunks.${results.some((result) => result.warning) ? ' Review job warnings below.' : ''}`,
      )
      refresh()
    } catch {
      setError('Unable to process this batch. Saved content remains available. Retry below.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Typography component="h1" variant="h4">
        Grammar Notes
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button disabled={busy} onClick={() => void scan('new')}>
          Scan New / Unprocessed Content
        </Button>
        <Button disabled={busy} onClick={() => void scan('all')}>
          Scan Existing Content
        </Button>
        <Button disabled={busy} onClick={() => void processBatch()}>
          Process next batch
        </Button>
        <Button disabled={busy} onClick={refresh}>
          Refresh
        </Button>
        {busy && (
          <Button
            onClick={() => {
              stop.current = true
            }}
          >
            Stop scan after current batch
          </Button>
        )}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="info">{message}</Alert>}
      {data && !data.providerConfigured && (
        <Alert severity="warning">
          Configure the server-side analysis provider to enable contextual grammar discovery across
          A1–C2. Authored rule evidence remains available for review.
        </Alert>
      )}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {CEFR_LEVELS.map((level) => (
          <Chip key={level} label={`${level} · ${data?.distribution[level] ?? 0} candidates`} />
        ))}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status)
            setPage(0)
          }}
        >
          {['candidate', 'approved', 'rejected'].map((value) => (
            <MenuItem key={value} value={value}>
              {value === 'candidate'
                ? 'Candidates'
                : value === 'approved'
                  ? 'Approved'
                  : 'Rejected'}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="CEFR"
          value={cefr}
          onChange={(event) => {
            setCefr(event.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 100 }}
        >
          <MenuItem value="">All levels</MenuItem>
          {CEFR_LEVELS.map((level) => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {['nahw', 'sarf', 'balaghah'].map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Search notes"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(0)
          }}
          fullWidth
        />
      </Stack>
      {!data && !error && <Typography role="status">Loading Grammar Notes…</Typography>}
      {data?.notes.length === 0 && <Typography>No notes match these filters.</Typography>}
      {data?.notes.map((note) => (
        <Paper key={note.id} sx={{ p: 2, overflowWrap: 'anywhere' }}>
          <Typography component="h2" variant="h6">
            {note.title_en}
          </Typography>
          <Typography
            lang="ar"
            dir="rtl"
            sx={{ fontFamily: 'var(--font-book-naskh)', fontSize: '1.4rem' }}
          >
            {note.title_ar}
          </Typography>
          <Typography variant="body2">
            {note.rule_cefr} · {note.category} · {note.example_count} examples ·{' '}
            {note.pending_examples} pending examples · {Math.round(note.confidence * 100)}%
            confidence
          </Typography>
          <Typography sx={{ my: 1 }}>{note.explanation}</Typography>
          <Button onClick={() => setSelected(note)}>Inspect / Edit</Button>
        </Paper>
      ))}
      <Stack direction="row" spacing={2}>
        <Button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
          Previous notes
        </Button>
        <Button
          disabled={(data?.notes.length ?? 0) < 25}
          onClick={() => setPage((value) => value + 1)}
        >
          Next notes
        </Button>
      </Stack>
      <Typography component="h2" variant="h5">
        Enrichment status
      </Typography>
      <Typography variant="body2">
        {Object.entries(data?.job_counts ?? {})
          .map(([key, count]) => `${key} ${count}`)
          .join(' · ') || 'Not scanned'}
      </Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {data?.jobs.map((job) => (
          <Paper key={job.id} sx={{ p: 2, overflowWrap: 'anywhere' }}>
            <Typography variant="body2">
              {job.source_title} · {job.source_kind} · {job.analyser} · {job.status} · {job.cursor}{' '}
              source units processed
            </Typography>
            {job.error_code && (
              <Typography variant="body2">
                {job.error_code === 'analysis_provider_not_configured'
                  ? 'Configure the server-side analysis provider, then retry to discover additional grammar.'
                  : job.error_code.replaceAll('_', ' ')}
              </Typography>
            )}
            {['warnings', 'failed'].includes(job.status) && (
              <Button
                disabled={busy}
                onClick={async () => {
                  try {
                    await retryContentEnrichment(job.id)
                    refresh()
                  } catch {
                    setError('Unable to retry enrichment. Please try again.')
                  }
                }}
              >
                Retry enrichment
              </Button>
            )}
          </Paper>
        ))}
      </Box>
      {selected && (
        <GrammarNoteEditor
          key={selected.id}
          note={selected}
          onClose={() => setSelected(null)}
          onSaved={refresh}
        />
      )}
    </Stack>
  )
}
