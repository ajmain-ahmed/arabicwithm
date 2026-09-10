'use client'

import { useState } from 'react'
import { Alert, Box, Button, Container, Rating, TextField, Typography } from '@mui/material'
import { useAuth } from '@/app/AuthContext'
import { submitFeedback } from '@/app/actions/feedback'

export default function FeedbackPage() {
  const { user, loading } = useAuth()
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submissionId, setSubmissionId] = useState('')
  return <Container maxWidth="sm" sx={{ py: 6 }}>
    <Typography variant="h3" gutterBottom>Give Feedback</Typography>
    {!loading && !user && <Alert severity="info" sx={{ mb: 3 }} action={<Button onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))}>Sign in</Button>}>Sign in to submit feedback.</Alert>}
    {sent ? <Alert severity="success">Thank you! Your feedback has been saved.</Alert> : <Box component="form" onSubmit={async event => {
      event.preventDefault()
      if (!rating || busy) return
      setBusy(true); setError('')
      const id = submissionId || crypto.randomUUID(); setSubmissionId(id)
      try {
        const result = await submitFeedback({ rating, comment, submissionId: id })
        if (result.ok) setSent(true)
        else setError(result.error ?? 'Unable to submit feedback.')
      } catch { setError('Unable to connect. Please try again.') }
      finally { setBusy(false) }
    }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography id="rating-label">How is your experience? (1–5 stars)</Typography>
      <Rating aria-labelledby="rating-label" name="feedback-rating" value={rating} onChange={(_, value) => setRating(value)} size="large" disabled={busy} sx={{ color: 'var(--awm-gold)', '& .MuiRating-iconEmpty': { color: 'var(--awm-muted)' } }} />
      <TextField label="Comments (optional)" multiline minRows={4} value={comment} onChange={event => setComment(event.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} disabled={busy} />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" disabled={!rating || busy || !user || loading}>{busy ? 'Submitting…' : 'Submit feedback'}</Button>
    </Box>}
  </Container>
}
