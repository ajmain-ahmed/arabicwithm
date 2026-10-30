'use client'

import { useState } from 'react'
import { Button } from '@mui/material'
import { BookmarkAddOutlined, BookmarkOutlined } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { savedBookSlugs, setBookInMyList } from '@/app/lib/bookMyList'

/* Books share the homepage "My List" row with shows. Unlike shows (backed by
   the my_list table), saved books live in user metadata — the same place as
   reading progress — so no schema change is needed and the toggle works
   offline-tolerant like the cartoon one. */
export default function BookMyListToggle({ bookSlug }: { bookSlug: string }) {
  const { user, loading } = useAuth()
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const inList = optimistic ?? savedBookSlugs(user?.user_metadata).includes(bookSlug)

  if (loading) return null

  const toggle = async () => {
    if (!user || busy) return
    const next = !inList
    setOptimistic(next)
    setBusy(true)
    try {
      await setBookInMyList(user.id, bookSlug, next)
    } catch {
      setOptimistic(!next)
      window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
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
    </Button>
  )
}
