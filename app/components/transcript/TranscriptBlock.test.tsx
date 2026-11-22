import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import TranscriptBlock, { formatTranscriptTimestamp } from './TranscriptBlock'

it('shares episode-style timestamps and active block markup', () => {
  expect(formatTranscriptTimestamp(0)).toBe('0:00')
  expect(formatTranscriptTimestamp(208.9)).toBe('3:28')
  const html = renderToStaticMarkup(<TranscriptBlock active timestamp={208.9} title="Evening" blockIndex={4}>Sentence</TranscriptBlock>)
  expect(html).toContain('3:28')
  expect(html).toContain('Evening')
  expect(html).toContain('data-active="true"')
  expect(html).toContain('data-reader-block="4"')
  const clickable = renderToStaticMarkup(<TranscriptBlock timestamp={208.9} onTimestampClick={() => {}}>Sentence</TranscriptBlock>)
  expect(clickable).toContain('aria-label="Seek to 3:28"')
  expect(clickable).toContain('<button')
})
