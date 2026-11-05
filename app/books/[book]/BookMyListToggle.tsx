'use client'

import { useState } from 'react'
import { Alert, Box, Button } from '@mui/material'
import { BookmarkAddOutlined, BookmarkOutlined } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { useBookMyList, setBookInMyList } from '@/app/lib/bookMyList'

/* Books share the homepage "My List" row with shows. Unlike shows (backed by
   the my_list table), saved books live in user metadata — the same place as
   reading progress — so no schema change is needed and the toggle works
   offline-tolerant like the cartoon one. */
export default function BookMyListToggle({ bookSlug }: { bookSlug: string }) {
  const { user, loading } = useAuth()
  const slugs=useBookMyList(user)
  const [error,setError]=useState('')
  const [busy, setBusy] = useState(false)
  const inList = slugs.includes(bookSlug)

  if (loading) return null

  const toggle = async () => {
    if (!user || busy) return
    const next = !inList
    setError('')
    setBusy(true)
    try {
      await setBookInMyList(user.id, bookSlug, next)
    } catch {
      setError('Could not update My List. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{width:'100%'}}><Button
      className="book-detail-action"
      aria-pressed={inList}
      onClick={() => { if (!user) { window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } })); return } void toggle() }}
      disabled={busy}
      startIcon={inList ? <BookmarkOutlined /> : <BookmarkAddOutlined />}
      variant="outlined"
      sx={{

        width: '100%',
        bgcolor: inList ? '#14532d' : 'transparent',
        color: inList ? '#fff' : 'var(--awm-bark)',
        borderRadius: '9999px',
        textTransform: 'none',
        fontWeight: 700,
        border: '1px solid',
        borderColor: inList ? 'rgba(155,213,181,0.25)' : 'color-mix(in srgb, var(--awm-gold) 45%, transparent)',
        boxShadow: 'none',
        '&:hover': { bgcolor: inList ? '#1a6b3a' : 'color-mix(in srgb, var(--awm-gold) 8%, transparent)', boxShadow: 'none' },
      }}
    >
      My List
    </Button>{error&&<Alert severity="error" sx={{mt:1}}>{error}</Alert>}</Box>
  )
}
