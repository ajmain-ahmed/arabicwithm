import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import PhraseOfTheDay from './PhraseOfTheDay'

it.each([
  ['عَلَى الْفَوْرِ', 'Immediately'],
  ['كَيْفَ تَجْرُؤُ', 'How dare you'],
  ['إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ', 'We belong to God and to Him we return'],
])(
  'preserves Arabic and full meaning without empty gloss placeholders for %s',
  (arabic, english) => {
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(
      <PhraseOfTheDay phrase={{ id: '1', arabic, english, words: [] }} />,
    )
    expect(host.querySelector('[lang=ar]')?.getAttribute('dir')).toBe('rtl')
    expect(host.textContent).toContain(arabic)
    expect(host.textContent).toContain(english)
  },
)
it('collapses for an empty library', () => {
  expect(renderToStaticMarkup(<PhraseOfTheDay phrase={null} />)).toBe('')
})
