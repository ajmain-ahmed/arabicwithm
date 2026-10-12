export type TranscriptOrigin = 'admin' | 'search' | 'explore'
export function transcriptOrigin(value?: string): TranscriptOrigin {
  return value === 'admin' || value === 'explore' ? value : 'search'
}
export function transcriptReturn(origin: TranscriptOrigin): { href: string; label: string } {
  if (origin === 'admin') return { href: '/admin/transcripts', label: 'Back to Transcripts' }
  if (origin === 'explore') return { href: '/explore', label: 'Back to Explore' }
  return { href: '/explore/search', label: 'Back to transcript search' }
}
export function transcriptTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
