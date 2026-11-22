'use client'

import { useRef, useState } from 'react'
import { Alert, Box, Button, ButtonGroup, Paper, Typography } from '@mui/material'
import AdminTextField from './AdminTextField'
import { saveChapterAudioTimingsForAdmin } from '@/app/actions/audiobooks'
import type { AudioLanguage } from '@/app/lib/audioUpload'
import { chapterAudioSentences, type ChapterAudioTimingSegment, type ChapterAudioTimings } from '@/app/lib/chapterAudioTimings'
import { errorMessage } from '@/app/lib/errors'

export default function ChapterAudioTimingEditor({ chapterId, language, content, audioUrl, initialTimings, disabled, onSaved }: {
  chapterId: string
  language: AudioLanguage
  content: unknown
  audioUrl: string | null
  initialTimings: ChapterAudioTimings | null
  disabled: boolean
  onSaved: (timings: ChapterAudioTimings) => void
}) {
  const sentences = chapterAudioSentences(content)
  const [segments, setSegments] = useState<ChapterAudioTimingSegment[]>(initialTimings?.segments ?? [])
  const [selected, setSelected] = useState(initialTimings?.segments[0]?.blockIndex ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const reviewEndRef = useRef<number | null>(null)
  const segment = segments.find(item => item.blockIndex === selected) ?? null
  const sentence = sentences[selected]

  if (!sentences.length) return null
  if (!audioUrl) return <Alert severity="info">Preview the saved audio to review and edit sentence timestamps.</Alert>

  const updateSegment = (startMs: number, endMs: number) => {
    setSegments(current => [...current.filter(item => item.blockIndex !== selected), { blockIndex: selected, startMs, endMs }].sort((a, b) => a.blockIndex - b.blockIndex))
    setStatus('')
  }
  const captureStart = () => {
    const audio = audioRef.current
    if (!audio) return
    const startMs = Math.round(audio.currentTime * 1000)
    const durationMs = Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : startMs + 2000
    const endMs = segment && segment.endMs > startMs ? segment.endMs : Math.min(durationMs, startMs + 2000)
    updateSegment(startMs, Math.max(startMs + 1, endMs))
  }
  const captureEnd = () => {
    const audio = audioRef.current
    if (!audio || !segment) return
    updateSegment(segment.startMs, Math.round(audio.currentTime * 1000))
  }
  const reviewSegment = async () => {
    const audio = audioRef.current
    if (!audio || !segment || segment.endMs <= segment.startMs) return
    reviewEndRef.current = segment.endMs / 1000
    audio.currentTime = segment.startMs / 1000
    try { await audio.play() } catch { setError('Audio playback was blocked. Use the audio controls to start playback, then retry.') }
  }
  const save = async () => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) { setError('Wait for the audio duration to load before saving.'); return }
    setSaving(true); setError(''); setStatus('')
    try {
      const saved = await saveChapterAudioTimingsForAdmin({
        chapterId,
        language,
        draft: { durationMs: Math.round(audio.duration * 1000), segments },
      })
      onSaved(saved)
      setStatus(`Saved ${saved.segments.length} timed sentences.`)
    } catch (cause) { setError(errorMessage(cause) ?? 'Unable to save audiobook timings.') }
    finally { setSaving(false) }
  }

  return <Paper elevation={0} sx={{ border: '1px solid rgba(184,134,11,0.45)', borderRadius: '10px', p: 2 }}>
    <Typography sx={{ fontWeight: 600 }}>Sentence timestamps</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{segments.length} of {sentences.length} sentences timed. Select a sentence, capture boundaries, and replay it to review.</Typography>
    <audio
      ref={audioRef}
      controls
      preload="metadata"
      src={audioUrl}
      onTimeUpdate={event => {
        if (reviewEndRef.current !== null && event.currentTarget.currentTime >= reviewEndRef.current) {
          event.currentTarget.pause()
          reviewEndRef.current = null
        }
      }}
      style={{ width: '100%', marginBottom: 12 }}
    />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(180px, 0.8fr) minmax(0, 2fr)' }, gap: 2 }}>
      <Box sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
        {sentences.map(item => <Button key={item.blockIndex} onClick={() => { setSelected(item.blockIndex); setStatus('') }} sx={{ display: 'block', width: '100%', minHeight: 40, px: 1, py: 0.75, textAlign: 'left', textTransform: 'none', borderRadius: 0, color: 'var(--awm-bark)', bgcolor: selected === item.blockIndex ? 'rgba(184,134,11,0.14)' : segments.some(segment => segment.blockIndex === item.blockIndex) ? 'rgba(14,46,31,0.06)' : 'transparent' }}>
          {item.blockIndex + 1}. {item.translation || item.arabic}
        </Button>)}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {sentence && <Box sx={{ mb: 2 }}>
          <Typography lang="ar" dir="rtl" sx={{ fontFamily: 'var(--font-book-naskh), serif', fontSize: 22, lineHeight: 1.8 }}>{sentence.arabic}</Typography>
          <Typography variant="body2" color="text.secondary">{sentence.translation}</Typography>
        </Box>}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <AdminTextField label="Start seconds" type="number" size="small" value={segment ? String(segment.startMs / 1000) : ''} onChange={event => updateSegment(Math.max(0, Math.round(Number(event.target.value) * 1000)), segment?.endMs ?? Math.round(Number(event.target.value) * 1000) + 2000)} />
          <AdminTextField label="End seconds" type="number" size="small" value={segment ? String(segment.endMs / 1000) : ''} onChange={event => { if (segment) updateSegment(segment.startMs, Math.round(Number(event.target.value) * 1000)) }} />
        </Box>
        <ButtonGroup sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <Button onClick={captureStart}>Set start at playhead</Button>
          <Button onClick={captureEnd} disabled={!segment}>Set end at playhead</Button>
          <Button onClick={() => void reviewSegment()} disabled={!segment}>Replay segment</Button>
          <Button onClick={() => { setSegments(current => current.filter(item => item.blockIndex !== selected)); setStatus('') }} disabled={!segment}>Clear</Button>
        </ButtonGroup>
      </Box>
    </Box>
    {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
    {status && <Alert severity="success" sx={{ mt: 2 }}>{status}</Alert>}
    <Button variant="contained" onClick={() => void save()} disabled={disabled || saving} sx={{ mt: 2, textTransform: 'none' }}>{saving ? 'Saving timestamps…' : 'Validate and save timestamps'}</Button>
  </Paper>
}
