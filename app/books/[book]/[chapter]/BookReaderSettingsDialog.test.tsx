import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ mobile: false, canBilingual: true, onAudioRateChange: vi.fn(), onLanguageChange: vi.fn(), onAudioModeChange: vi.fn() }))
vi.mock('@mui/material', async importOriginal => ({ ...await importOriginal<typeof import('@mui/material')>(), useMediaQuery: () => mocks.mobile }))
import BookReaderSettingsDialog from './BookReaderSettingsDialog'

let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  mocks.mobile = false
  mocks.canBilingual = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.clearAllMocks() })

async function renderDialog() {
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
    onLanguageChange={mocks.onLanguageChange}
    audioRate={1}
    onAudioRateChange={mocks.onAudioRateChange}
    audioLanguages={['ar', 'en']}
    audioMode="single"
    onAudioModeChange={mocks.onAudioModeChange}
    canBilingual={mocks.canBilingual}
    hasAudio
  />))
}

it('groups narration controls on desktop with speed icons and no restart button', async () => {
  await renderDialog()
  expect(document.body.textContent).toContain('Audio settings')
  expect(document.body.textContent).toContain('Narration language')
  expect(document.body.textContent).not.toContain('Word hover help')
  expect(document.body.textContent).not.toContain('Restart chapter')
  expect(document.querySelector('[data-testid="slower-audio-icon"]')).not.toBeNull()
  expect(document.querySelector('[data-testid="faster-audio-icon"]')).not.toBeNull()
  const slider = document.querySelector('[aria-label="Audiobook playback speed"]')!
  await act(async () => slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
  expect(mocks.onAudioRateChange).toHaveBeenCalledWith(0.75)
  await act(async () => Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'English')!.click())
  expect(mocks.onLanguageChange).toHaveBeenCalledWith('en')
})

it('shows the bilingual narration option with a smooth transition and no close icon', async () => {
  await renderDialog()
  expect(document.querySelector('[aria-label="Close reading settings"]')).toBeNull()
  const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'English + العربية')!
  expect(button.closest('.MuiCollapse-root')).not.toBeNull()
  await act(async () => button.click())
  expect(mocks.onAudioModeChange).toHaveBeenCalledWith('bilingual')
})

it('uses separate general and audio tabs on mobile', async () => {
  mocks.mobile = true
  await renderDialog()
  expect(document.querySelector('[aria-label="Audiobook playback speed"]')).toBeNull()
  const audioTab = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]')).find(tab => tab.textContent === 'Audio settings')!
  await act(async () => audioTab.click())
  expect(document.querySelector('[aria-label="Audiobook playback speed"]')).not.toBeNull()
  expect(document.body.textContent).toContain('Narration language')
  expect(document.body.textContent).not.toContain('Restart chapter')
})
