import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import fixture from '@/test-fixtures/structured-chapter.json'
import StructuredChapterRenderer, { structuredChapterPages, StructuredChapterDiagnostic } from './StructuredChapterRenderer'
import StructuredChapterBlockRenderer from './StructuredChapterBlockRenderer'
import type { StructuredChapter } from '@/app/lib/structuredChapter'
function render(element: React.ReactNode) { const host=document.createElement('div');host.innerHTML=renderToStaticMarkup(element);return host }
afterEach(()=>vi.unstubAllEnvs())
it('renders every supplied-fragment block, all sections and test practices/answers/references in order',()=>{
 const before=JSON.stringify(fixture), host=render(<StructuredChapterRenderer chapter={fixture}/>)
 expect(host.querySelector('[lang="ar"]')?.textContent).toBe(fixture.title_ar)
 expect(host.textContent).toContain(fixture.title_en)
 expect(host.querySelectorAll('[data-structured-section]')).toHaveLength(7)
 expect([...host.querySelectorAll('[data-structured-section]')].map(el=>el.getAttribute('data-structured-section'))).toEqual(fixture.sections.map(section=>section.kind))
 const sentence=fixture.sections[1].blocks[0] as Record<string,unknown>
 expect(host.textContent).toContain(sentence.translation_en)
 expect(host.querySelector('table caption')?.textContent).toBe('Word / Irab / Why')
 expect(host.querySelectorAll('table th')).toHaveLength(3)
 expect(host.querySelector('[aria-label="Directional relationships"]')?.textContent).toContain('Governing adjective')
 expect(host.querySelectorAll('fieldset')).toHaveLength(8)
 expect(host.querySelectorAll('[data-answer-for]')).toHaveLength(8)
 expect(host.querySelector('[data-answer-for="qa-q02"] h3')?.textContent).toBe('Question 2')
 expect(host.querySelectorAll('section[aria-label="References"] li')).toHaveLength(3)
 const answers=host.querySelector('section[aria-label="Answers"] details')!
 expect(answers.hasAttribute('open')).toBe(false)
 expect([...host.querySelectorAll('summary')].map(el=>el.textContent)).toContain('Advanced Distinctions')
 expect([...host.querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent==='Common Mistakes')?.open).toBe(true)
 expect(structuredChapterPages(fixture)).toHaveLength(10)
 expect(JSON.stringify(fixture)).toBe(before)
 expect(host.textContent).not.toContain('schema_version')
})
it('escapes chapter strings and disables executable reference URLs',()=>{
 const chapter={...fixture,title_en:'<script>alert(1)</script>',references:[{title:'<img src=x onerror=alert(1)>',url:'javascript:alert(1)'}]}
 const host=render(<StructuredChapterRenderer chapter={chapter}/>);
 expect(host.querySelector('script,img')).toBeNull();expect(host.textContent).toContain('<script>alert(1)</script>')
 expect(host.querySelector('section[aria-label="References"] a')).toBeNull()
})
it('retains neutral unknown highlights, unknown sections and blocks without losing later text',()=>{
 vi.stubEnv('NODE_ENV','development');const warning=vi.spyOn(console,'warn').mockImplementation(()=>{})
 const host=render(<StructuredChapterBlockRenderer value={{type:'collapsible',title_en:'Container',content:[{type:'future-widget'},{type:'highlighted-sentence',segments:[{text_ar:'AR',highlight_key:'unknown'}]},{type:'paragraph',text_en:'Still readable'}]}}/>);
 expect(host.textContent).toContain('Still readable');expect(host.textContent).toContain('Sentence segment');expect(warning).toHaveBeenCalledWith(expect.stringContaining('future-widget'));warning.mockRestore()
})
it('bounds recursive content and recovers from malformed blocks, sections and cyclic diagrams',()=>{
 const cyclic:Record<string,unknown>={type:'collapsible',title_en:'Cycle'};cyclic.content=[cyclic]
 expect(render(<StructuredChapterBlockRenderer value={cyclic}/>).textContent).toContain('could not be displayed')
 const chapter={...fixture,sections:[null,{blocks:[null,{type:'table'},{type:'paragraph',text_en:'After malformed content'}]}]} as StructuredChapter
 const host=render(<StructuredChapterRenderer chapter={chapter}/>);expect(host.textContent).toContain('After malformed content')
 const graph=render(<StructuredChapterBlockRenderer value={{type:'diagram',nodes:[{id:'a',label_en:'A'},{id:'b',label_en:'B'}],edges:[{source:'a',target:'b'},{source:'b',target:'a'},{source:'missing',target:'a'}]}}/>);
 expect(graph.querySelectorAll('figure [aria-label="Directional relationships"] li')).toHaveLength(2)
})
it('shows clear unsupported-version diagnostics without JSON or traces',()=>{
 const host=render(<StructuredChapterDiagnostic message="Schema 2 needs review."/>);expect(host.textContent).toContain('needs a content update');expect(host.textContent).toContain('Schema 2 needs review.')
})
it('uses native, independently named self-study controls without generating answers',()=>{
 const host=render(<StructuredChapterRenderer chapter={{...fixture,answers:[]}}/>);
 expect(host.querySelectorAll('textarea')).toHaveLength(6);expect(host.querySelectorAll('input[type="radio"]')).toHaveLength(4)
 expect(host.querySelectorAll('input[type="radio"]:checked')).toHaveLength(0)
 expect(host.querySelector('section[aria-label="Answers"]')).toBeNull()
})

it.each(['__proto__','constructor','toString'])('uses the neutral labeled treatment for unknown highlight key %s',highlight_key=>{
 const host=render(<StructuredChapterBlockRenderer value={{type:'highlighted-sentence',segments:[{text_ar:'Test segment',highlight_key}]}}/>);
 expect(host.textContent).toContain('Sentence segment')
})
