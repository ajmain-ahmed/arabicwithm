import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it } from 'vitest'
import StructuredActivity from './StructuredActivity'
import StructuredStage from './StructuredStage'
import type { StructuredChapter, StructuredRecord } from '@/app/lib/structuredChapter'
let host: HTMLDivElement, root: Root
beforeEach(()=>{localStorage.clear();host=document.createElement('div');document.body.append(host);root=createRoot(host)})
afterEach(()=>{act(()=>root.unmount());host.remove()})
const click=(label:string)=>act(()=>{[...host.querySelectorAll('button')].find(b=>b.textContent===label)!.click()})
const render=(activity:StructuredRecord,answer:StructuredRecord)=>act(()=>root.render(<StructuredActivity key={String(activity.id)} activity={activity} answer={answer}/>))
it('keeps authored answers and hints concealed until checking, with independent multiple selections',()=>{
 render({id:'multiple',prompt_en:'Choose two',hint_en:'Hidden hint',choices:[{id:'a',text:'A'},{id:'b',text:'B'},{id:'c',text:'C'}],interaction:{kind:'multiple-select',grading:'automatic'}},{correct_choice_ids:['a','c'],explanation_en:'Authored explanation'})
 expect(host.textContent).not.toContain('Authored explanation');expect(host.querySelector('details')?.open).toBe(false)
 const boxes=host.querySelectorAll<HTMLInputElement>('input');act(()=>{boxes[0].click();boxes[2].click()});click('Check answer')
 expect(host.querySelector('[role=status]')?.textContent).toContain('Correct.');expect(host.textContent).toContain('Authored explanation')
 act(()=>boxes[1].click());expect(host.querySelector('[role=status]')).toBeNull()
})
it.each(['matching','classification'])('provides accessible select controls for %s without showing the key',kind=>{
 render({id:kind,interaction:{kind,grading:'automatic',pairs:[{id:'p1',left:'Left',right:'Right'}],items:[{id:'p1',text:'Item'}],categories:['Category']}},{[kind==='matching'?'correct_pairs':'correct_categories']:{p1:kind==='matching'?'p1':'Category'},answer_en:'Model'})
 const select=host.querySelector('select')!;expect(select.value).toBe('');expect(host.textContent).not.toContain('Model')
 act(()=>{select.value=kind==='matching'?'p1':'Category';select.dispatchEvent(new Event('change',{bubbles:true}))});click('Check answer');expect(host.querySelector('[role=status]')?.textContent).toContain('Correct.')
})
it('orders tiles with move controls, without requiring drag and drop',()=>{
 render({id:'order',interaction:{kind:'ordering',grading:'automatic',tiles:[{id:'a',text:'A'},{id:'b',text:'B'}]}},{correct_order:['b','a']})
 act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Move item 2 up"]')!.click());click('Check answer');expect(host.querySelector('[role=status]')?.textContent).toContain('Correct.')
})
it('replaces inline blank markers with labelled inputs and renders short-text self-check without an automatic score',()=>{
 render({id:'blank',stimulus_ar:'سَارَ ← {{f1}}',interaction:{kind:'fill-blank',fields:[{id:'f1',label_en:'Root'}]}},{})
 expect(host.textContent).not.toContain('{{f1}}');expect(host.querySelector('[aria-label=Root]')).not.toBeNull()
 render({id:'short',interaction:{kind:'short-text',grading:'self-check'}},{answer_en:'Model explanation'})
 expect(host.querySelector('textarea')).not.toBeNull();expect(host.textContent).not.toContain('Model explanation');expect(host.querySelector('button')?.disabled).toBe(true)
})
it('uses authoritative mastery IDs, saves passing progress and unlocks the next stage',()=>{
 const stage={id:'one',title_en:'First stage',mastery_activity_ids:['q'],activity_ids:['q']}
 const second={id:'two',title_en:'Second stage',unlock_after:'one'}
 const chapter:StructuredChapter={schema_version:'1.1.3',id:'unit-controls-only',sections:[],activities:[{id:'q',stage_id:'one',phase:'practice',choices:[{id:'a',text:'Correct choice'}],interaction:{kind:'single-choice',grading:'automatic'}}],answers:[{question_id:'q',correct_choice_ids:['a']}],learning_path:{mode:'sequential-mastery',passing_percent:100,stages:[stage,second]}}
 act(()=>root.render(<><StructuredStage chapter={chapter} stage={stage} remediation={<p>Review paragraph</p>}><p>Lesson</p></StructuredStage><StructuredStage chapter={chapter} stage={second} remediation={null}><p>Unlocked lesson</p></StructuredStage></>))
 expect(host.textContent).not.toContain('Unlocked lesson');expect(host.querySelector('legend')?.textContent).toContain('Mastery Check')
 act(()=>host.querySelector<HTMLInputElement>('input')!.click());click('Check answer');click('Submit mastery check')
 expect(host.textContent).toContain('Unlocked lesson');expect(JSON.parse(localStorage.getItem('awm-structured:unit-controls-only:1.1.3')!).completed).toEqual(['one'])
 click('Retry activities');expect(host.querySelector('input')?.checked).toBe(false)
})
