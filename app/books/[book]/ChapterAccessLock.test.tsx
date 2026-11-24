import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
vi.mock('@/app/AuthContext',()=>({useAuth:()=>({user:null,loading:true})}))
vi.mock('next/link',()=>({default:({prefetch,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>&{prefetch?:boolean})=>{void prefetch;return <a {...props}>{children}</a>}}))
import { ChapterLink } from './ChapterAccessLock'
it('does not cancel server-authorized Admin navigation while the browser session is loading',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 const host=document.createElement('div'),root=createRoot(host)
 try{
  await act(async()=>root.render(<ChapterLink href="/books/draft/chapter" chapterNumber={1} serverAuthorized>Draft chapter</ChapterLink>))
  const event=new MouseEvent('click',{bubbles:true,cancelable:true})
  host.querySelector('a')!.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
  await act(async()=>root.render(<ChapterLink href="/books/draft/chapter" chapterNumber={1}>Public chapter</ChapterLink>))
  const publicEvent=new MouseEvent('click',{bubbles:true,cancelable:true})
  host.querySelector('a')!.dispatchEvent(publicEvent)
  expect(publicEvent.defaultPrevented).toBe(true)
 }finally{await act(async()=>root.unmount())}
})
