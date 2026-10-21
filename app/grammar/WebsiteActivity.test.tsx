import React,{act} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
vi.mock('@mui/material',()=>({
 Paper:({children}:{children:React.ReactNode})=><div>{children}</div>,
 Box:({children,role}:{children:React.ReactNode;role?:string})=><div role={role}>{children}</div>,
 Alert:({children,role}:{children:React.ReactNode;role?:string})=><div role={role}>{children}</div>,
 Typography:({children}:{children:React.ReactNode})=><p>{children}</p>,
 Button:({children,onClick,disabled,...props}:{children:React.ReactNode;onClick:()=>void;disabled?:boolean;['aria-label']?:string;['aria-pressed']?:boolean})=><button disabled={disabled} onClick={onClick} aria-label={props['aria-label']} aria-pressed={props['aria-pressed']}>{children}</button>,
 TextField:({label,value,onChange}:{label:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void})=><input aria-label={label} value={value} onChange={onChange}/>,
}))
import WebsiteActivity from './WebsiteActivity'
let host:HTMLDivElement,root:Root
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove()})
async function click(text:string){const b=[...host.querySelectorAll('button')].find(b=>b.textContent===text)!;await act(async()=>b.click())}
async function type(value:string){const input=host.querySelector('input')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))})}
it('shows a correction after an incorrect answer and allows a deliberate retry',async()=>{
 await act(async()=>root.render(<WebsiteActivity activity="conjugation"/>));expect(host.textContent).not.toContain('The sound perfect stem')
 await type('قالت');await click('Check Answer');expect(host.querySelector('[role=status]')!.textContent).toContain('Incorrect');expect(host.querySelector('[role=status]')!.textContent).toContain('كَتَبْتُ')
 await click('Retry')
 await type('كتبت');await click('Check Answer');expect(host.querySelector('[role=status]')!.textContent).toContain('Correct');expect(host.textContent).toContain('first-person singular')
})
it('submits single-word selection immediately and locks the answer while feedback is visible',async()=>{await act(async()=>root.render(<WebsiteActivity activity="roles"/>));const word=host.querySelector<HTMLButtonElement>('[aria-label="Select الطَّالِبُ"]')!;await act(async()=>word.click());expect(word.getAttribute('aria-pressed')).toBe('true');expect(word.disabled).toBe(true);expect(host.querySelector('[role=status]')!.textContent).toContain('Correct');expect([...host.querySelectorAll('button')].some(b=>b.textContent==='Check Answer')).toBe(false)})
it('filters reviewed root identification by three or four radicals',async()=>{
 await act(async()=>root.render(<WebsiteActivity activity="roots" rootLength={4}/>))
 expect(host.textContent).toContain('four-letter root');expect(host.textContent).toContain('1 / 1')
 await type('دحرج');await click('Check Answer');expect(host.querySelector('[role=status]')!.textContent).toContain('Correct')
 await act(async()=>root.render(<WebsiteActivity key="three" activity="roots" rootLength={3}/>))
 expect(host.textContent).toContain('three-letter root');expect(host.textContent).toContain('1 / 3')
})
