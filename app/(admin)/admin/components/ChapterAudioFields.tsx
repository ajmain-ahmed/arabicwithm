'use client'

import { Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, Typography } from '@mui/material'
import AdminTextField from './AdminTextField'
import type { AudioSourceType, AdminChapterAudio } from '@/app/actions/audiobooks'
import type { AudioLanguage } from '@/app/lib/audioUpload'

export interface AudioDraft {
  exists: boolean; source: AudioSourceType; path: string | null; file: File | null
  youtubeId: string; narrator: string; duration: string; published: boolean
}
export const emptyAudioDraft = (): AudioDraft => ({ exists: false, source: 'supabase_storage', path: null, file: null, youtubeId: '', narrator: '', duration: '', published: false })
export function audioDraft(audio: AdminChapterAudio | null): AudioDraft {
  return audio ? { exists: true, source: audio.sourceType, path: audio.storagePath, file: null, youtubeId: audio.externalVideoId ?? '', narrator: audio.narrator ?? '', duration: audio.durationSeconds ? String(audio.durationSeconds) : '', published: audio.isPublished } : emptyAudioDraft()
}

export default function ChapterAudioFields({ language, value, onChange, onFile, onRemove, disabled }: {
  language: AudioLanguage; value: AudioDraft; onChange: (value: AudioDraft) => void
  onFile: (file: File) => void; onRemove: () => void; disabled: boolean
}) {
  const label = language === 'ar' ? 'Arabic' : 'English'
  return <Box component="fieldset" disabled={disabled} sx={{ display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid var(--awm-gold)', borderRadius: '10px', p: 2, m: 0 }}>
    <Typography component="legend" sx={{ fontWeight: 600 }}>{label} Audio</Typography>
    <FormControl fullWidth size="small"><InputLabel id={`${language}-audio-source`}>Source</InputLabel><Select labelId={`${language}-audio-source`} label="Source" value={value.source} onChange={event => onChange({ ...value, source: event.target.value as AudioSourceType })}><MenuItem value="supabase_storage">Uploaded MP3 / M4A</MenuItem><MenuItem value="youtube">YouTube</MenuItem></Select></FormControl>
    {value.source === 'supabase_storage' ? <Box>
      <Button component="label" variant="outlined" disabled={disabled}>Upload {label} audiobook/audio file<input aria-label={`${label} Audio file`} hidden type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onFile(file) }} /></Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{value.file?.name ?? value.path ?? 'MP3 or M4A, up to 50 MB. Stored privately. Uploaded when you save.'}</Typography>
      {value.file && <Button disabled={disabled} onClick={() => onChange({ ...value, file: null })}>Clear selected file</Button>}
    </Box> : <AdminTextField label={`${label} YouTube video ID`} value={value.youtubeId} onChange={event => onChange({ ...value, youtubeId: event.target.value })} helperText="The 11-character ID, not the full URL." fullWidth size="small" />}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}><AdminTextField label={`${label} Narrator`} value={value.narrator} onChange={event => onChange({ ...value, narrator: event.target.value })} fullWidth size="small" /><AdminTextField label={`${label} Duration (seconds)`} type="number" value={value.duration} onChange={event => onChange({ ...value, duration: event.target.value })} fullWidth size="small" /></Box>
    <FormControlLabel control={<Switch checked={value.published} onChange={event => onChange({ ...value, published: event.target.checked })} />} label={`Publish ${label} audio for AWM+ listeners`} />
    {value.exists && <Button color="error" variant="outlined" disabled={disabled} onClick={onRemove}>Remove {label} audiobook</Button>}
  </Box>
}
