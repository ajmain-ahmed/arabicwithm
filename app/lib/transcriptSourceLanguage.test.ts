import {expect,it} from 'vitest'
import {sourceLanguageFromMetadata,englishSourceNeedsReview} from './transcriptSourceLanguage'
import example from '@/e2e/source-language-data.json'
it.each([undefined,null,{},[],{lang:'en'},{source_language:'EN'},{source_language:'ar'}])('leaves existing records Arabic by default: %j',raw=>expect(sourceLanguageFromMetadata(raw)).toBe('ar'))
it('uses only explicit metadata, never group names, script or old lang fields',()=>expect(sourceLanguageFromMetadata({source_language:'en',lang:'ar'})).toBe('en'))
it('recognizes the supplied valid English/Arabic/Arabic example',()=>expect(englishSourceNeedsReview(example.tokens,example.translation)).toBe(false))
it('flags legacy reversed fields without modifying them',()=>{const tokens=example.tokens.map(t=>({...t,english:t.arabic,arabic:t.english})),before=JSON.stringify(tokens);expect(englishSourceNeedsReview(tokens,example.translation)).toBe(true);expect(JSON.stringify(tokens)).toBe(before)})
it.each([null,'English translation'])('flags missing or incorrectly populated sentence translations',translation=>expect(englishSourceNeedsReview(example.tokens,translation)).toBe(true))
