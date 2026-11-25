'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'


import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'
import { CheckRounded, NotificationsNoneRounded } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useVerifiedAccountAccess } from '@/app/AccountAccessContext'
import { useAuth } from '@/app/AuthContext'
import { bookReleaseReminder, setBookReleaseReminder, type BookReminderState } from '@/app/actions/bookReleaseReminders'
import useBookCatalogueRefresh from '@/app/books/useBookCatalogueRefresh'

export default function BookInProgress({ bookId }: { bookId: string }) {
  const { user, loading } = useAuth()
  const { access, loading: accessLoading } = useVerifiedAccountAccess()
  const router = useRouter()
  const refreshedIdentity = useRef<string | null>(null)
  // A Router Cache entry loaded before sign-in/role resolution may still contain
  // the public gate. Re-request it; only the server may grant chapter access.
  const admin = !loading && !accessLoading && access?.userId === user?.id && access?.admin === true
  useEffect(() => {
    if (!admin || !user || refreshedIdentity.current === user.id) return
    refreshedIdentity.current = user.id
    router.refresh()
  }, [admin, user, router])
  useBookCatalogueRefresh()
  if (admin) return <Box role="status"><Typography><UiText>{"Loading Admin preview..."}</UiText></Typography><Button onClick={() => router.refresh()}><UiText>{"Retry Admin preview"}</UiText></Button></Box>
  return <Reminder key={`${bookId}:${user?.id ?? 'guest'}`} bookId={bookId} userId={user?.id} authLoading={loading} />
}

function Reminder({ bookId, userId, authLoading }: { bookId: string; userId?: string; authLoading: boolean }) {
 const {t:awmT}=useWebsiteLocale()

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

  return <Box component="section" aria-label={awmT("Book release reminder")} sx={{ p: { xs: 2, sm: 3 }, borderRadius: '12px', bgcolor: 'color-mix(in srgb, var(--awm-gold) 7%, var(--awm-white))', border: '1px solid color-mix(in srgb, var(--awm-gold) 22%, transparent)' }}>
      <Typography component="h2" sx={{ fontFamily: 'var(--font-heading)', fontSize: 25, color: 'var(--awm-bark)' }}><UiText>{"This book is in progress"}</UiText></Typography>
      <Typography sx={{ mt: 1, mb: 2, fontSize: 14, color: 'var(--awm-muted)', lineHeight: 1.6 }}><UiText>{"We’re still preparing this book. Set a reminder and we’ll let you know in AWM Notifications when it’s released."}</UiText></Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}><UiText>{error}</UiText></Alert>}
      {state.fulfilled ? <Typography role="status"><UiText>{"Your release reminder has already been delivered."}</UiText></Typography> : state.active ? <>
        <Typography role="status" sx={{ color: 'var(--awm-forest)', display: 'flex', alignItems: 'center', gap: .5 }}><CheckRounded fontSize="small" /> {' '}<UiText>{"Reminder set"}</UiText></Typography>
        <Button disabled={busy} onClick={() => void change(false)} sx={{ mt: 1, textTransform: 'none', color: 'var(--awm-muted)', minHeight: 44 }}><UiText>{"Cancel Reminder"}</UiText></Button>
      </> : <Button variant="contained" startIcon={<NotificationsNoneRounded />} disabled={authLoading || loading || busy} onClick={() => void change(true)} sx={{ minHeight: 44, bgcolor: 'var(--awm-forest)', textTransform: 'none', '&:hover': { bgcolor: '#174832' } }}>{loading ? awmT("Loading reminder…") : busy ? awmT("Setting reminder…") : awmT("Remind Me")}</Button>}
    </Box>
}
