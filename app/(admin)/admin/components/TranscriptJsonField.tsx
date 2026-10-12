'use client'
import AdminTextField from './AdminTextField'

/** The same JSON entry control used by Show episodes and manual transcripts. */
export default function TranscriptJsonField({ value, onChange, mobile = false }: { value: string; onChange: (value: string) => void; mobile?: boolean }) {
  return <AdminTextField label="Transcript JSON" placeholder="Paste transcript JSON here..." helperText="Accepts content, sentences, segments, and timed AWM token blocks. Millisecond timings and tokens are preserved. Up to 20 MB." value={value} onChange={event => onChange(event.target.value)} fullWidth multiline rows={mobile ? 20 : 30} size="small" sx={{
    '& .MuiInputBase-root': { alignItems: 'flex-start', fontSize: '1.1rem', overflow: 'auto' },
    '& .MuiInputBase-input': { fontSize: '1.1rem', lineHeight: 1.5, py: 1.5 },
  }} />
}
