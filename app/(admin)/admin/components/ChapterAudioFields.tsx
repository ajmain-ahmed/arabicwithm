'use client'

import { Box, Button, FormControl, FormControlLabel, InputLabel, LinearProgress, MenuItem, Select, Switch, Typography } from '@mui/material'
import AdminTextField from './AdminTextField'
import type { AudioSourceType, AdminChapterAudio } from '@/app/actions/audiobooks'
import type { AudioLanguage } from '@/app/lib/audioUpload'

export interface AudioDraft {
  exists: boolean; source: AudioSourceType; path: string | null; file: File | null
  youtubeId: string; narrator: string; duration: string; published: boolean
  sourceInput: string; linkedInput: string; bucket: string | null; externalUrl: string | null; preview: string | null; status: string
}
export const emptyAudioDraft = (language: AudioLanguage = 'ar'): AudioDraft => ({ exists: false, source: 'supabase_storage', path: null, file: null, youtubeId: '', narrator: '', duration: '', published: language === 'ar', sourceInput: '', linkedInput: '', bucket: null, externalUrl: null, preview: null, status: '' })
export function audioDraft(audio: AdminChapterAudio | null, language: AudioLanguage = 'ar'): AudioDraft {
  const input = audio?.externalUrl ?? (audio?.storagePath ? (/^https:/i.test(audio.storagePath) ? audio.storagePath : `${audio.storageBucket ?? 'audiobooks'}/${audio.storagePath}`) : '')
  return audio ? { ...emptyAudioDraft(language), exists: true, source: audio.sourceType, path: audio.storagePath, bucket: audio.storageBucket ?? 'audiobooks', externalUrl: audio.externalUrl ?? null, sourceInput: input, linkedInput: input, youtubeId: audio.externalVideoId ?? '', narrator: audio.narrator ?? '', duration: audio.durationSeconds ? String(audio.durationSeconds) : '', published: audio.isPublished ?? (language === 'ar') } : emptyAudioDraft(language)
}

export interface AudioOperation { phase: 'idle' | 'authorizing' | 'uploading' | 'saving' | 'saved' | 'error'; percent: number; error?: string }
export default function ChapterAudioFields({ language, value, onChange, onFile, onRemove, onLink, disabled, operation, onCancel, onRetry, onPreview }: {
  language: AudioLanguage; value: AudioDraft; onChange: (value: AudioDraft) => void
  onFile: (file: File) => void; onRemove: () => void; disabled: boolean
  onLink: () => void
  operation: AudioOperation; onCancel: () => void; onRetry: () => void; onPreview: () => void
}) {
  const label = language === 'ar' ? 'Arabic' : 'English'
  return <Box component="fieldset" sx={{ display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid var(--awm-gold)', borderRadius: '10px', p: 2, m: 0 }}>
    <Typography component="legend" sx={{ fontWeight: 600 }}>{label} Audiobook</Typography>
    <details><summary>Alternative source</summary><FormControl fullWidth size="small"><InputLabel id={`${language}-audio-source`}>Source</InputLabel><Select disabled={disabled} labelId={`${language}-audio-source`} label="Source" value={value.source === 'external_url' ? 'supabase_storage' : value.source} onChange={event => onChange({ ...value, source: event.target.value as AudioSourceType, path: null, bucket: null, file: null, externalUrl: null, preview: null })}><MenuItem value="supabase_storage">Audio file or URL</MenuItem><MenuItem value="youtube">YouTube</MenuItem></Select></FormControl></details>
    {value.source !== 'youtube' ? <Box>
      <AdminTextField disabled={disabled} label={`${label} Audio path or URL`} value={value.sourceInput} onChange={event => onChange({ ...value, sourceInput: event.target.value, file: null, duration: '', preview: null, status: '' })} helperText="Paste an existing Supabase path or HTTPS audio URL." fullWidth size="small" />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
      <Button variant="outlined" disabled={disabled || !value.sourceInput.trim()} onClick={onLink}>Save {label} audio</Button>
      <Button component="label" variant="outlined" disabled={disabled}>{value.exists || value.path || value.externalUrl ? `Replace ${label} file` : `Choose ${label} file`}<input aria-label={`${label} Audio file`} hidden type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onFile(file) }} /></Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{value.file?.name ?? value.path ?? value.externalUrl ?? 'MP3, M4A, AAC, WAV or OGG, up to 50 MB. Existing chapters upload and save immediately.'}</Typography>
      {value.file && <Button disabled={disabled} onClick={() => onChange({ ...value, file: null })}>Clear selected file</Button>}
      {(value.status || value.file || value.path || value.externalUrl) && <Typography variant="body2" sx={{ mt: 1 }}>{value.status || 'Audio linked'}{value.duration ? ` · ${Math.floor(Number(value.duration) / 60)}:${String(Number(value.duration) % 60).padStart(2, '0')}` : ' · Duration unknown'}</Typography>}
      {value.preview && <audio controls preload="metadata" src={value.preview} style={{ width: '100%', marginTop: 8 }} />}
    </Box> : <AdminTextField disabled={disabled} label={`${label} YouTube URL or video ID`} value={value.youtubeId} onChange={event => onChange({ ...value, youtubeId: event.target.value })} helperText="Public or unlisted watch links, youtu.be links, or an 11-character ID. Private videos cannot play for other listeners." fullWidth size="small" />}
    <Box role="status" aria-live="polite">
      {operation.phase !== 'idle' && <Typography variant="body2">{operation.phase === 'authorizing' ? 'Preparing upload…' : operation.phase === 'uploading' ? `Uploading ${operation.percent}%` : operation.phase === 'saving' ? 'Saving audio reference…' : operation.phase === 'saved' ? 'Audio saved' : operation.error}</Typography>}
      {['authorizing', 'uploading', 'saving', 'saved'].includes(operation.phase) && <LinearProgress aria-label={`${label} audio upload progress`} variant={operation.phase === 'authorizing' || operation.phase === 'saving' ? 'indeterminate' : 'determinate'} value={operation.percent} sx={{ mt: 1, height: 8, borderRadius: '10px', '& .MuiLinearProgress-bar': { transition: 'transform 200ms linear' } }} />}
    </Box>
    {(operation.phase === 'uploading' || operation.phase === 'authorizing') && <Button onClick={onCancel}>Cancel {label} upload</Button>}
    {operation.phase === 'error' && <Button disabled={disabled} onClick={onRetry}>Retry {label} audio</Button>}
    {value.exists && !value.preview && <Button disabled={disabled} onClick={onPreview}>Preview {label} audio</Button>}
    {value.source === 'youtube' && <Button disabled={disabled} onClick={onLink}>Save {label} audio</Button>}
    <FormControlLabel control={<Switch disabled={disabled} checked={value.published} onChange={event => onChange({ ...value, published: event.target.checked })} />} label={`Publish ${label} audio for AWM+ listeners`} />
    {(value.exists || value.file || value.path || value.externalUrl || value.sourceInput) && <Button color="error" variant="outlined" disabled={disabled} onClick={onRemove}>Remove {label} audiobook</Button>}
  </Box>
}
