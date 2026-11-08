import {act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const state=vi.hoisted(()=>({mobile:true,path:'/',push:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:state.push}),usePathname:()=>state.path}))
vi.mock('@mui/material',async original=>({...await original<typeof import('@mui/material')>(),useMediaQuery:()=>state.mobile}))
import MobileBottomNav from './MobileBottomNav'
let host:HTMLDivElement,root:Root
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.useFakeTimers();sessionStorage.clear();state.mobile=true;state.path='/';state.push.mockReset()
 host=document.createElement('div');document.body.append(host);root=createRoot(host)
})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers()})
const advance=async(ms:number)=>{await act(async()=>vi.advanceTimersByTime(ms))}
const render=async()=>{await act(async()=>root.render(<MobileBottomNav/>))}
const phase=()=>host.querySelector('[data-mobile-nav-float]')?.getAttribute('data-intro-state')
it('introduces exactly four destinations, holds for five seconds after expanding, then collapses',async()=>{
 await render();await advance(40)
 expect(phase()).toBe('expanded')
 const preview=host.querySelector('nav[aria-label="Navigation introduction"]')!
 expect([...preview.querySelectorAll('button')].map(el=>el.textContent)).toEqual(['Explore','Watch','Read','Learn'])
 expect(preview.textContent).not.toContain('Home');expect(sessionStorage.getItem('awm-mobile-nav-intro-seen')).toBe('1')
 await advance(5400);expect(phase()).toBe('expanded')
 await advance(50);expect(phase()).toBe('closing')
 await advance(800);expect(phase()).toBe('idle');expect(host.querySelector('nav')).toBeNull();expect(host.querySelector('[aria-label="Open navigation"]')).not.toBeNull()
})
it('menu activation during the intro cancels automation and preserves the complete original menu',async()=>{
 await render();await advance(40)
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')!.click())
 expect(phase()).toBe('idle')
 expect([...document.querySelectorAll('#mobile-navigation button')].map(el=>el.textContent)).toEqual(['Home','Explore','Watch','Read','Learn'])
 await advance(7000);expect(document.querySelector('#mobile-navigation')).not.toBeNull();expect(host.querySelector('[aria-expanded="true"]')).not.toBeNull()
})
it.each([['Explore','/explore'],['Watch','/cartoons'],['Read','/books'],['Learn','/learn']])('intro %s navigates to %s immediately and cancels the preview',async(label,href)=>{
 await render();await advance(40)
 const button=[...host.querySelectorAll('nav button')].find(el=>el.textContent===label) as HTMLButtonElement
 await act(async()=>button.click());expect(state.push).toHaveBeenCalledExactlyOnceWith(href);expect(phase()).toBe('idle')
 await advance(7000);expect(phase()).toBe('idle')
})
it('cancels on route changes and does not replay after remount within the session',async()=>{
 await render();await advance(40);state.path='/books';await render();await advance(40);expect(phase()).toBe('idle')
 await act(async()=>root.render(<div/>));await render();await advance(7000);expect(phase()).toBe('idle')
})
it('does not display or consume the introduction on desktop',async()=>{
 state.mobile=false;await render();await advance(7000)
 expect(host.innerHTML).toBe('');expect(sessionStorage.getItem('awm-mobile-nav-intro-seen')).toBeNull()
})
it('honours watch-definition hiding without replaying when navigation reappears',async()=>{
 await render();await advance(40)
 await act(async()=>window.dispatchEvent(new CustomEvent('awm-watch-definition',{detail:true})));expect(host.querySelector('button')).toBeNull()
 await act(async()=>window.dispatchEvent(new CustomEvent('awm-watch-definition',{detail:false})));await advance(40);expect(phase()).toBe('idle')
})
it('cancels all intro timers and animation frames on unmount',async()=>{
 await render();await advance(40);await act(async()=>root.render(<div/>));expect(vi.getTimerCount()).toBe(0)
})
