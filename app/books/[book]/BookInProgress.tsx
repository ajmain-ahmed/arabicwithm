'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'
import { CheckRounded, NotificationsNoneRounded } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { bookReleaseReminder, setBookReleaseReminder, type BookReminderState } from '@/app/actions/bookReleaseReminders'
import useBookCatalogueRefresh from '@/app/books/useBookCatalogueRefresh'
import BookMyListToggle from './BookMyListToggle'

export default function BookInProgress({ bookId, bookSlug }: { bookId: string; bookSlug: string }) {
  const { user, loading } = useAuth()
  useBookCatalogueRefresh()
  return <Reminder key={`${bookId}:${user?.id ?? 'guest'}`} bookId={bookId} bookSlug={bookSlug} userId={user?.id} authLoading={loading} />
}

function Reminder({ bookId, bookSlug, userId, authLoading }: { bookId: string; bookSlug: string; userId?: string; authLoading: boolean }) {
  const [state, setState] = useState<BookReminderState>({ active: false, fulfilled: false })
  const [loading, setLoading] = useState(Boolean(userId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const pending = useRef(false)
  const intentKey = `awm-book-release-reminder:${bookId}`
  useEffect(() => {
    mounted.current = true
    if (userId) {
      let intent = false
      try { intent = sessionStorage.getItem(intentKey) === 'subscribe'; sessionStorage.removeItem(intentKey) } catch { /* The same book page still keeps context. */ }
      void (intent ? setBookReleaseReminder(bookId, true) : bookReleaseReminder(bookId)).then(result => {
        if (!mounted.current) return
        if (result.ok) setState(result.state)
        else setError(result.error)
      }).catch(() => { if (mounted.current) setError('Your reminder could not be loaded. Please try again.') }).finally(() => { if (mounted.current) setLoading(false) })
    }
    return () => { mounted.current = false }
  }, [bookId, userId, intentKey])

  const change = async (subscribe: boolean) => {
    if (!userId) {
      try { sessionStorage.setItem(intentKey, 'subscribe') } catch { /* Sign-in leaves the user on this book. */ }
      window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))
      return
    }
    if (pending.current) return
    pending.current = true; setBusy(true); setError(null)
    try {
      const result = await setBookReleaseReminder(bookId, subscribe)
      if (!mounted.current) return
      if (result.ok) setState(result.state)
      else setError(result.error)
    } catch { if (mounted.current) setError('Your reminder could not be updated. Please try again.') }
    finally { pending.current = false; if (mounted.current) setBusy(false) }
  }

  return <Box>
    <Box component="section" aria-label="Book release reminder" sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 7%, var(--awm-white))', border: '1px solid color-mix(in srgb, var(--awm-gold) 22%, transparent)' }}>
      <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 25, color: 'var(--awm-bark)' }}>This book is in progress</Typography>
      <Typography sx={{ mt: 1, mb: 2, fontSize: 14, color: 'var(--awm-muted)', lineHeight: 1.6 }}>We’re still preparing this book. Set a reminder and we’ll let you know in AWM Notifications when it’s released.</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {state.fulfilled ? <Typography role="status">Your release reminder has already been delivered.</Typography> : state.active ? <>
        <Typography role="status" sx={{ color: 'var(--awm-forest)', display: 'flex', alignItems: 'center', gap: .5 }}><CheckRounded fontSize="small" /> Reminder set</Typography>
        <Button disabled={busy} onClick={() => void change(false)} sx={{ mt: 1, textTransform: 'none', color: 'var(--awm-muted)', minHeight: 44 }}>Cancel Reminder</Button>
      </> : <Button variant="contained" startIcon={<NotificationsNoneRounded />} disabled={authLoading || loading || busy} onClick={() => void change(true)} sx={{ minHeight: 44, bgcolor: 'var(--awm-forest)', textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}>{loading ? 'Loading reminder…' : busy ? 'Setting reminder…' : 'Remind Me'}</Button>}
    </Box>
    <Box sx={{ mt: 2, maxWidth: 200 }}><BookMyListToggle bookSlug={bookSlug} /></Box>
  </Box>
}
