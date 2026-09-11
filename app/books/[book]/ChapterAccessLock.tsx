'use client'

import type { MouseEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { LockOutlined } from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchPremiumStatus } from '@/app/actions/premium'
import PremiumPrompt from '@/app/components/PremiumPrompt'
import { canAccessBookChapter } from '@/app/lib/entitlements'

type ChapterAccessProps = {
  premiumExempt: boolean
  freeChapterCount: number
  chapterCount: number
  chapterNumber: number
}

/* ── Keeps /books/[book] statically cacheable: premium state is
   resolved client-side instead of reading auth cookies in the page. ── */
export default function ChapterAccessLock({
  premiumExempt,
  freeChapterCount,
  chapterCount,
  chapterNumber,
}: ChapterAccessProps) {
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

export function PremiumChapterLink({ href, children, ...access }: ChapterAccessProps & { href: string; children: ReactNode }) {
  const router = useRouter()
  const [premium, setPremium] = useState<boolean | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetchPremiumStatus()
      .then((status) => { if (active) setPremium(status.premium) })
      .catch(() => { if (active) setPremium(false) })
    return () => { active = false }
  }, [])

  const canAccess = premium !== null && canAccessBookChapter(premium, access, access.chapterNumber)

  async function openChapter(event: MouseEvent<HTMLAnchorElement>) {
    if (canAccess) return
    event.preventDefault()

    if (premium === null) {
      try {
        const status = await fetchPremiumStatus()
        setPremium(status.premium)
        if (canAccessBookChapter(status.premium, access, access.chapterNumber)) {
          router.push(href)
          return
        }
      } catch {
        setPremium(false)
      }
    }

    setPromptOpen(true)
  }

  return <>
    <Link href={href} onClick={(event) => void openChapter(event)} style={{ color: 'inherit', textDecoration: 'none' }}>
      {children}
    </Link>
    <PremiumPrompt
      open={promptOpen}
      onClose={() => setPromptOpen(false)}
      reason={`Chapter ${access.chapterNumber} is available with AWM+.`}
    />
  </>
}
