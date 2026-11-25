'use client'
import {UiText} from '@/app/components/WebsiteLocaleProvider'

import { useEffect, useState } from 'react'
import { Box, Button, Dialog, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material'
import { fetchPublicGrammarNotes, fetchCanonicalGrammarNote } from '@/app/actions/canonicalGrammar'
import { boundedRead } from '@/app/lib/readRecovery'
import AwmPageError from '@/app/components/AwmPageError'
import GrammarNoteRenderer, { type RenderableGrammarNote } from '@/app/components/grammar/GrammarNoteRenderer'

export default function EpisodeGrammarNotes({ episodeId, onClose }: { episodeId: string; onClose: () => void }) {
  const [page, setPage] = useState(0), [selected, setSelected] = useState<string | null>(null)
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof fetchPublicGrammarNotes>> | null>(null)
  const [note, setNote] = useState<RenderableGrammarNote | null>(null), [busy, setBusy] = useState(true), [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    const request = selected
      ? boundedRead(fetchCanonicalGrammarNote(selected, { kind: 'episode', sourceId: episodeId })).then(value => { if (active) setNote(value) })
      : boundedRead(fetchPublicGrammarNotes({ episodeId, page })).then(value => { if (active) setNotes(value) })
    request.catch(error => { console.error('[episode grammar] loading failed', error); if (active) setFailed(true) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [episodeId, page, selected])
  function selectNote(id: string | null) { setBusy(true); setFailed(false); setSelected(id) }
  function selectPage(next: number) { setBusy(true); setFailed(false); setPage(next) }
  return <Dialog open onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { height: 'min(80dvh, 760px)' } } }}><DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><UiText>{"Grammar Notes"}</UiText><Button onClick={onClose}><UiText>{"Close"}</UiText></Button></DialogTitle>
    <DialogContent>{busy ? <LinearProgress aria-label="Loading Grammar Notes" /> : failed ? <AwmPageError /> : selected ? <><Button onClick={() => selectNote(null)}><UiText>{"Back to Grammar Notes"}</UiText></Button>{note ? <GrammarNoteRenderer note={note} /> : <Typography role="status"><UiText>{"This Grammar Note is no longer available."}</UiText></Typography>}</> : <>
      {!notes?.notes.length && <Typography role="status"><UiText>{"No approved Grammar Notes are available for this Episode yet."}</UiText></Typography>}
      <Box sx={{ display: 'grid', gap: 2 }}>{notes?.notes.map(row => <Button key={row.id} variant="outlined" onClick={() => selectNote(row.id)} sx={{ p: 2, textTransform: 'none', display: 'block' }}>{row.title_en}<Typography lang="ar" dir="rtl">{row.title_ar}</Typography></Button>)}</Box>
      <Box sx={{ display: 'flex', mt: 2 }}>{page > 0 && <Button onClick={() => selectPage(page - 1)}><UiText>{"Previous"}</UiText></Button>}{notes?.hasMore && <Button onClick={() => selectPage(page + 1)}><UiText>{"Next"}</UiText></Button>}</Box>
    </>}</DialogContent></Dialog>
}
