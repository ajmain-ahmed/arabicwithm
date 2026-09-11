'use client'

import { useEffect, useState } from 'react'
import { LockOutlined } from '@mui/icons-material'
import { fetchPremiumStatus } from '@/app/actions/premium'
import { canAccessBookChapter } from '@/app/lib/entitlements'

/* ── Keeps /books/[book] statically cacheable: premium state is
   resolved client-side instead of reading auth cookies in the page. ── */
export default function ChapterAccessLock({
  premiumExempt,
  freeChapterCount,
  chapterCount,
  chapterNumber,
}: {
  premiumExempt: boolean
  freeChapterCount: number
  chapterCount: number
  chapterNumber: number
}) {
  const [premium, setPremium] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    fetchPremiumStatus()
      .then((status) => { if (active) setPremium(status.premium) })
      .catch(() => { if (active) setPremium(false) })
    return () => { active = false }
  }, [])

  if (premium === null) return null
  if (canAccessBookChapter(premium, { premiumExempt, freeChapterCount, chapterCount }, chapterNumber)) return null
  return <LockOutlined aria-label="AWM+ chapter" sx={{ color: "text.secondary" }} />
}
