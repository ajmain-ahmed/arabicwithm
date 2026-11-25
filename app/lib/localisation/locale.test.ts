import {expect,it} from 'vitest'
import {localisedText,localeDirection,websiteLocale,formatLocaleDate} from './locale'
import {translateMessage} from './messages'
it('uses English unless Arabic is explicitly selected',()=>{for(const value of [undefined,null,'AR','en','fr'])expect(websiteLocale(value)).toBe('en');expect(websiteLocale('ar')).toBe('ar')})
it('keeps original English metadata and prioritises authored Arabic without stripping diacritics',()=>{
 expect(localisedText('en','Proverbs','كِتَابُ الْأَمْثَالِ','other')).toBe('Proverbs')
 expect(localisedText('ar','Proverbs','كِتَابُ الْأَمْثَالِ','other')).toBe('كِتَابُ الْأَمْثَالِ')
 expect(localisedText('ar','Original','','')).toBe('Original')
 expect(localisedText('ar','Original',null,'ترجمة')).toBe('ترجمة')
})
it('centralises direction, labels and date formatting',()=>{expect(localeDirection('ar')).toBe('rtl');expect(localeDirection('en')).toBe('ltr');expect(translateMessage('ar','Home')).toBe('الرئيسية');expect(translateMessage('en','Home')).toBe('Home');expect(formatLocaleDate('2026-11-25','en')).toContain('2026')})
