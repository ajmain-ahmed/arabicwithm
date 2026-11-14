import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import WordTooltip from './WordTooltip'
import { readGrammaticalCase } from '@/app/lib/bookTokenGrammar'
import { forYouTokens } from '@/app/lib/forYou'

const entry = { arabic: '?????????', english: 'chapter', transliteration: 'al-fa?lu', cefr: 'A1', pos: 'noun' }

describe('authored grammatical case in shared word details', () => {
  it.each([
    ['?????????', 'Nominative'],
    ['?????????', 'Accusative'],
    ['?????????', 'Genitive'],
    ['?????????', 'Jussive'],
  ])('displays %s and %s alongside existing metadata', (arabic, english) => {
    const html = renderToStaticMarkup(<WordTooltip entry={{ ...entry, grammatical_case: { arabic, english } }} />)
    expect(html).toContain(arabic)
    expect(html).toContain(english)
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('dir="ltr"')
    for (const text of ['chapter', 'A1', 'Noun', 'al-fa?lu']) expect(html).toContain(text)
  })

  it.each([undefined, null, {}, { arabic: ' ', english: null }, 'invalid', { arabic: {} }])('omits unusable metadata %j', value => {
    expect(readGrammaticalCase(value)).toBeUndefined()
    expect(renderToStaticMarkup(<WordTooltip entry={{ ...entry, grammatical_case: readGrammaticalCase(value) }} />)).not.toContain('Grammatical case')
  })

  it.each([{ arabic: '?????????', english: null }, { english: 'Nominative' }])('handles partial metadata %j', grammatical_case => {
    const html = renderToStaticMarkup(<WordTooltip entry={{ ...entry, grammatical_case }} />)
    expect(html).toContain(grammatical_case.arabic || grammatical_case.english!)
    expect(html).not.toContain('[object Object]')
  })

  it('preserves case through standalone transcript token normalization', () => {
    const grammatical_case = { arabic: '?????????', english: 'Nominative' }
    expect(forYouTokens({ tokens: [{ ...entry, grammatical_case }] }, null)[0].grammatical_case).toEqual(grammatical_case)
  })
})
