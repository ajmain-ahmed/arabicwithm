'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/* Reset window scroll on in-app navigations. Next normally scrolls to top on
   navigation, but streaming page swaps can carry the previous page's offset
   into the new one. Pathname-keyed on purpose: query-only updates (catalogue
   and library filters use router.replace(..., { scroll: false })) keep their
   scroll position because the pathname is unchanged. Back/forward (popstate)
   is left to history scroll restoration; any real click re-arms the reset so
   a later push navigation is never wrongly skipped. */
export default function ScrollReset() {
  const pathname = usePathname()
  const isPop = useRef(false)
  useEffect(() => {
    const pop = () => { isPop.current = true }
    const click = () => { isPop.current = false }
    window.addEventListener('popstate', pop)
    document.addEventListener('click', click, true)
    return () => {
      window.removeEventListener('popstate', pop)
      document.removeEventListener('click', click, true)
    }
  }, [])
  useEffect(() => {
    if (isPop.current) { isPop.current = false; return }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}
