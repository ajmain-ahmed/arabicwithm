import type { CSSProperties } from 'react'
import { items, record, text, type StructuredRecord } from '@/app/lib/structuredChapter'
import { Label, TextPair, Notice } from './StructuredText'
import styles from './StructuredChapter.module.css'

const highlights: Record<string, { label: string; accent: string }> = {
  topic: { label: 'Topic', accent: 'var(--awm-gold)' },
  governor: { label: 'Governor', accent: 'var(--awm-forest)' },
  'raised-subject': { label: 'Raised subject', accent: 'var(--awm-muted)' },
}
export function HighlightedSentence({ block }: { block: StructuredRecord }) {
  const segments = items(block.segments)
  if (!segments.length) return <Notice>This sentence analysis is unavailable.</Notice>
  return <div className={styles.card}>
    <div className={styles.segments} dir="rtl" aria-label="Arabic sentence analysis">
      {segments.map((value, index) => {
        const segment = record(value)
        if (!segment) return <Notice key={index}>A sentence segment is unavailable.</Notice>
        const key = text(segment.highlight_key)
        const treatment = Object.hasOwn(highlights, key) ? highlights[key] : { label: 'Sentence segment', accent: 'var(--awm-muted)' }
        return <div className={styles.segment} key={index} style={{ '--segment-accent': treatment.accent } as CSSProperties}>
          {text(segment.text_ar) && <p lang="ar" dir="rtl">{text(segment.text_ar)}</p>}
          <small lang="en" dir="ltr">{treatment.label}</small>
          <TextPair value={segment} arabic="role_ar" english="role_en" />
          <TextPair value={segment} arabic="explanation_ar" english="explanation_en" />
        </div>
      })}
    </div>
    <TextPair value={block} arabic="translation_ar" english="translation_en" />
    <TextPair value={block} arabic="explanation_ar" english="explanation_en" />
  </div>
}

export function StructuredTable({ block }: { block: StructuredRecord }) {
  const columns = items(block.columns), rows = items(block.rows)
  if (!columns.length) return <Notice>This lesson table is unavailable.</Notice>
  return <div className={styles.scroll} role="region" aria-label={text(block.caption_en) || 'Lesson table'} tabIndex={0}>
    <table className={styles.table} dir="ltr">
      {(text(block.caption_en) || text(block.caption_ar)) && <caption><TextPair value={block} arabic="caption_ar" english="caption_en" /></caption>}
      <thead><tr>{columns.map((column, index) => <th scope="col" key={index}><Label value={column} /></th>)}</tr></thead>
      <tbody>{rows.map((row, rowIndex) => {
        const cells = items(record(row)?.cells)
        return <tr key={rowIndex}>{Array.from({ length: Math.max(columns.length, cells.length) }, (_, index) => <td key={index}><Label value={cells[index]} /></td>)}</tr>
      })}</tbody>
    </table>
  </div>
}

export function Example({ block }: { block: StructuredRecord }) {
  return <div className={styles.card}>
    <TextPair value={block} arabic="arabic" english="english" />
    {!!items(block.analysis).length && <div className={styles.analysis} aria-label="Grammatical analysis">
      {items(block.analysis).map((value, index) => {
        const row = record(value)
        if (!row) return null
        return <div key={index} className={styles.analysisRow}><TextPair value={row} /><TextPair value={row} arabic="role_ar" english="role_en" /><TextPair value={row} arabic="explanation_ar" english="explanation_en" /></div>
      })}
    </div>}
    <TextPair value={block} arabic="irab_ar" english="irab_en" />
    <TextPair value={block} arabic="explanation_ar" english="explanation_en" />
  </div>
}
