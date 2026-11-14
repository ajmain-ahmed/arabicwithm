import { grammarTerminology } from '@/app/lib/grammarTerminology'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { normalizePhrase } from './canonical'
import { CEFR_LEVELS, type CanonicalUnit, type GrammarCandidate } from './types'

export const grammarRules = [
  {
    key: 'adjective-agreement',
    ar: 'مُطَابَقَةُ النَّعْتِ',
    en: 'Adjective agreement',
    level: 'A1',
    category: 'nahw',
    aliases: ['adjective agreement'],
    explanation:
      'An adjective (naʿt / نَعْتٌ) follows the noun it describes in case, definiteness, gender and number. Compare the endings of the two words to see the agreement.',
  },
  {
    key: 'relative-clause',
    ar: 'جُمْلَةُ صِلَةِ الْمَوْصُولِ',
    en: 'Relative clauses',
    level: 'A2',
    category: 'nahw',
    aliases: ['relative clause'],
    explanation:
      'A relative word such as الَّذِي introduces a clause that identifies the person or thing. Look for the pronoun that connects this clause back to its noun.',
  },
  {
    key: 'lam-jussive',
    ar: 'جَزْمُ الْمُضَارِعِ بِلَمْ',
    en: 'The imperfect after لَمْ',
    level: 'B1',
    category: 'nahw',
    aliases: ['jussive after lam', 'jussive after لَمْ', 'lam causes jazm'],
    explanation:
      'لَمْ negates a past event and makes the imperfect verb jussive (majzūm / مَجْزُومٌ). Check the verb’s ending to see how that jussive form is marked.',
  },
  {
    key: 'weak-final-jussive',
    ar: 'جَزْمُ الْفِعْلِ الْمُضَارِعِ الْمُعْتَلِّ الْآخِرِ',
    en: 'Jussive weak-final imperfect verbs',
    level: 'B2',
    category: 'sarf',
    aliases: ['jussive weak-final', 'حذف حرف العلة في الجزم'],
    explanation:
      'After a jussive trigger such as لَمْ, a weak-final verb loses its final weak letter. This is deletion of the weak radical (حَذْفُ حَرْفِ الْعِلَّةِ). Compare the ordinary imperfect with the form in the example to find the missing letter.',
  },
  {
    key: 'hal-clause',
    ar: 'الْجُمْلَةُ الْحَالِيَّةُ',
    en: 'Circumstantial clauses',
    level: 'B2',
    category: 'nahw',
    aliases: ['hal clause', 'circumstantial clause'],
    explanation:
      'A circumstantial clause (جُمْلَةٌ حَالِيَّةٌ) tells you the state in which someone takes part in an action. Find the person it describes and the link that connects the clause to them.',
  },
  {
    key: 'conditional-response',
    ar: 'جَوَابُ الشَّرْطِ',
    en: 'The result of a condition',
    level: 'B2',
    category: 'nahw',
    aliases: ['conditional response', 'complex conditional'],
    explanation:
      'A conditional sentence has a condition and a result (جَوَابُ الشَّرْطِ). Identify both parts, then look at the particle and verb forms that connect them.',
  },
  {
    key: 'request-response',
    ar: 'جَوَابُ الطَّلَبِ',
    en: 'A result following a request',
    level: 'C1',
    category: 'nahw',
    aliases: ['response to a request'],
    explanation:
      'An imperfect verb can describe the result of a command or request. This result is called جَوَابُ الطَّلَبِ. Read the two actions as “do this, and that will follow”, then check whether the result verb is jussive.',
  },
  {
    key: 'fronted-predicate',
    ar: 'خَبَرٌ مُقَدَّمٌ وَمُبْتَدَأٌ مُؤَخَّرٌ',
    en: 'A fronted predicate and delayed topic',
    level: 'B2',
    category: 'nahw',
    aliases: ['fronted predicate', 'delayed topic'],
    explanation:
      'The predicate (خَبَرٌ) can come before the topic (مُبْتَدَأٌ). First find what the sentence says, then identify the noun it says this about. Word order alone does not make the first phrase the topic.',
  },
  {
    key: 'adjective-government',
    ar: 'إِعْمَالُ الصِّفَةِ الْمُشَبَّهَةِ',
    en: 'A governing adjective',
    level: 'C1',
    category: 'nahw',
    aliases: ['government of the adjective', 'governing adjective', 'صفة مشبهة عاملة'],
    explanation:
      'A stable-quality adjective (الصِّفَةُ الْمُشَبَّهَةُ) can govern another noun. Find the noun whose quality is being described. The adjective may agree with that governed noun, which explains an ending or gender that initially looks surprising.',
  },
  {
    key: 'active-participle-government',
    ar: 'إِعْمَالُ اسْمِ الْفَاعِلِ',
    en: 'An active participle working like a verb',
    level: 'C1',
    category: 'nahw',
    aliases: ['active participial government', 'governing active participle'],
    explanation:
      'An active participle (اسْمُ الْفَاعِلِ) can work like its verb and govern a subject or object. Identify the action expressed by the participle, then find which noun completes that action.',
  },
  {
    key: 'passive-participle-government',
    ar: 'إِعْمَالُ اسْمِ الْمَفْعُولِ',
    en: 'A passive participle working like a verb',
    level: 'C1',
    category: 'nahw',
    aliases: ['passive participial government'],
    explanation:
      'A passive participle (اسْمُ الْمَفْعُولِ) can govern a noun as a passive verb does. Find what receives the action and check how that noun is raised as the substitute subject (نَائِبُ الْفَاعِلِ).',
  },
  {
    key: 'masdar-government',
    ar: 'إِعْمَالُ الْمَصْدَرِ',
    en: 'A verbal noun governing its complements',
    level: 'C1',
    category: 'nahw',
    aliases: ['verbal noun government', 'masdar working verbally'],
    explanation:
      'A verbal noun (مَصْدَرٌ) names an action and can keep the verb’s relationships with a doer or object. Read the action first, then identify the nouns that complete its meaning.',
  },
  {
    key: 'ishtighal',
    ar: 'الِاشْتِغَالُ',
    en: 'A fronted noun resumed by a pronoun',
    level: 'C2',
    category: 'nahw',
    aliases: ['ishtighal'],
    explanation:
      'In الِاشْتِغَالُ, a noun is placed first and a later verb is already occupied by a pronoun referring back to it. Trace that pronoun. The fronted noun’s case is explained through the understood verbal relationship, which the detailed analysis must identify.',
  },
  {
    key: 'tanazu',
    ar: 'التَّنَازُعُ',
    en: 'Two governors sharing a dependent',
    level: 'C2',
    category: 'nahw',
    aliases: ['tanazu'],
    explanation:
      'In التَّنَازُعُ, two preceding governors can each relate to a following noun. Identify both governors and explain which one actually governs that noun in this sentence. A repeated pair of verbs alone is insufficient evidence.',
  },
  {
    key: 'conditional-ellipsis',
    ar: 'حَذْفُ جَوَابِ الشَّرْطِ',
    en: 'An understood conditional result',
    level: 'C1',
    category: 'nahw',
    aliases: ['omitted conditional result'],
    explanation:
      'A conditional result may be left unstated when the context makes it recoverable. Identify the condition, explain the evidence for the missing result and keep any reconstruction separate from the exact source sentence.',
  },
  {
    key: 'ilal',
    ar: 'الْإِعْلَالُ',
    en: 'Weak-letter changes',
    level: 'B2',
    category: 'sarf',
    aliases: ['weak-letter changes', 'ilal'],
    explanation:
      'Weak letters can change, lose a vowel or disappear when a word is formed. This is الْإِعْلَالُ. Compare related forms to recover the root, then describe the particular change shown here.',
  },
  {
    key: 'ibdal',
    ar: 'الْإِبْدَالُ',
    en: 'Letter substitution',
    level: 'C1',
    category: 'sarf',
    aliases: ['letter substitution', 'ibdal', 'form viii assimilation'],
    explanation:
      'In الْإِبْدَالُ, one letter is replaced by another. Compare the root and pattern with the actual form and identify the two letters involved. In Form VIII, a neighbouring consonant can change the pattern’s ت.',
  },
  {
    key: 'idgham',
    ar: 'الْإِدْغَامُ',
    en: 'Consonants merging',
    level: 'B2',
    category: 'sarf',
    aliases: ['consonant assimilation', 'idgham'],
    explanation:
      'In الْإِدْغَامُ, adjacent consonants merge in pronunciation, often marked by a shadda. Compare the underlying letters with the written form to see what merged.',
  },
  {
    key: 'tawid',
    ar: 'التَّعْوِيضُ',
    en: 'Compensation for a lost element',
    level: 'C1',
    category: 'sarf',
    aliases: ['compensation', 'tawid'],
    explanation:
      'In التَّعْوِيضُ, an element compensates for something lost elsewhere in the word. Identify the lost element and the compensating element. They need not occupy the same position.',
  },
  {
    key: 'uslub-hakim',
    ar: 'أُسْلُوبُ الْحَكِيمِ',
    en: 'A reply that redirects the question',
    level: 'C2',
    category: 'balaghah',
    aliases: ['uslub al hakim'],
    explanation:
      'In أُسْلُوبُ الْحَكِيمِ, a reply redirects attention to a more appropriate concern. This interpretation needs the question and reply together. Explain how the reply changes the focus before assigning this label.',
  },
] as const

export function canonicalRuleKey(titleAr: string, titleEn: string, proposed = ''): string {
  const normalizedAr = normalizePhrase(titleAr)
  const normalizedEn = titleEn.toLowerCase()
  const known = grammarRules.find(
    (rule) =>
      rule.key === proposed ||
      normalizePhrase(rule.ar) === normalizedAr ||
      rule.en.toLowerCase() === normalizedEn ||
      rule.aliases.some(
        (alias) => normalizePhrase(alias) === normalizedAr || alias === normalizedEn,
      ),
  )
  return (
    known?.key ??
    `rule-${createHash('sha256')
      .update(normalizedAr || normalizedEn)
      .digest('hex')
      .slice(0, 32)}`
  )
}

export function authoredGrammar(units: CanonicalUnit[]): GrammarCandidate[] {
  const candidates: GrammarCandidate[] = []
  for (const unit of units) {
    function namedRules(hints: string[]) {
      return grammarRules.filter((rule) => {
        const terms = [rule.ar, rule.en, ...rule.aliases].map((term) =>
          normalizePhrase(term).toLowerCase(),
        )
        return hints.some((hint) => {
          const normalized = ` ${normalizePhrase(hint).toLowerCase()} `
          return terms.some(
            (term) => normalized.includes(` ${term} `) || normalized.includes(` و${term} `),
          )
        })
      })
    }
    const sectionRules = namedRules(unit.ruleHints)
    const scopedRules = sectionRules
    for (const rule of grammarRules) {
      const explicit =
        unit.authoredLessonExample === true &&
        scopedRules.length === 1 &&
        scopedRules[0].key === rule.key
      const lam = rule.key === 'lam-jussive' && /^لَمْ\s/u.test(unit.arabic)
      if (!explicit && !lam) continue
      candidates.push({
        ruleKey: rule.key,
        titleAr: rule.ar,
        titleEn: rule.en,
        cefr: rule.level,
        category: rule.category,
        explanation: grammarTerminology(rule.explanation),
        detail: explicit
          ? 'The source lesson explicitly names this construction. Review its application to this example.'
          : '',
        confidence: explicit ? 0.8 : 0.95,
        highlight: lam
          ? unit.arabic.match(/^لَمْ\s+\S+/u)![0]
          : unit.authoredHighlight || unit.arabic,
        unit,
      })
    }
  }
  return candidates
}

export const grammarOutput = z.object({
  notes: z
    .array(
      z.object({
        unitKey: z.string(),
        ruleKey: z.string().max(100),
        titleEn: z.string().min(3).max(240),
        titleAr: z.string().min(2).max(240),
        cefr: z.enum(CEFR_LEVELS),
        category: z.enum(['nahw', 'sarf', 'balaghah']),
        explanation: z.string().min(40).max(2400),
        detail: z.string().max(4000),
        mechanics: z.string().max(4000).default(''),
        recognitionTip: z.string().max(2400).default(''),
        transformations: z.array(z.string().max(1000)).max(30).default([]),
        exampleExplanation: z.string().max(4000).default(''),
        confidence: z.number().min(0).max(1),
        highlight: z.string().min(1).max(3000),
      }),
    )
    .max(48),
})

export function validateGrammarOutput(value: unknown, units: CanonicalUnit[]): GrammarCandidate[] {
  const parsed = grammarOutput.parse(value)
  const byKey = new Map(units.map((unit) => [unit.key, unit]))
  return parsed.notes.flatMap((note) => {
    const unit = byKey.get(note.unitKey)
    if (
      !unit ||
      !unit.arabic.includes(note.highlight) ||
      note.confidence < 0.65 ||
      !/[\u0621-\u064a]/u.test(note.titleAr)
    )
      return []
    return [{ ...note, titleEn: grammarTerminology(note.titleEn), explanation: grammarTerminology(note.explanation), mechanics: grammarTerminology(note.mechanics), recognitionTip: grammarTerminology(note.recognitionTip), detail: grammarTerminology(note.detail), exampleExplanation: grammarTerminology(note.exampleExplanation), ruleKey: canonicalRuleKey(note.titleAr, note.titleEn, note.ruleKey), unit }]
  })
}
