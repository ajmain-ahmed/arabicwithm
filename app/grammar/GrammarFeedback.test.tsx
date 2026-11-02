import React,{act,useState} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {AnswerArea,Arabic,AutoNextControl,GrammarProvider,GrammarSettings,TashkeelControl} from './GrammarUI'
import useCorrectAutoAdvance,{feedbackDelay} from './useCorrectAutoAdvance'
let host:HTMLDivElement,root:Root
function Activity(){
 const [answer,setAnswer]=useState<boolean|null>(null),[question,setQuestion]=useState(0)
 function next(){setAnswer(null);setQuestion(n=>n+1)}
 useCorrectAutoAdvance(answer===true,next,'A short note.')
 return <><AutoNextControl/><TashkeelControl/><GrammarSettings/><Arabic>كَتَبَ</Arabic><span data-question>{question}</span><AnswerArea result={answer===null?undefined:{correct:answer,answer:'Verb',explanation:'A short note.',next}}><button onClick={()=>setAnswer(true)}>Right</button><button onClick={()=>setAnswer(false)}>Wrong</button></AnswerArea></>
}
async function render(key='initial'){await act(async()=>{root.render(<GrammarProvider key={key}><Activity/></GrammarProvider>)});await act(async()=>{vi.advanceTimersByTime(20)})}
async function click(label:string){await act(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent===label)!.click()})}
async function toggle(label:string){const input=[...document.querySelectorAll('label')].find(l=>l.textContent===label)!.querySelector<HTMLInputElement>('input')!;await act(async()=>input.click())}
beforeEach(()=>{localStorage.clear();vi.useFakeTimers();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.appendChild(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers()})
it('replaces choices with semantic central feedback and advances correct answers once',async()=>{
 await render();await click('Right')
 const feedback=host.querySelector('[data-grammar-feedback]')!
 expect(feedback.textContent).toContain('Correct');expect(feedback.querySelector('svg')).not.toBeNull()
 expect(host.querySelector('[data-grammar-options]')?.getAttribute('inert')).toBe('')
 expect(document.activeElement).toBe(feedback)
 await act(async()=>{vi.advanceTimersByTime(1499)});expect(host.querySelector('[data-question]')?.textContent).toBe('0')
 await act(async()=>{vi.advanceTimersByTime(1)});expect(host.querySelector('[data-question]')?.textContent).toBe('1')
})
it('keeps incorrect correction visible until Next regardless of the automatic setting',async()=>{
 await render();await click('Wrong');await act(async()=>{vi.advanceTimersByTime(10000)})
 expect(host.querySelector('[data-question]')?.textContent).toBe('0')
 expect(host.querySelector('[role=status]')?.textContent).toContain('IncorrectCorrect answer: Verb')
 await click('Next');expect(host.querySelector('[data-question]')?.textContent).toBe('1')
})
it('persists Auto Next off across activities and leaves correct feedback for manual Next',async()=>{
 await render();await toggle('Auto Next');await render('other-activity');await click('Right')
 await act(async()=>{vi.advanceTimersByTime(10000)})
 expect(host.querySelector('[data-question]')?.textContent).toBe('0')
 expect(JSON.parse(localStorage.getItem('awm-grammar-settings')!).autoNext).toBe(false)
 await click('Next');expect(host.querySelector('[data-question]')?.textContent).toBe('1')
})
it('cancels a pending automatic transition when Auto Next is switched off',async()=>{
 await render();await click('Right');await act(async()=>{vi.advanceTimersByTime(500)});await toggle('Auto Next')
 await act(async()=>{vi.advanceTimersByTime(4000)})
 expect(host.querySelector('[data-question]')?.textContent).toBe('0')
})
it('shares the inline Tashkil preference with settings without changing the question',async()=>{
 await render();expect(host.querySelector('[data-grammar-arabic]')?.textContent).toBe('كَتَبَ')
 await toggle('Show Tashkīl');expect(host.querySelector('[data-grammar-arabic]')?.textContent).toBe('كتب')
 const settings=host.querySelector<HTMLButtonElement>('[aria-label=Settings]')!;await act(async()=>settings.click())
 const shared=[...document.querySelectorAll('label')].find(l=>l.textContent==='Tashkīl')!.querySelector<HTMLInputElement>('input')!
 expect(shared.checked).toBe(false);await act(async()=>shared.click())
 expect(host.querySelector('[data-grammar-arabic]')?.textContent).toBe('كَتَبَ')
 expect(host.querySelector('[data-question]')?.textContent).toBe('0')
})
it('uses simple bounded reading delays',()=>{
 expect(feedbackDelay('Good')).toBe(1500);expect(feedbackDelay('x'.repeat(100))).toBe(2500);expect(feedbackDelay('x'.repeat(1000))).toBe(4000)
})
