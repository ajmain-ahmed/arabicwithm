'use client'

import { useInsertionEffect } from 'react'

export default function ClientStyles({ id, css }: { id: string; css: string }) {
  useInsertionEffect(() => {
    const existing = document.getElementById(id)
    const style = existing instanceof HTMLStyleElement ? existing : document.createElement('style')
    style.id = id
    style.textContent = css
    if (!existing) document.head.appendChild(style)

    return () => {
      style.remove()
    }
  }, [css, id])

  return null
}
