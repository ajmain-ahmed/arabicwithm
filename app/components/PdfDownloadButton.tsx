 'use client'
import { useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { Download } from '@mui/icons-material'
import { downloadBookPdf, type BookPdfPayload } from '@/app/lib/bookPdf'
import { fetchPremiumStatus } from '@/app/actions/premium'
import PremiumPrompt from '@/app/components/PremiumPrompt'
export default function PdfDownloadButton({ bookSlug, chapterSlug, small = false, fullWidth = false }: {
  bookSlug: string; chapterSlug?: string; language?: 'ar' | 'en'; label?: string; small?: boolean; fullWidth?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [upgrade, setUpgrade] = useState(false)
  const [files, setFiles] = useState<BookPdfPayload[]>([])
  async function choose() {
    setBusy(true); setError('')
    try {
      if (!(await fetchPremiumStatus()).premium) { setUpgrade(true); return }
      const results = await Promise.all((['ar', 'en'] as const).map(async language => {
        const query = new URLSearchParams({ lang: language })
        if (chapterSlug) query.set('chapter', chapterSlug)
        const response = await fetch(`/api/books/${encodeURIComponent(bookSlug)}/download?${query}`, { cache: 'no-store' })
        if (response.status === 404) return null
        if (!response.ok) throw new Error('Unable to prepare this download.')
        return await response.json() as BookPdfPayload
      }))
      setFiles(results.filter((file): file is BookPdfPayload => file !== null)); setOpen(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to prepare PDF.') }
    finally { setBusy(false) }
  }
  async function download(file: BookPdfPayload) {
    setBusy(true)
    try { await downloadBookPdf(file) } catch { setError('Unable to render this PDF. Please try again.') } finally { setBusy(false) }
  }
  return <>
    <Button onClick={() => void choose()} disabled={busy} startIcon={<Download />} size={small ? 'small' : 'medium'} variant="outlined" fullWidth={fullWidth}>Download PDF</Button>
    {error && <Alert severity="error">{error}</Alert>}
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" aria-labelledby="pdf-title">
      <DialogTitle id="pdf-title">Download PDF</DialogTitle>
      <DialogContent>{files.length ? files.map(file => <Button key={file.language} fullWidth disabled={busy} onClick={() => void download(file)} startIcon={<Download />}>{file.language === 'ar' ? 'Arabic PDF' : 'English PDF'}</Button>) : 'No PDFs are available for this book yet.'}</DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>Close</Button></DialogActions>
    </Dialog>
    <PremiumPrompt open={upgrade} onClose={() => setUpgrade(false)} reason="PDF downloads are available with Premium." />
  </>
}
