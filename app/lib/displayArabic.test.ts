import { expect, it } from 'vitest'
import { displayArabic } from './displayArabic'

it('hides vowel marks without changing letters, hamza, punctuation, digits or the source', () => {
  const text = 'ذَهَبَ الطَّالِبُ إِلَى الْمَدْرَسَةِ، ١٢! أ آ ئ ؤ ا\u0654 ا\u0653 ـ'
  expect(displayArabic(text, false)).toBe('ذهب الطالب إلى المدرسة، ١٢! أ آ ئ ؤ ا\u0654 ا\u0653 ـ')
  expect(displayArabic(text, true)).toBe(text)
})
