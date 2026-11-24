import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
import OrderingActivity from './OrderingActivity'
import {websiteQuestions} from '@/app/grammar/websiteQuestions'
it('uses the existing ordering engine with the exact reviewed source and waits for explicit progression',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
 const host=document.createElement('div'),root=createRoot(host),next=vi.fn()
 const question=websiteQuestions.find(q=>q.arabic.trim().split(/\s+/).length>=3)!
 try{
  await act(async()=>root.render(<OrderingActivity question={question} onNext={next}/>))
  expect(host.querySelector('[data-interaction="ordering"]')).not.toBeNull()
  const check=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Check answer')!
  await act(async()=>check.click())
  expect(host.querySelector('[role=status]')?.textContent).toContain(question.arabic)
  expect(host.querySelector('[role=status]')?.textContent).toContain(question.explanation)
  expect(next).not.toHaveBeenCalled()
  await act(async()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Next Activity')!.click())
  expect(next).toHaveBeenCalledOnce()
 }finally{await act(async()=>root.unmount())}
})
