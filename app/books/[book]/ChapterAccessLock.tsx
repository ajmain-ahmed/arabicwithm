'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import type { MouseEvent, ReactNode } from 'react'
import { LockOutlined } from '@mui/icons-material'
import Link from 'next/link'
import { useAuth } from '@/app/AuthContext'

type ChapterAccessProps = { chapterNumber: number }

export default function ChapterAccessLock({ chapterNumber }: ChapterAccessProps) {
  const {t}=useWebsiteLocale()
  const { user, loading } = useAuth()
  if (loading || user) return null
  return <LockOutlined aria-label={t('Sign in to read chapter {count}',{count:chapterNumber})} sx={{ color: 'text.secondary' }} />
}

export function ChapterLink({ href, children, chapterNumber, serverAuthorized = false }: ChapterAccessProps & { href: string; children: ReactNode; serverAuthorized?: boolean }) {
  const {t}=useWebsiteLocale()
  const { user, loading } = useAuth()
  // Server-confirmed Admin links must not wait for browser session hydration.
  // A fresh document also avoids reusing a public Router Cache payload.
  if (serverAuthorized) return <a href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{children}</a>
  function openChapter(event: MouseEvent<HTMLAnchorElement>) {
    if (loading) {
      event.preventDefault()
      return
    }
    if (user) return
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('open-auth-dialog', { detail: { mode: 'signin' } }))
  }
  return <Link href={href} prefetch={Boolean(user) && !loading} aria-busy={loading || undefined} aria-label={user ? undefined : t('Sign in to read chapter {count}',{count:chapterNumber})} onClick={openChapter} style={{ color: 'inherit', textDecoration: 'none' }}>{children}</Link>
}
