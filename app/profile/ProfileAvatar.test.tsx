import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), update: vi.fn(), upload: vi.fn() }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser, updateUser: mocks.update }, storage: { from: () => ({ upload: mocks.upload }) } } }))
import ProfileAvatar from './ProfileAvatar'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }); mocks.update.mockResolvedValue({ error: null })
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.clearAllMocks() })
const button = (label: string) => [...document.querySelectorAll('button')].find(button => button.textContent === label)!
it('reuses the circular crop editor and persists keyboard positioning without uploading again', async () => {
  await act(async () => root.render(<ProfileAvatar id="owner" name="Owner" src="https://example.com/avatar.webp" crop={{ x: 40, y: 60, zoom: 1.5 }} editable />))
  await act(async () => button('Adjust photo').click())
  const preview = document.querySelector('[aria-label^="Avatar preview"]')!
  expect(document.querySelector('[aria-label="Avatar zoom"]')).not.toBeNull()
  await act(async () => preview.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  expect(mocks.update).not.toHaveBeenCalled()
  await act(async () => button('Save photo').click())
  expect(mocks.update).toHaveBeenCalledWith({ data: { avatar_url: 'https://example.com/avatar.webp', avatar_crop: { x: 41, y: 60, zoom: 1.5 } } })
  expect(mocks.upload).not.toHaveBeenCalled()
})
it('lets selected photos be previewed and cancelled before storage or metadata changes', async () => {
  const create = vi.fn(() => 'blob:selected-photo'), revoke = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
  await act(async () => root.render(<ProfileAvatar id="owner" name="Owner" src={null} editable />))
  const input = host.querySelector('input[type="file"]')!
  Object.defineProperty(input, 'files', { configurable: true, value: [new File(['photo'], 'photo.png', { type: 'image/png' })] })
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Adjust profile photo')
  expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled()
  await act(async () => button('Cancel').click())
  expect(revoke).toHaveBeenCalledWith('blob:selected-photo')
})
it('denies saves after the signed-in identity changes', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'someone-else' } }, error: null })
  await act(async () => root.render(<ProfileAvatar id="owner" name="Owner" src="https://example.com/avatar.webp" editable />))
  await act(async () => button('Adjust photo').click())
  await act(async () => button('Save photo').click())
  expect(mocks.update).not.toHaveBeenCalled()
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Sign in again')
})
