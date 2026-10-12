import { describe, expect, it } from 'vitest'
import { websiteQuestions, correctSpan, normaliseAnswer, matchesAnswer, caseOptions } from './websiteQuestions'
describe('reviewed website foundations',()=>{
 it('uses unique finite questions with vocalised Arabic and contextual explanations',()=>{
  expect(new Set(websiteQuestions.map(q=>q.id)).size).toBe(websiteQuestions.length)
  for(const q of websiteQuestions){expect(q.arabic).toMatch(/[\u064b-\u0652]/);expect(q.english.length).toBeGreaterThan(3);expect(q.explanation.length).toBeGreaterThan(30);expect(q.span||q.answer||q.caseParts).toBeTruthy();if(q.span){expect(q.span[0]).toBeGreaterThanOrEqual(0);expect(q.span[1]).toBeLessThanOrEqual(q.arabic.split(' ').length)}if(q.choices)expect(q.choices).toContain(q.answer);if(q.caseParts)q.caseParts.forEach((p,i)=>expect(caseOptions[i]).toContain(p))}
 })
 it('requires a complete contiguous phrase, with no extra words',()=>{expect(correctSpan([0,1],[0,2])).toBe(true);expect(correctSpan([0],[0,2])).toBe(false);expect(correctSpan([0,2],[0,2])).toBe(false);expect(correctSpan([0,1,2],[0,2])).toBe(false)})
 it('accepts unvocalised responses without accepting a different stem',()=>{expect(normaliseAnswer('قُلْتُ')).toBe(normaliseAnswer('قلت'));expect(normaliseAnswer('قالت')).not.toBe(normaliseAnswer('قُلْتُ'));expect(normaliseAnswer('ك ت ب')).toBe('كتب')})
 it('rejects explicit vowels for the wrong person while accepting omitted vowels',()=>{expect(matchesAnswer('كتبت','كَتَبْتُ')).toBe(true);expect(matchesAnswer('كَتَبْتَ','كَتَبْتُ')).toBe(false);expect(matchesAnswer('كتبْتُ','كَتَبْتُ')).toBe(true)})
})
