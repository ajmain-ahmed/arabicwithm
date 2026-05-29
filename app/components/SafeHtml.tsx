'use client'

import React from 'react'

/**
 * Safely renders inline text with basic formatting markers.
 * Replaces `*text*` with <em>text</em> and `**text**` with <strong>text</strong>.
 * Does NOT use dangerouslySetInnerHTML — immune to XSS.
 */
export default function SafeHtml({ text, className, style }: {
  text: string
  className?: string
  style?: React.CSSProperties
}) {
  // Split on **first** to handle strong, then * for em
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const strongMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/)
    if (strongMatch) {
      const [, before, content, after] = strongMatch
      if (before) parts.push(<span key={key++}>{before}</span>)
      parts.push(<strong key={key++}>{content}</strong>)
      remaining = after
      continue
    }

    const emMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/)
    if (emMatch) {
      const [, before, content, after] = emMatch
      if (before) parts.push(<span key={key++}>{before}</span>)
      parts.push(<em key={key++}>{content}</em>)
      remaining = after
      continue
    }

    parts.push(<span key={key++}>{remaining}</span>)
    break
  }

  return (
    <span className={className} style={style}>
      {parts}
    </span>
  )
}
