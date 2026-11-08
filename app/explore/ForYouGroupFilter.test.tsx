import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const groups=vi.hoisted(()=>({fetch:vi.fn()}))
vi.mock('@/app/actions/forYou',()=>({fetchForYouGroups:groups.fetch}))
import ForYouGroupFilter from './ForYouGroupFilter'
let host:HTMLDivElement,root:Root
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 groups.fetch.mockResolvedValue([{id:'imports',name:'Imports'},{id:'english',name:'English'},{id:'stories',name:'Stories'}])
 host=document.createElement('div');document.body.append(host);root=createRoot(host)
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals()})
const click=async(label:string)=>{const button=[...document.querySelectorAll('button')].find(el=>el.textContent===label||el.getAttribute('aria-label')===label)!;expect(button).toBeTruthy();await act(async()=>button.click())}
it.each([320,1440])('opens the user-facing filter without Imports at %spx and keeps all other options',async(width)=>{
 vi.stubGlobal('matchMedia',()=>({matches:width<900,addEventListener:vi.fn(),removeEventListener:vi.fn()}))
 await act(async()=>root.render(<ForYouGroupFilter value={[]} onApply={vi.fn()}/>))
 await click('Filter content')
 expect([...document.querySelectorAll('label')].map(el=>el.textContent)).toEqual(['All groups','English','Stories'])
 expect(document.body.textContent).not.toContain('Imports')
})
it('keeps All groups unrestricted, including when a previous saved selection was Imports',async()=>{
 const apply=vi.fn()
 await act(async()=>root.render(<ForYouGroupFilter value={['imports']} onApply={apply}/>))
 await click('Filter content')
 const all=[...document.querySelectorAll('label')].find(el=>el.textContent==='All groups')!.querySelector('input')!
 await act(async()=>all.click());await click('Apply')
 expect(apply).toHaveBeenCalledExactlyOnceWith([])
})
