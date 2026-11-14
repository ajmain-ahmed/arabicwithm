import { expect, it } from 'vitest'
import { checkActivity, masteryIds, shuffled, structuredLearningWarnings } from './structuredLearning'
import { structuredPageCount, type StructuredChapter } from './structuredChapter'
import { structuredChapterPages } from '@/app/components/books/structured/StructuredChapterRenderer'
const response = { choices: [], fields: {}, order: [] }
it('grades choice IDs as a set, never by label similarity',()=>{
 const a={interaction:{kind:'multiple-select',grading:'automatic'}}, answer={correct_choice_ids:['a','c']}
 expect(checkActivity(a,answer,{...response,choices:['c','a']})).toBe(true)
 expect(checkActivity(a,answer,{...response,choices:['a']})).toBe(false)
 expect(checkActivity(a,answer,{...response,choices:['a','b','c']})).toBe(false)
})
it.each([['matching','correct_pairs'],['classification','correct_categories'],['fill-blank','correct_fields']])('uses explicit authored %s mappings', (kind,key)=>{
 const a={interaction:{kind,grading:'automatic'}}, answer={[key]:{f1:'authored'}}
 expect(checkActivity(a,answer,{...response,fields:{f1:'authored'}})).toBe(true)
 expect(checkActivity(a,answer,{...response,fields:{f1:'different'}})).toBe(false)
})
it('normalizes only optional diacritics and surrounding spaces when authored, preserving Arabic letters',()=>{
 const activity={interaction:{kind:'fill-blank',grading:'automatic',sensitive_to_diacritics:false}}, answer={correct_fields:{f1:'قَالَ'}}
 expect(checkActivity(activity,answer,{...response,fields:{f1:' قال '}})).toBe(true)
 expect(checkActivity(activity,answer,{...response,fields:{f1:'قل'}})).toBe(false)
 expect(checkActivity({...activity,interaction:{...activity.interaction,sensitive_to_diacritics:true}},answer,{...response,fields:{f1:'قال'}})).toBe(false)
})
it('never automatically awards self-check or unsupported answers',()=>{
 expect(checkActivity({interaction:{kind:'short-text',grading:'self-check'}},{correct_fields:{f1:'anything'}},{...response,fields:{f1:'anything'}})).toBeNull()
 expect(checkActivity({interaction:{kind:'single-choice',grading:'automatic'}},{},response)).toBeNull()
})
it('grades tile order exactly and shuffles stably without mutating authored content',()=>{
 const a={interaction:{kind:'ordering',grading:'automatic'}}, answer={correct_order:['b','a']}
 expect(checkActivity(a,answer,{...response,order:['b','a']})).toBe(true)
 expect(checkActivity(a,answer,{...response,order:['a','b']})).toBe(false)
 const source=['a','b','c','d','e','f'];expect(shuffled(source,'attempt1')).toEqual(shuffled(source,'attempt1'));expect(shuffled(source,'attempt2')).not.toEqual(shuffled(source,'attempt1'));expect(source).toEqual(['a','b','c','d','e','f'])
})
it('keeps authoritative mastery IDs, reports dangling references and counts the same staged pages as the renderer',()=>{
 const chapter:StructuredChapter={schema_version:'1.1.4',sections:[{id:'intro',blocks:[]},{id:'lesson',blocks:[]}],activities:[{id:'q1',phase:'practice',stage_id:'one'},{id:'q2',phase:'mastery',stage_id:'one'},{id:'extra'}],answers:[{question_id:'missing'}],learning_path:{mode:'sequential-mastery',stages:[{id:'one',section_ids:['lesson','missing'],activity_ids:['q1','q2'],mastery_activity_ids:['q1']}]}}
 expect(masteryIds(chapter,{id:'one',mastery_activity_ids:['q1']})).toEqual(['q1'])
 expect(structuredLearningWarnings(chapter)).toEqual(expect.arrayContaining([expect.stringContaining('missing section'),expect.stringContaining('missing activity')]))
 expect(structuredPageCount(chapter)).toBe(structuredChapterPages(chapter).length)
})
