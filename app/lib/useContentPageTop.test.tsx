import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach,afterEach,expect,it,vi } from 'vitest'
import { scrollContentTop,useContentPageTop } from './useContentPageTop'
let host:HTMLDivElement,root:Root
const rect=(top:number,bottom=top+20)=>({top,bottom,left:0,right:300,width:300,height:bottom-top,x:0,y:top,toJSON:()=>({})})
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);vi.spyOn(window,'scrollTo').mockImplementation(()=>{})})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();document.getElementById('main-navbar')?.remove();vi.restoreAllMocks()})
it.each([375,1200])('resets the browser viewport below a fixed header at width %i',width=>{
 Object.defineProperty(window,'innerWidth',{configurable:true,value:width});Object.defineProperty(window,'scrollY',{configurable:true,value:500})
 const nav=document.createElement('header');nav.id='main-navbar';nav.style.position='fixed';document.body.appendChild(nav);vi.spyOn(nav,'getBoundingClientRect').mockReturnValue(rect(0,80))
 const anchor=document.createElement('div');host.appendChild(anchor);vi.spyOn(anchor,'getBoundingClientRect').mockReturnValue(rect(200))
 scrollContentTop(anchor);expect(window.scrollTo).toHaveBeenCalledWith({top:608,behavior:'instant'})
})
it('resets an internal panel rather than scrolling the browser document',()=>{
 host.style.overflowY='auto';Object.defineProperty(host,'scrollHeight',{value:900});Object.defineProperty(host,'clientHeight',{value:200});host.scrollTop=100
 const panelScroll=vi.fn();host.scrollTo=panelScroll;vi.spyOn(host,'getBoundingClientRect').mockReturnValue(rect(100,300))
 const anchor=document.createElement('div');host.appendChild(anchor);vi.spyOn(anchor,'getBoundingClientRect').mockReturnValue(rect(350))
 scrollContentTop(anchor);expect(panelScroll).toHaveBeenCalledWith({top:338,behavior:'instant'});expect(window.scrollTo).not.toHaveBeenCalled()
})
function Probe({page,ready}:{page:number;ready:boolean}){const {ref:contentRef,requestScroll}=useContentPageTop(String(page),ready);return <div ref={contentRef}><span>Page {page}</span><button onClick={requestScroll}>Navigate</button></div>}
it('waits for the rendered result, scrolls once, and coalesces rapid navigation',async()=>{
 await act(async()=>root.render(<Probe page={1} ready/>));expect(window.scrollTo).not.toHaveBeenCalled()
 await act(async()=>{host.querySelector('button')!.click();root.render(<Probe page={2} ready={false}/>)})
 expect(window.scrollTo).not.toHaveBeenCalled()
 await act(async()=>{host.querySelector('button')!.click();host.querySelector('button')!.click();root.render(<Probe page={1} ready={false}/>)})
 await act(async()=>root.render(<Probe page={1} ready/>));expect(window.scrollTo).toHaveBeenCalledTimes(1)
 await act(async()=>root.render(<Probe page={1} ready/>));expect(window.scrollTo).toHaveBeenCalledTimes(1)
 await act(async()=>{host.querySelector('button')!.click();root.render(<Probe page={3} ready/>)})
 expect(window.scrollTo).toHaveBeenCalledTimes(2)
})
