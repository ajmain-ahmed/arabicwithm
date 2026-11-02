import {expect,it} from 'vitest'
import {contextExplanation,preparedQuestions,variedPractice,wordPatternInventory,type RecentQuestion} from './preparedQuestions'
import curriculum from './mobile-curriculum.json'
import type {PreparedRow,Verb} from './models'

it('covers every reviewed pattern, including nominal, instrument and participial templates',()=>{
 expect(wordPatternInventory).toHaveLength(12)
 expect(new Set(wordPatternInventory.map(p=>p.pattern)).size).toBe(12)
 for(const p of curriculum.patterns)expect(wordPatternInventory.some(pattern=>pattern.pattern===p.pattern)).toBe(true)
 expect(wordPatternInventory.some(p=>p.id==='active-participle-II')).toBe(true)
 expect(wordPatternInventory.some(p=>p.id==='verbal-noun-X')).toBe(true)
 const questions=preparedQuestions([],'patterns')
 expect(new Set(questions.map(q=>q.patternKey)).size).toBe(12)
 for(const q of questions){expect(q.choices).toHaveLength(6);expect(q.choices.some(c=>c.id===q.answer)).toBe(true);expect(q.note.length).toBeGreaterThan(20)}
})
it('balances a long run and suppresses recent words and word-pattern pairs',()=>{
 const pool=preparedQuestions([],'patterns'),recent:RecentQuestion[]=[]
 for(let round=0;round<30;round++){
  const selected=variedPractice([...pool,...Array.from({length:30},(_,i)=>({...pool[0],id:`duplicate-context-${i}`}))],recent)
  expect(new Set(selected.map(q=>q.patternKey)).size).toBe(12)
  expect(new Set(selected.map(q=>q.pairKey)).size).toBe(selected.length)
  for(const q of selected){expect(recent.slice(-3).some(h=>h.patternKey===q.patternKey)).toBe(false);recent.push(q)}
 }
})
it('retains eligible indexed sources without inferring patterns from unchecked words',()=>{
 const row:PreparedRow&{start_seconds:number}={id:'source',source_kind:'transcript',source_id:'video',source_label:'Saved source',start_seconds:0,payload:{arabic:'هذا كبير',english:'This is big',targets:[{surface:'كبير',token_index:1,pattern_index:0,dictionary_entry_id:18408}]}}
 expect(preparedQuestions([row],'patterns').some(q=>q.id.startsWith('source:'))).toBe(true)
 const wrong={...row,payload:{...row.payload,targets:[{...row.payload.targets[0],dictionary_entry_id:123}]}}
 expect(preparedQuestions([wrong],'patterns').some(q=>q.id.startsWith('source:'))).toBe(false)
})
it('keeps small pools usable without manufacturing new questions',()=>{
 const one=preparedQuestions([],'patterns').slice(0,1)
 expect(variedPractice(one,one,12)).toHaveLength(1)
})
it('explains contextual forms using stored patterns, qualified rules and the actual item meaning',()=>{
 const verb:Verb={id:'teach',arabic:'عَلَّمَ',root:'علم',meaning:'to teach',form:2,source:'Reviewed lesson'}
 const note=contextExplanation(verb,'he taught the student')
 expect(note).toContain(curriculum.forms[1].past)
 expect(note).toContain(curriculum.forms[1].present)
 expect(note).toContain(curriculum.forms[1].tendency)
 expect(note).toContain('he taught the student')
 expect(note).not.toContain('always')
})
