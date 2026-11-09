import {act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
import AwmPageError from './AwmPageError'
it('keeps technical details out of the UI, uses the supplied image and exposes clear recovery actions',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const host=document.createElement('div'),root=createRoot(host),reload=vi.fn(),log=vi.spyOn(console,'error').mockImplementation(()=>{})
 try{
  await act(async()=>root.render(<AwmPageError error={new Error('PGRST202 secret details')} onReload={reload}/>))
  expect(host.textContent).toContain('This page took a little detour');expect(host.textContent).not.toContain('PGRST202')
  expect(host.querySelector('img')?.getAttribute('src')).toBe('/images/awm-error-goku.png');expect(host.querySelector('img')?.alt).toBe('')
  await act(async()=>host.querySelector('button')!.click());expect(reload).toHaveBeenCalledOnce();expect(host.querySelector('a')?.getAttribute('href')).toBe('/');expect(log).toHaveBeenCalled()
 }finally{await act(async()=>root.unmount());log.mockRestore()}
})
