import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import GrammarNoteRenderer from './GrammarNoteRenderer'
const note = {
  id: 'rule',
  title_en: 'Jussive verbs',
  title_ar: 'الجزم',
  rule_cefr: 'B1',
  status: 'approved',
  explanation: 'The verb becomes jussive (majzūm / مَجْزُومٌ).',
  mechanics: 'The predicate is nominative.',
  recognition_tip: 'Find the direct object.',
  detail: 'Check its governing verb.',
  transformations: ['يَدْعُو → لَمْ يَدْعُ'],
  examples: [
    {
      id: 'example',
      arabic: 'لَمْ يَدْعُ الْإِمَامُ.',
      english: 'The imam did not call.',
      highlight: 'يَدْعُ',
      explanation: '',
      source_title: 'Episode 3',
      example_cefr: 'C1',
    },
  ],
}
it('renders one canonical structured lesson with exact source Arabic and separate transformations', () => {
  const before = JSON.stringify(note)
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(<GrammarNoteRenderer note={note} />)
  expect(host.textContent).toContain('jussive (مَجْزُومٌ)')
  expect(host.textContent).toContain('predicate (خَبَرٌ)')
  expect(host.textContent).toContain('direct object (مَفْعُولٌ بِهِ)')
  expect(host.textContent).not.toContain('majzūm')
  expect(host.querySelector('mark')?.textContent).toBe('يَدْعُ')
  expect(host.querySelector('[lang="ar"]')?.textContent).toBe(note.title_ar)
  expect(host.textContent).toContain('لَمْ يَدْعُ الْإِمَامُ.')
  expect(host.textContent).toContain('يَدْعُو → لَمْ يَدْعُ')
  expect(JSON.stringify(note)).toBe(before)
})
it('hides candidates except in explicit Admin preview', () => {
  expect(
    renderToStaticMarkup(<GrammarNoteRenderer note={{ ...note, status: 'candidate' }} />),
  ).toBe('')
  expect(
    renderToStaticMarkup(<GrammarNoteRenderer note={{ ...note, status: 'candidate' }} preview />),
  ).toContain('The idea')
})
