import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), fetch: vi.fn(), audio: vi.fn(), upload: vi.fn(), persist: vi.fn(), saved: vi.fn(), closed: vi.fn() }))
vi.mock('@/app/actions/admin', () => ({ createChapter: mocks.create, updateChapter: mocks.update, fetchChapterForAdmin: mocks.fetch, deleteChapter: vi.fn() }))
vi.mock('@/app/actions/audiobooks', () => ({ fetchChapterAudioForAdmin: mocks.audio, saveChapterAudioResult: mocks.persist, deleteChapterAudioForAdmin: vi.fn() }))
vi.mock('@/app/lib/uploadChapterAudio', () => ({ uploadChapterAudio: mocks.upload }))
vi.mock('@/app/lib/audioUpload', () => ({ validateAudioFile: vi.fn().mockResolvedValue('mp3') }))
vi.mock('@/app/actions/storage', () => ({ removeAudiobookAudio: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@mui/icons-material', () => ({ Close: () => null, Save: () => null, Delete: () => null }))
import ChapterEditDialog from './ChapterEditDialog'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  vi.clearAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  mocks.create.mockResolvedValue('new-chapter'); mocks.audio.mockResolvedValue(null)
  mocks.persist.mockResolvedValue({ ok: true })
  mocks.upload.mockImplementation(async (id, language) => `${id}/${language}/new.mp3`)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
const button = (text: string) => [...document.querySelectorAll('button')].find(item => item.textContent === text)!
async function mount(chapterId: string | null = null) {
  await act(async () => root.render(<ChapterEditDialog open chapterId={chapterId} bookId="book-id" books={[{ id: 'book-id', title: 'Book' } as never]} onClose={mocks.closed} onSaved={mocks.saved} />))
  await act(async () => (document.querySelectorAll('[role="tab"]')[2] as HTMLElement).click())
}
async function select(language: 'Arabic' | 'English') {
  const input = document.querySelector(`[aria-label="${language} Audio file"]`)!
  Object.defineProperty(input, 'files', { configurable: true, value: [new File(['audio'], `${language}.mp3`, { type: 'audio/mpeg' })] })
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
}
it.each([['Arabic'], ['English'], ['Arabic', 'English']])('creates a chapter with selected initial audio: %s %s', async (...languages) => {
  await mount()
  for (const language of languages) await select(language as 'Arabic' | 'English')
  expect(mocks.create).not.toHaveBeenCalled()
  await act(async () => button('Save').click())
  expect(mocks.create).toHaveBeenCalledOnce()
  expect(mocks.create.mock.calls[0][0].book_id).toBe('book-id')
  expect(mocks.upload).toHaveBeenCalledTimes(languages.length)
  for (const name of languages) {
    const language = name === 'Arabic' ? 'ar' : 'en'
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'new-chapter', language, storagePath: `new-chapter/${language}/new.mp3`, narrator: null, durationSeconds: null }))
  }
  expect(mocks.closed).toHaveBeenCalledOnce()
})
it('retains the created chapter and successful first language on a second-language failure', async () => {
  await mount(); await select('Arabic'); await select('English')
  mocks.upload.mockResolvedValueOnce('new-chapter/ar/new.mp3').mockRejectedValueOnce(new Error('Connection interrupted'))
  await act(async () => button('Save').click())
  expect(document.body.textContent).toContain('Connection interrupted')
  expect(mocks.closed).not.toHaveBeenCalled()
  await act(async () => button('Save').click())
  expect(mocks.create).toHaveBeenCalledOnce(); expect(mocks.update).toHaveBeenCalledWith('new-chapter', expect.anything())
  expect(mocks.upload.mock.calls.filter(call => call[1] === 'ar')).toHaveLength(1)
  expect(mocks.upload.mock.calls.filter(call => call[1] === 'en')).toHaveLength(2)
  expect(mocks.closed).toHaveBeenCalledOnce()
})
it('loads and preserves legacy Arabic audio when editing a chapter', async () => {
  mocks.fetch.mockResolvedValue({ book_id: 'book-id', slug: 'chapter', title: 'Chapter', chapter_number: 1, content: [] })
  mocks.audio.mockImplementation(async (_id, language) => language === 'ar' ? { sourceType: 'supabase_storage', storagePath: 'existing/audio.mp3', narrator: 'Narrator', isPublished: true } : null)
  await mount('existing')
  expect(document.body.textContent).toContain('existing/audio.mp3')
  await act(async () => button('Save').click())
  expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled()
  expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'existing', language: 'ar', storagePath: 'existing/audio.mp3', isPublished: true }))
})
