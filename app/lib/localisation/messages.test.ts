import {expect,it} from 'vitest'
import {translateMessage} from './messages'
import {learnerMessages} from './learnerMessages'
import {legalMessages} from './legalMessages'
import {formatMembershipDate} from '@/app/lib/display'

it('covers the actual Book and Show category variants without changing English keys',()=>{
 const categories=['Children','Crime Drama','Culture','Drama','Everyday','Fantasy','Islamic','Language','Learning','Mystery','Non-fiction','Non-Fiction','Young Adults','Action','Animation','Anime','Cartoon','Cinema','Comedy','Everyday Arabic','Islamic Heritage','Islamic History','Sci-Fi','Superhero']
 for(const category of categories){expect(translateMessage('en',category)).toBe(category);expect(translateMessage('ar',category)).toMatch(/[\u0621-\u064a]/u)}
 expect(translateMessage('ar','Non-fiction')).toBe(translateMessage('ar','Non-Fiction'))
})
it('translates complete promotional, footer and legal copy with intact brands',()=>{
 expect(translateMessage('ar','Upgrade to AWM+')).toBe('ترقَّ إلى AWM+')
 expect(translateMessage('ar','Modern Standard Arabic made accessible — through immersive cartoons with interactive subtitles.')).toContain('الترجمات التفاعلية')
 expect(translateMessage('ar','10. Changes and governing law')).toContain('القانون')
 for(const value of [...Object.values(learnerMessages),...Object.values(legalMessages)]){expect(value.trim()).not.toBe('');expect(value).not.toContain('??')}
})
it('handles typographic quote variants and UI counts while leaving unknown learning text alone',()=>{
 expect(translateMessage('ar',"You've used today's free Memory session.")).toBe('لقد استخدمت جلسة الذاكرة المجانية لهذا اليوم.')
 expect(translateMessage('ar','12 episodes')).toContain('الحلقات')
 expect(translateMessage('en','12 episodes')).toBe('12 episodes')
 expect(translateMessage('ar','An intentional English learning sentence.')).toBe('An intentional English learning sentence.')
})
it('formats membership dates in Arabic while preserving the English default and invalid-date fallback',()=>{
 expect(formatMembershipDate('2026-01-01T00:00:00Z')).toBe('1 January 2026')
 expect(formatMembershipDate('2026-01-01T00:00:00Z','ar')).toMatch(/[\u0621-\u064a]/u)
 expect(formatMembershipDate('invalid','ar')).toBe('')
})
