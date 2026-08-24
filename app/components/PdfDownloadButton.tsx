'use client'

import { useState } from 'react'
import { Button, CircularProgress, Snackbar } from '@mui/material'
import { Download } from '@mui/icons-material'
import { downloadBookPdf, type BookPdfPayload } from '@/app/lib/bookPdf'

export default function PdfDownloadButton({
  bookSlug,
  chapterSlug,
  language,
  label,
  small = false,
}: {
  bookSlug: string
  chapterSlug?: string
  language: 'ar' | 'en'
  label: string
  small?: boolean
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const download = async () => {
    setDownloading(true)
    setError('')
    try {
      const query = new URLSearchParams({ lang: language })
      if (chapterSlug) query.set('chapter', chapterSlug)
      const response = await fetch(`/api/books/${encodeURIComponent(bookSlug)}/download?${query}`)
      if (!response.ok) throw new Error('Unable to prepare this download')
      await downloadBookPdf(await response.json() as BookPdfPayload)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to prepare this download')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => void download()}
        disabled={downloading}
        startIcon={downloading ? <CircularProgress size={16} /> : <Download />}
        size={small ? 'small' : 'medium'}
        variant={small ? 'text' : 'outlined'}
        sx={{ color: 'var(--awm-muted)', borderColor: 'rgba(184,134,11,.45)', borderRadius: '8px', textTransform: 'none' }}
      >
        {label}
      </Button>
      <Snackbar open={Boolean(error)} autoHideDuration={3000} onClose={() => setError('')} message={error} />
    </>
  )
}
