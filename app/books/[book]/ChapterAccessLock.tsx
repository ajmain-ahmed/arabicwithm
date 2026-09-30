'use client'

import type { MouseEvent, ReactNode } from 'react'
import { LockOutlined } from '@mui/icons-material'
import Link from 'next/link'
import { useAuth } from '@/app/AuthContext'

type ChapterAccessProps = { chapterNumber: number }

export default function ChapterAccessLock({ chapterNumber }: ChapterAccessProps) {
  const { user, loading } = useAuth()
  if (loading || user) return null
  return <LockOutlined aria-label={`Sign in to read chapter ${chapterNumber}`} sx={{ color: 'text.secondary' }} />
}

export function ChapterLink({ href, children, chapterNumber }: ChapterAccessProps & { href: string; children: ReactNode }) {
  const { user } = useAuth()
  function openChapter(event: MouseEvent<HTMLAnchorElement>) {
    if (user) return
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))
  }
  return <Link href={href} prefetch={Boolean(user)} aria-label={user ? undefined : `Sign in to read chapter ${chapterNumber}`} onClick={openChapter} style={{ color: 'inherit', textDecoration: 'none' }}>{children}</Link>
}
