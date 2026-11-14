import { expect, it } from 'vitest'
import { canonicalUnits, normalizePhrase } from './canonical'
import { extractPhrases } from './phrases'
import { authoredGrammar, canonicalRuleKey, validateGrammarOutput, grammarRules } from './grammar'
import type { EnrichmentSource } from './types'
const source: EnrichmentSource = {
  kind: 'chapter',
  id: 'chapter',
  title: 'Chapter',
  url: '/books/book/chapter',
  language: 'ar',
  content: [],
}
it('preserves authored token punctuation in canonical examples', () => {
  const units = canonicalUnits({
    ...source,
    content: [{ tokens: [{ prefix: '«', arabic: 'كِتَابٌ', suffix: '»' }], punctuation: '.' }],
  })
  expect(units[0].arabic).toBe('«كِتَابٌ».')
})
it('uses authored phrase metadata and phrase-level meanings, with stable provenance and untouched source JSON', () => {
  const content = [
    {
      timestamp: '00:12',
      translation: 'Go immediately.',
      tokens: [
        { arabic: 'اذْهَبْ', english: 'go' },
        {
          arabic: 'عَلَى الْفَوْرِ',
          english: 'straight away',
          transliteration: 'ʿalā l-fawr',
          entry_type: 'phrase',
          headword: '13',
          cefr: 'B1',
        },
      ],
    },
  ]
  const before = JSON.stringify(content),
    units = canonicalUnits({ ...source, content }),
    phrases = extractPhrases(units)
  expect(phrases).toHaveLength(1)
  expect(phrases[0]).toMatchObject({
    english: 'straight away',
    existingId: '13',
    confidence: 0.99,
    cefr: 'B1',
  })
  expect(phrases[0].unit.timestamp).toBe('00:12')
  expect(JSON.stringify(content)).toBe(before)
})
it('recognizes conventional and discontinuous expressions without extracting random n-grams or crossing sentences', () => {
  const units = canonicalUnits({
    ...source,
    content: [
      { arabic: 'فِي الْوَاقِعِ، جَاءَ زَيْدٌ مُبَكِّرًا.' },
      { arabic: 'مَا إِنْ وَصَلَ حَتَّى خَرَجَ.' },
      { arabic: 'عَلَى. الْفَوْرِ' },
      { arabic: 'الولد الطويل قرأ كتابا جديدا' },
    ],
  })
  expect(extractPhrases(units).map((p) => p.english)).toEqual(['in fact', 'no sooner … than …'])
})
it('uses full Arabic translations for English-source transcripts', () => {
  const units = canonicalUnits({
    ...source,
    kind: 'transcript',
    language: 'en',
    content: [
      {
        tokens: [{ english: 'Immediately', arabic: 'حَالًا', entry_type: 'phrase' }],
        translation: 'سَوْفَ أَعُودُ عَلَى الْفَوْرِ.',
      },
    ],
  })
  expect(units[0].arabic).toBe('سَوْفَ أَعُودُ عَلَى الْفَوْرِ.')
  expect(units[0].english).toBe('Immediately')
  expect(units[0].tokens).toEqual([])
  expect(extractPhrases(units)[0].english).toBe('immediately')
})
it('supports legacy cartoon blocks and serialized JSON without crawling administrative keys', () => {
  const content = {
    scriptBlocks: [{ arabicDiacritic: 'فِي الْوَاقِعِ', english: 'In fact', timestamp: 12 }],
    url: 'على الفور',
    id: 'على الفور',
    notes: ['على الفور'],
  }
  const units = canonicalUnits({ ...source, kind: 'episode', content: JSON.stringify(content) })
  expect(units).toHaveLength(1)
  expect(units[0]).toMatchObject({ arabic: 'فِي الْوَاقِعِ', timestamp: '12' })
})
it('reads structured examples, legitimate Arabic prose and stimuli while excluding answers, references and labels', () => {
  const content = {
    schema_version: '1.1.8',
    title_ar: 'على الفور',
    sections: [
      {
        title_ar: 'الِاشْتِغَالُ',
        blocks: [
          { type: 'paragraph', text_en: 'English prose with the Arabic term على الفور' },
          { type: 'example', arabic: 'زَيْدًا أَكْرَمْتُهُ.', english: 'Zayd, I honoured him.' },
          { type: 'collapsible', content: [{ type: 'paragraph', text_ar: 'فِي الْوَاقِعِ' }] },
          { type: 'diagram', nodes: [{ arabic: 'على الفور' }] },
        ],
      },
    ],
    activities: [
      { id: 'على الفور', prompt_en: 'على الفور', stimulus_ar: 'عَلَى الْفَوْرِ' },
      { stimulus_ar: '{{f1}}' },
    ],
    answers: [{ answer_ar: 'على الفور' }],
    references: [{ verification_note: 'على الفور' }],
  }
  const units = canonicalUnits({ ...source, content })
  expect(units).toHaveLength(3)
  expect(units[0].ruleHints).toContain('الِاشْتِغَالُ')
  expect(units.map((u) => u.key)).toEqual(['section/0/1', 'section/0/2/0', 'activity/0'])
})
it('admits curated multi-word vocabulary senses without treating alternatives or definitions as source sentences', () => {
  const content = {
    word_di: 'على الفور',
    word_tr: 'ʿalā l-fawr',
    definitions: [{ direct_english: 'immediately', simple_ar: 'هذا ليس مثالا' }],
    examples: [{ ar_di: 'عَادَ عَلَى الْفَوْرِ.', en: 'He returned immediately.' }],
  }
  const units = canonicalUnits({ ...source, kind: 'vocabulary', content })
  expect(units).toHaveLength(2)
  expect(units[1].grammarEligible).toBe(false)
  expect(
    canonicalUnits({
      ...source,
      kind: 'vocabulary',
      content: { ...content, word_di: 'كلمة / أخرى' },
    }),
  ).toHaveLength(1)
})
it('normalizes optional diacritics, tatweel, presentation forms and harmless punctuation without changing underlying letters', () => {
  expect(normalizePhrase('  عَلَـى الْفَوْرِ! ')).toBe(normalizePhrase('على الفور'))
  expect(normalizePhrase('ﻓﻲ الواقع')).toBe(normalizePhrase('في الواقع'))
  expect(normalizePhrase('و على الفور')).toBe(normalizePhrase('وعلى الفور'))
  expect(normalizePhrase('على الفور')).not.toBe(normalizePhrase('إلى الفور'))
})
it('keeps rule CEFR independent from example difficulty and includes genuine authored A1–C2 constructions', () => {
  const examples = [
    ['adjective-agreement', 'الْوَرْدَةُ جَمِيلَةٌ.'],
    ['relative-clause', 'رَأَيْتُ الرَّجُلَ الَّذِي سَاعَدَنِي.'],
    ['lam-jussive', 'لَمْ يَكْتُبْ.'],
    ['weak-final-jussive', 'لَمْ يَدْعُ الْإِمَامُ.'],
    ['adjective-government', 'الْوَرْدَةُ جَمِيلٌ لَوْنُهَا.'],
    ['ishtighal', 'زَيْدًا أَكْرَمْتُهُ.'],
  ]
  const units = canonicalUnits({
    ...source,
    level: 'C2',
    content: {
      schema_version: '1.1.0',
      sections: examples.map(([id, arabic]) => ({
        title_ar: grammarRules.find((r) => r.key === id)!.ar,
        blocks: [{ type: 'example', arabic }],
      })),
    },
  })
  const notes = authoredGrammar(units)
  expect(new Set(notes.map((n) => n.cefr))).toEqual(new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']))
  expect(notes.find((n) => n.cefr === 'A1')!.unit.exampleCefr).toBe('C2')
  expect(notes.find((n) => n.cefr === 'C1')!.explanation).toContain('الصِّفَةُ الْمُشَبَّهَةُ')
  expect(
    authoredGrammar(canonicalUnits({ ...source, content: [{ arabic: 'في البيت كتاب جديد.' }] })),
  ).toEqual([])
})
it('clusters known synonyms and rejects fabricated highlights or unknown source IDs from model output', () => {
  expect(canonicalRuleKey('جَزْمُ الْمُضَارِعِ بِلَمْ', 'Jussive after lam')).toBe('lam-jussive')
  const units = canonicalUnits({ ...source, content: [{ arabic: 'لَمْ يَكْتُبْ.' }] })
  const note = {
    unitKey: units[0].key,
    ruleKey: 'lam-jussive',
    titleAr: 'جَزْمُ الْمُضَارِعِ بِلَمْ',
    titleEn: 'Jussive after lam',
    cefr: 'B1',
    category: 'nahw',
    explanation: 'لَمْ makes the imperfect jussive (مَجْزُومٌ). Look at its final ending.',
    detail: '',
    confidence: 0.9,
    highlight: 'لَمْ يَكْتُبْ',
  }
  expect(validateGrammarOutput({ notes: [note] }, units)).toHaveLength(1)
  expect(
    validateGrammarOutput(
      {
        notes: [
          { ...note, highlight: 'invented' },
          { ...note, unitKey: 'unknown' },
          { ...note, confidence: 0.2 },
        ],
      },
      units,
    ),
  ).toEqual([])
})
it('keeps chapter-wide labels out of other lesson constructions and defers ambiguous combined rules to review', () => {
  const content = {
    schema_version: '1.1.0',
    title_ar: 'الْإِعْلَالُ وَالْإِبْدَالُ وَالتَّعْوِيضُ',
    sections: [
      {
        title_ar: 'الْإِبْدَالُ فِي صِيغَةِ اِفْتَعَلَ',
        blocks: [{ type: 'example', arabic: 'اِصْطَبَرَ الرَّجُلُ.' }],
      },
      {
        title_ar: 'الْإِبْدَالُ وَالْإِدْغَامُ',
        blocks: [{ type: 'example', arabic: 'اِدَّكَرَ الْقَارِئُ.' }],
      },
    ],
  }
  const notes = authoredGrammar(canonicalUnits({ ...source, content }))
  expect(notes.map((note) => note.ruleKey)).toEqual(['ibdal'])
})
it('accepts harmless authored phrase punctuation and rejects Latin-only labels', () => {
  const units = canonicalUnits({
    ...source,
    content: [
      {
        tokens: [
          {
            arabic: 'عَلَى الْفَوْرِ.',
            entry_type: 'phrase',
            english: 'immediately',
            transliteration: 'ʿalā l-fawr',
          },
        ],
      },
    ],
  })
  expect(extractPhrases(units)[0].arabic).toBe('عَلَى الْفَوْرِ')
  const vocabulary = canonicalUnits({
    ...source,
    kind: 'vocabulary',
    content: {
      word_di: 'Latin label',
      word_tr: 'label',
      definitions: [{ direct_english: 'a label' }],
      examples: [],
    },
  })
  expect(vocabulary).toEqual([])
})
it('requires explicit role evidence before applying a chapter-wide governing-adjective topic', () => {
  const content = {
    schema_version: '1.1.0',
    title_ar: 'إِعْمَالُ الصِّفَةِ الْمُشَبَّهَةِ',
    sections: [
      {
        blocks: [
          { type: 'example', arabic: 'لَوْنُ الْوَرْدَةِ جَمِيلٌ.' },
          {
            type: 'highlighted-sentence',
            translation_en: 'The flower has a beautiful colour.',
            segments: [
              { text_ar: 'الْوَرْدَةُ', role_ar: 'مُبْتَدَأٌ' },
              {
                text_ar: 'جَمِيلٌ',
                role_ar: 'خَبَرٌ، صِفَةٌ مُشَبَّهَةٌ عَامِلَةٌ',
                highlight_key: 'governor',
              },
              {
                text_ar: 'لَوْنُهَا.',
                role_ar: 'فَاعِلٌ مَرْفُوعٌ',
                highlight_key: 'raised-subject',
              },
            ],
            explanation_en: 'The adjective describes the colour, which is masculine.',
          },
        ],
      },
    ],
  }
  const notes = authoredGrammar(canonicalUnits({ ...source, content }))
  expect(notes).toHaveLength(1)
  expect(notes[0].highlight).toBe('جَمِيلٌ لَوْنُهَا.')
  expect(notes[0].unit.explanation).toContain('colour')
})
