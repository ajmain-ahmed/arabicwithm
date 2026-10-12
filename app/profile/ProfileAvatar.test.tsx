import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), update: vi.fn(), upload: vi.fn(),create:vi.fn(),revoke:vi.fn() }))
vi.mock('@/app/lib/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser, updateUser: mocks.update }, storage: { from: () => ({ upload: mocks.upload,getPublicUrl:()=>({data:{publicUrl:'https://example.com/new-avatar.webp'}}) }) } } }))
import ProfileAvatar from './ProfileAvatar'
let host: HTMLDivElement, root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }); mocks.update.mockResolvedValue({ error: null })
  mocks.upload.mockResolvedValue({error:null});let number=0;mocks.create.mockImplementation(()=>`blob:photo-${++number}`)
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:mocks.create});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:mocks.revoke})
  vi.stubGlobal('Image',class{width=300;height=200;onload:(()=>void)|null=null;set src(_value:string){queueMicrotask(()=>this.onload?.())}})
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({drawImage:vi.fn()}) as never)
  vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(callback=>callback(new Blob(['webp'],{type:'image/webp'})))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks() })
const button = (label: string) => [...document.querySelectorAll('button')].find(button => button.textContent === label)!
async function selectPhoto(name='photo.png'){
 const input=host.querySelector('input[type="file"]')!
 Object.defineProperty(input,'files',{configurable:true,value:[new File(['photo'],name,{type:'image/png'})]})
 await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})))
}
it('uses an icon normally, adjusts only newly selected photos and persists the crop once', async () => {
  await act(async () => root.render(<ProfileAvatar id="owner" name="Owner" src="https://example.com/avatar.webp" crop={{ x: 40, y: 60, zoom: 1.5 }} editable />))
  expect(host.querySelector('[aria-label="Change profile photo"]')).not.toBeNull();expect(button('Adjust photo')).toBeUndefined()
  expect(host.querySelector('img')?.getAttribute('src')).toBe('https://example.com/avatar.webp')
  await selectPhoto()
  await act(async () => button('Adjust photo').click())
  const preview = document.querySelector('[aria-label^="Avatar preview"]')!
  expect(document.querySelector('[aria-label="Avatar zoom"]')).not.toBeNull()
  await act(async () => preview.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  expect(mocks.update).not.toHaveBeenCalled()
  await act(async () => button('Save photo').click())
  expect(mocks.update).toHaveBeenCalledWith({ data: { avatar_url: 'https://example.com/new-avatar.webp', avatar_crop: { x: 51, y: 50, zoom: 1 } } })
  expect(mocks.upload).toHaveBeenCalledTimes(1);expect(button('Adjust photo')).toBeUndefined()
})
it('lets selected photos be previewed and cancelled before storage or metadata changes', async () => {
  await act(async () => root.render(<ProfileAvatar id="owner" name="Owner" src={null} editable />))
  await selectPhoto();expect(button('Adjust photo')).toBeDefined();await act(async()=>button('Adjust photo').click())
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Adjust profile photo')
  expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled()
  await act(async () => button('Cancel').click())
  expect(mocks.revoke).toHaveBeenCalledWith('blob:photo-1');expect(button('Adjust photo')).toBeUndefined()
})
it('denies saves after the signed-in identity changes', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'someone-else' } }, error: null })
  await act(async () => root.render(<ProfileAvatar id="owner" name="Owner" src="https://example.com/avatar.webp" editable />))
  await selectPhoto()
  await act(async () => button('Adjust photo').click())
  await act(async () => button('Save photo').click())
  expect(mocks.update).not.toHaveBeenCalled()
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Sign in again')
})
it('replaces or removes pending selections without changing the saved avatar',async()=>{
 await act(async()=>root.render(<ProfileAvatar id="owner" name="Owner" src="https://example.com/avatar.webp" editable/>))
 await selectPhoto('one.png');await selectPhoto('two.png')
 expect(mocks.revoke).toHaveBeenCalledWith('blob:photo-1')
 await act(async()=>button('Adjust photo').click())
 expect(document.querySelector('[aria-label^="Avatar preview"] img')?.getAttribute('src')).toBe('blob:photo-2')
 await act(async()=>button('Cancel').click());expect(button('Adjust photo')).toBeUndefined()
 await selectPhoto('three.png');await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Remove selected photo"]')!.click())
 expect(button('Adjust photo')).toBeUndefined();expect(mocks.upload).not.toHaveBeenCalled();expect(mocks.update).not.toHaveBeenCalled()
})
