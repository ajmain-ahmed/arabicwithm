/** One Arabic companion form for learner-facing English grammatical terms. */
const terms: Record<string, string> = {
  'stable-quality adjective': 'الصِّفَةُ الْمُشَبَّهَةُ',
  'governing adjective': 'صِفَةٌ مُشَبَّهَةٌ عَامِلَةٌ',
  'conditional sentence': 'جُمْلَةٌ شَرْطِيَّةٌ',
  'conditional response': 'جَوَابُ الشَّرْطِ',
  'rhetorical question': 'اسْتِفْهَامٌ بَلَاغِيٌّ',
  'verbal noun': 'مَصْدَرٌ',
  'weak radical': 'حَرْفُ عِلَّةٍ',
  'relative pronoun': 'اسْمٌ مَوْصُولٌ',
  'circumstantial accusative': 'حَالٌ',
  'direct object': 'مَفْعُولٌ بِهِ',
  'active participle': 'اسْمُ الْفَاعِلِ',
  'passive participle': 'اسْمُ الْمَفْعُولِ',
  'relative clause': 'جُمْلَةُ صِلَةِ الْمَوْصُولِ',
  'circumstantial clause': 'جُمْلَةٌ حَالِيَّةٌ',
  'weak-final verb': 'فِعْلٌ مُعْتَلُّ الْآخِرِ',
  'imperfect verb': 'فِعْلٌ مُضَارِعٌ',
  jussive: 'مَجْزُومٌ',
  nominative: 'مَرْفُوعٌ',
  accusative: 'مَنْصُوبٌ',
  genitive: 'مَجْرُورٌ',
  subjunctive: 'مَنْصُوبٌ',
  indicative: 'مَرْفُوعٌ',
  predicate: 'خَبَرٌ',
  subject: 'فَاعِلٌ',
  apposition: 'بَدَلٌ',
  topic: 'مُبْتَدَأٌ',
  adjective: 'نَعْتٌ',
  noun: 'اسْمٌ',
  verb: 'فِعْلٌ',
  pronoun: 'ضَمِيرٌ',
  preposition: 'حَرْفُ جَرٍّ',
  particle: 'حَرْفٌ',
  object: 'مَفْعُولٌ بِهِ',
  imperfect: 'مُضَارِعٌ',
  clause: 'جُمْلَةٌ',
  ellipsis: 'حَذْفٌ',
  fronting: 'تَقْدِيمٌ',
  assimilation: 'إِدْغَامٌ',
  substitution: 'إِبْدَالٌ',
  compensation: 'تَعْوِيضٌ',
  government: 'عَمَلٌ',
  case: 'إِعْرَابٌ',
  mood: 'إِعْرَابُ الْفِعْلِ',
  dual: 'مُثَنًّى',
  plural: 'جَمْعٌ',
  singular: 'مُفْرَدٌ',
  definiteness: 'تَعْرِيفٌ',
}
const pattern = new RegExp(
  `\\b(${Object.keys(terms)
    .sort((a, b) => b.length - a.length)
    .join('|')})(s)?\\b(?:\\s*(\\([^)]*\\)))?`,
  'gi',
)
export function grammarTerminology(value: string): string {
  return value.replace(pattern, (_whole, term: string, plural: string, companion?: string) => {
    const label = `${term}${plural ?? ''} (${terms[term.toLowerCase()]})`
    const oldLabel =
      companion &&
      (/[\u0621-\u064a]/u.test(companion) ||
        /majz|marf|man[sṣ]|majr|khab|fā|maf|naʿt|ism|fiʿl|ḥāl|badal/i.test(companion))
    return label + (companion && !oldLabel ? ` ${companion}` : '')
  })
}
