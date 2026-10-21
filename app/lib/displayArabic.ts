// Presentation only: retain letters (including decomposed hamza/madda), tatweel,
// punctuation and numerals. Do not use matching normalisation for display.
const VOWEL_MARKS = /[\u0610-\u061a\u064b-\u0652\u0656-\u065e\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7-\u06e8\u06ea-\u06ed\u0898-\u089f\u08ca-\u08e1\u08e3-\u08ff]/g

export function displayArabic(text: string, showTashkeel: boolean): string {
  return showTashkeel ? text : text.replace(VOWEL_MARKS, '')
}
