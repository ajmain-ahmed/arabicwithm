import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import ProfileAvatar from './ProfileAvatar'
let host:HTMLDivElement,root:Root
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.append(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
it('preserves an existing avatar and has no editing or upload controls outside Edit mode',async()=>{
 await act(async()=>root.render(<ProfileAvatar name="Learner" src="https://example.com/legacy.webp" crop={{x:40,y:60,zoom:1.5}}/>))
 expect(host.querySelector('img')?.getAttribute('src')).toBe('https://example.com/legacy.webp')
 expect(host.querySelector('button,input')).toBeNull()
})
it('makes the avatar itself the chooser control only while editing',async()=>{
 const choose=vi.fn();await act(async()=>root.render(<ProfileAvatar name="Learner" src={null} editable onChoose={choose}/>))
 const button=host.querySelector<HTMLButtonElement>('button[aria-label="Choose Profile Picture"]')!
 expect(button).not.toBeNull();expect(host.textContent).toBe('L');await act(async()=>button.click());expect(choose).toHaveBeenCalledOnce()
 expect(host.querySelector('input[type=file]')).toBeNull()
 await act(async()=>root.render(<ProfileAvatar name="Learner" src={null} onChoose={choose}/>));expect(host.querySelector('button')).toBeNull()
})
