import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import BookCoverImage from './BookCoverImage'
let host: HTMLDivElement, root: Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.append(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks()})
it('replaces a failed image with an accessible fallback and retries a changed cover URL',async()=>{
 await act(async()=>root.render(<BookCoverImage src="/first.webp" title="Book"/>))
 await act(async()=>host.querySelector('img')!.dispatchEvent(new Event('error')))
 expect(host.querySelector('img')).toBeNull();expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Book cover unavailable')
 await act(async()=>root.render(<BookCoverImage src="/replacement.webp" title="Book"/>))
 expect(host.querySelector('img')?.getAttribute('src')).toBe('/replacement.webp')
})
it('uses a fallback for an absent cover without rendering an empty image source',async()=>{
 await act(async()=>root.render(<BookCoverImage src="" title="Book"/>));expect(host.querySelector('img')).toBeNull();expect(host.querySelector('[role="img"]')).not.toBeNull()
})

it('handles an eager image that has already failed before the component attaches',async()=>{
 vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true)
 await act(async()=>root.render(<BookCoverImage src="/already-failed.webp" title="Book"/>))
 expect(host.querySelector('img')).toBeNull();expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Book cover unavailable')
})
