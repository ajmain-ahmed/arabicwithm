import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), fetch: vi.fn(), audio: vi.fn(), upload: vi.fn(), persist: vi.fn(), saved: vi.fn(), closed: vi.fn(), resolve: vi.fn(), duration: vi.fn() }))
vi.mock('@/app/actions/admin', () => ({ createChapter: mocks.create, updateChapter: mocks.update, fetchChapterForAdmin: mocks.fetch, deleteChapter: vi.fn() }))
vi.mock('@/app/actions/audiobooks', () => ({ fetchChapterAudioForAdmin: mocks.audio, saveChapterAudioResult: mocks.persist, deleteChapterAudioForAdmin: vi.fn(), resolveAudiobookForAdmin: mocks.resolve }))
vi.mock('@/app/lib/audioMetadata', () => ({ readAudioDuration: mocks.duration }))
vi.mock('@/app/lib/uploadChapterAudio', () => ({ uploadChapterAudio: mocks.upload }))
vi.mock('@/app/lib/audioUpload', () => ({ validateAudioFile: vi.fn().mockResolvedValue('mp3') }))
vi.mock('@/app/actions/storage', () => ({ removeAudiobookAudio: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@mui/icons-material', () => ({ Close: () => null, Save: () => null, Delete: () => null }))
import ChapterEditDialog from './ChapterEditDialog'
import { audioDraft, emptyAudioDraft } from './ChapterAudioFields'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  vi.clearAllMocks(); Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  mocks.create.mockResolvedValue('new-chapter'); mocks.audio.mockResolvedValue(null)
  mocks.persist.mockResolvedValue({ ok: true })
  mocks.duration.mockResolvedValue(2536)
  mocks.resolve.mockImplementation(async source => ({ ok: true, storagePath: source.replace(/^audiobooks\//, ''), storageBucket: 'audiobooks', externalUrl: null, url: 'https://example.com/audio' }))
  mocks.upload.mockImplementation(async (id, language) => `${id}/${language}/new.mp3`)
})
async function enterSource(language: 'Arabic' | 'English', source: string) {
  const input = [...document.querySelectorAll('input')].find(input => input.labels?.[0]?.textContent?.includes(`${language} Audio path or URL`))!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, source)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
it('keeps both audio sections optional and omits manual narrator/duration fields', async () => {
  await mount()
  expect(document.body.textContent).not.toContain('Narrator')
  expect(document.body.textContent).not.toContain('Duration (seconds)')
  await act(async () => button('Save').click())
  expect(mocks.persist).not.toHaveBeenCalled()
})
it('saves pasted Arabic and English paths without waiting for metadata', async () => {
  await mount()
  await enterSource('Arabic', 'audiobooks/arabic/book/ar.mp3')
  await enterSource('English', 'audiobooks/english/book/en.mp3')
  await act(async () => button('Save').click())
  expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ language: 'ar', storagePath: 'arabic/book/ar.mp3', durationSeconds: null }))
  expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ language: 'en', storagePath: 'english/book/en.mp3', durationSeconds: null }))
  expect(mocks.upload).not.toHaveBeenCalled()
})
it('saves linked audio when duration is unavailable', async () => {
  await mount()
  mocks.duration.mockResolvedValue(null)
  await enterSource('Arabic', 'audiobooks/arabic/book/audio')
  await act(async () => button('Save Arabic audio').click())
  expect(document.body.textContent).toContain('Save the new chapter')
  await act(async () => button('Save').click())
  expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ durationSeconds: null }))
})
it('shows invalid source errors and prevents metadata writes', async () => {
  await mount()
  mocks.persist.mockResolvedValue({ ok: false, error: 'File not found' })
  await enterSource('English', 'audiobooks/english/missing.mp3')
  await act(async () => button('Save').click())
  expect(document.body.textContent).toContain('File not found')
  expect(mocks.persist).toHaveBeenCalled()
  expect(mocks.closed).not.toHaveBeenCalled()
})
it('removes a newly linked draft before any database record exists', async () => {
  await mount()
  await enterSource('Arabic', 'audiobooks/arabic/book/audio.mp3')
  await act(async () => button('Save Arabic audio').click())
  await act(async () => button('Remove Arabic audiobook').click())
  await act(async () => button('Save').click())
  expect(mocks.persist).not.toHaveBeenCalled()
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
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ chapterId: 'new-chapter', language, storagePath: `new-chapter/${language}/new.mp3`, narrator: null, durationSeconds: 2536 }))
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
  expect(mocks.persist).not.toHaveBeenCalled()
  expect(mocks.update).not.toHaveBeenCalled()
})

it('defaults Arabic publishing for missing/null flags and preserves explicit false', () => {
  expect(emptyAudioDraft('ar').published).toBe(true)
  expect(emptyAudioDraft('en').published).toBe(false)
  for (const isPublished of [null, undefined, false, true]) {
    expect(audioDraft({ sourceType: 'supabase_storage', storagePath: 'ar/file.mp3', isPublished } as never, 'ar').published).toBe(isPublished ?? true)
  }
})

it('uploads immediately for an existing chapter and retries a failed write without another upload', async () => {
  mocks.fetch.mockResolvedValue({ book_id: 'book-id', slug: 'chapter', title: 'Chapter', chapter_number: 1, content: [] })
  mocks.persist.mockResolvedValueOnce({ ok: false, error: 'Database unavailable' }).mockResolvedValue({ ok: true })
  await mount('existing'); await select('Arabic')
  expect(document.body.textContent).toContain('Database unavailable')
  expect(mocks.update).not.toHaveBeenCalled()
  await act(async () => button('Retry Arabic audio').click())
  expect(mocks.upload).toHaveBeenCalledOnce()
  expect(mocks.persist).toHaveBeenCalledTimes(2)
  expect(document.body.textContent).toContain('Audio saved')
  expect(mocks.closed).not.toHaveBeenCalled()
})

it('keeps the other language editable during an upload and suppresses duplicate submissions', async () => {
  mocks.fetch.mockResolvedValue({ book_id: 'book-id', slug: 'chapter', title: 'Chapter', chapter_number: 1, content: [] })
  let complete!: (path: string) => void
  mocks.upload.mockImplementation((_id, _language, _file, options) => {
    options.onAuthorized(); options.onProgress(42)
    return new Promise<string>(resolve => { complete = resolve })
  })
  await mount('existing'); await select('Arabic')
  expect(document.body.textContent).toContain('Uploading 42%')
  const english = document.querySelector('input[aria-label="English Audio file"]') as HTMLInputElement
  expect(english.closest('button')?.disabled).not.toBe(true)
  await enterSource('English', 'audiobooks/en/retained.mp3')
  await act(async () => button('Save Arabic audio').click())
  expect(mocks.upload).toHaveBeenCalledOnce()
  await act(async () => complete('existing/ar/new.mp3'))
  expect((document.querySelectorAll('fieldset input')[1] as HTMLInputElement)).toBeDefined()
  expect([...document.querySelectorAll('input')].some(input => input.value === 'audiobooks/en/retained.mp3')).toBe(true)
})
