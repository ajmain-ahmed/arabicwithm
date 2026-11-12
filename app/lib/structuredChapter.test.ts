import { expect, it } from 'vitest'
import fixture from '@/test-fixtures/structured-chapter.json'
import { detectChapterFormat, safeReferenceUrl, validateAdditionalStructuredChapter } from './structuredChapter'
import { validateBookTokenGrammar } from './bookTokenGrammar'
it('detects only the additional object format and preserves every source key', () => {
 const before = JSON.stringify(fixture), result = detectChapterFormat(fixture)
 expect(result.kind).toBe('structured')
 if(result.kind==='structured') expect(result.chapter).toBe(fixture)
 validateAdditionalStructuredChapter(fixture); expect(JSON.stringify(fixture)).toBe(before)
})
it.each([[], [{ tokens: [{ arabic: 'word' }], translation: 'Translation' }], null, { sections: [] }, { schema_version: '1.0.0' }, { tokens: [], sections: [] }])('never redirects an existing/non-structured format: %j', value => {
 expect(detectChapterFormat(value).kind).toBe('legacy'); expect(()=>validateAdditionalStructuredChapter(value)).not.toThrow()
})
it('keeps existing grammar rejection and accepted nullable/legacy fields unchanged', () => {
 const invalid=[{tokens:[{arabic:'word',syntactic_role:'invalid'}]}]
 expect(()=>validateBookTokenGrammar(invalid)).toThrow('Sentence 1, token 1: syntactic_role')
 validateAdditionalStructuredChapter(invalid)
 expect(()=>validateBookTokenGrammar([{tokens:[{syntactic_role:null,grammatical_case:{arabic:'label',english:'label'}}]}])).not.toThrow()
})
it.each(['1.0.0','1.2.9','1.99.999','1.2.3-beta.1'])('accepts compatible versions %s', schema_version => expect(detectChapterFormat({...fixture,schema_version}).kind).toBe('structured'))
it.each([{...fixture,schema_version:'2.0.0'},{...fixture,schema_version:'broken'},{...fixture,sections:{}},{...fixture,answers:{}},{...fixture,sections:[{tokens:[]}]}])('provides a diagnostic instead of reinterpreting malformed structured content', value => {
 expect(detectChapterFormat(value).kind).toBe('structured-error');expect(()=>validateAdditionalStructuredChapter(value)).toThrow()
})
it('allows unknown block types and partial block recovery without changing the JSON',()=>{
 expect(detectChapterFormat({...fixture,sections:[{blocks:[null,{type:'future'}]}]}).kind).toBe('structured')
})
it.each(['javascript:alert(1)','data:text/html,boom','//example.com','https://user:password@example.com','not a URL'])('does not activate unsafe reference URL %s', url => expect(safeReferenceUrl(url)).toBeUndefined())
it('accepts safe web URLs',()=>expect(safeReferenceUrl('https://example.com/book#page-3')).toBe('https://example.com/book#page-3'))
