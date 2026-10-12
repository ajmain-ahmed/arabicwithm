'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import { searchLearningContent, type ContentHit } from '@/app/actions/contentSearch'
import { useAuth } from '@/app/AuthContext'

export default function ContentSearch() {
  const { user } = useAuth()
  const [text, setText] = useState(''), [query, setQuery] = useState(''), [hits, setHits] = useState<ContentHit[]>([])
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [searched, setSearched] = useState(false), [more, setMore] = useState(false)
  const revision = useRef(0)
  async function search(append = false) {
    const current = ++revision.current, value = append ? query : text.trim()
    setBusy(true); setError('')
    try {
      const result = await searchLearningContent(value, append ? hits.at(-1)?.key : '')
      if (result.error) throw new Error(result.error)
      if (current !== revision.current) return
      setHits(old => append ? [...old, ...result.hits.filter(h => !old.some(o => o.key === h.key))] : result.hits)
      setQuery(value); setMore(result.more); setSearched(true)
    } catch (e) { if (current === revision.current) setError(e instanceof Error ? e.message : 'Search is unavailable.') }
    finally { if (current === revision.current) setBusy(false) }
  }
  return <Container maxWidth="md" sx={{ pt: 14, pb: 'calc(110px + env(safe-area-inset-bottom))' }}><Stack spacing={2}>
    <Button component={Link} href="/" sx={{ alignSelf: 'start' }}>Back to Quick Actions</Button>
    <Typography variant="h3">Search</Typography><Typography>Find shows, episodes and books in Arabic or English.</Typography>
    {!user && <Alert severity="info">Book titles are searchable. Sign in to search book text and read chapters.</Alert>}
    <Box component="form" onSubmit={e => { e.preventDefault(); void search() }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      <TextField fullWidth label="Search learning content" value={text} onChange={e => setText(e.target.value)} slotProps={{ htmlInput: { maxLength: 120, dir: 'auto' } }} />
      <Button type="submit" variant="contained" disabled={busy || text.trim().length < 2} sx={{ minHeight: 48 }}>Search</Button>
    </Stack></Box>
    {busy && <Typography role="status">Searching…</Typography>}{error && <Alert severity="error">{error}</Alert>}
    {searched && !busy && !error && !hits.length && <Typography>No matching content. Try another word or phrase.</Typography>}
    {hits.map(hit => <Paper key={hit.key} variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Typography variant="caption">{hit.kind} · {hit.source}</Typography>
      <Typography variant="h6">{hit.title}</Typography>{hit.arabic && <Typography dir="rtl" sx={{ fontSize: 25, fontFamily: 'var(--font-serif)', overflowWrap: 'anywhere' }}>{hit.arabic}</Typography>}
      {hit.english && <Typography>{hit.english}</Typography>}<Button component={Link} href={hit.href} sx={{ minHeight: 48 }}>Open {hit.kind === 'chapter' ? 'chapter' : hit.kind === 'episode' ? 'episode at this moment' : hit.kind}</Button>
    </Paper>)}{more && <Button disabled={busy} onClick={() => void search(true)}>Load more results</Button>}
  </Stack></Container>
}
