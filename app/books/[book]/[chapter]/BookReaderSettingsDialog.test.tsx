import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import BookReaderSettingsDialog from './BookReaderSettingsDialog'

it('does not offer a word hover help switch', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const onAudioRateChange = vi.fn()
  const onRestartAudio = vi.fn()
  await act(async () => root.render(<BookReaderSettingsDialog
    open
    onClose={() => {}}
    readerFont="naskh"
    onReaderFontChange={() => {}}
    textScale={1}
    onTextScaleChange={() => {}}
    view="lines"
    onViewChange={() => {}}
    language="ar"
    onLanguageChange={() => {}}
    audioRate={1}
    onAudioRateChange={onAudioRateChange}
    onRestartAudio={onRestartAudio}
    hasAudio
  />))
  expect(document.body.textContent).toContain('Reading settings')
  expect(document.body.textContent).not.toContain('Word hover help')
  expect(document.querySelector('input[type="checkbox"]')).toBeNull()
  const slider = document.querySelector('[aria-label="Audiobook playback speed"]')!
  await act(async () => slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
  expect(onAudioRateChange).toHaveBeenCalledWith(0.75)
  const restart = Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Restart chapter')!
  await act(async () => restart.click())
  expect(onRestartAudio).toHaveBeenCalledOnce()
  await act(async () => root.unmount())
  host.remove()
})
