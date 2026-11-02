import { describe, expect, it } from 'vitest'
import { bankQuestions, curatedQuestions, type BankRow } from './questionBank'
import { ruleLevels } from './ruleLevels'
import curriculum from './mobile-curriculum.json'

const source = (id: number, hash: string): BankRow => ({ id, sentence_hash: hash, chapter_id: 'chapter', paragraph_index: id, segment_id: null, cefr_rank: 2, payload: { tokens: [{ arabic: 'كَتَبَ' }, { arabic: 'عَلِيٌّ' }], translation: 'Ali wrote.', facts: [{ token_index: 1, mode: 'sentence_role', key: 'subject', arabic: 'فَاعِلٌ', english: 'Doer / subject of the verb' }] } })
describe('metadata question adapter', () => {
  it('keeps source references and never derives absent case or role facts', () => {
    const row=source(1,'first'); expect(bankQuestions([row],'grammatical_case')).toEqual([])
    const [question]=bankQuestions([row],'sentence_role');expect(question.answer).toBe('Doer / subject of the verb');expect(question.source).toEqual({chapter_id:'chapter',paragraph_index:1,segment_id:null});expect(question.choices).toHaveLength(4)
    expect(bankQuestions([{...row,payload:{...row.payload,facts:[]}}],'sentence_role')).toEqual([])
  })
  it('deduplicates sentences, validates target bounds and rejects unknown answers', () => {
    expect(bankQuestions([source(1,'same'),source(2,'same'),source(3,'other')],'sentence_role')).toHaveLength(2)
    const row=source(1,'first');row.payload.facts[0].token_index=90;expect(bankQuestions([row],'sentence_role')).toEqual([])
    row.payload.facts[0].token_index=1;row.payload.facts[0].english='guessed role';expect(bankQuestions([row],'sentence_role')).toEqual([])
  })
  it('has usable curated fallbacks for all three supported modes', () => {for(const mode of ['word_type','sentence_role','grammatical_case'] as const)expect(curatedQuestions(mode).length).toBeGreaterThan(2)})
  it('explains case using only the same-token stored role',()=>{
    const row=source(1,'reason')
    row.payload.facts.push({token_index:1,mode:'grammatical_case',key:'nominative',english:'Nominative',arabic:'مَرْفُوعٌ'})
    expect(bankQuestions([row],'grammatical_case')[0].explanation).toBe('The doer of the verb is nominative.')
    row.payload.facts[0].token_index=0
    expect(bankQuestions([row],'grammatical_case')[0].explanation).not.toContain('doer')
    expect(bankQuestions([row],'grammatical_case')[0].answer).toBe('Nominative')
  })
  it('gives concise role and word-class reasons without changing choices',()=>{
    expect(bankQuestions([source(1,'role')],'sentence_role')[0].explanation).toContain('performs the verb')
    const row=source(1,'word');row.payload.facts=[{token_index:0,mode:'word_type',key:'verb',english:'Verb',arabic:'فِعْلٌ'}]
    const question=bankQuestions([row],'word_type')[0]
    expect(question.explanation).toContain('action or state with a tense');expect(question.answer).toBe('Verb');expect(question.choices).toContain('Verb')
  })
  it('assigns each actual rule once in maintained CEFR configuration', () => {expect(Object.keys(ruleLevels).sort()).toEqual(Object.keys(curriculum.rules).sort());expect(new Set(Object.values(ruleLevels)).size).toBe(6)})
})
