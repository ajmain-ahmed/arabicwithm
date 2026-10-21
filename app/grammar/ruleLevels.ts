/** Website teaching progression, not an official CEFR accreditation. Word
 * classes precede case/governance; clause-level predicates come last. */
export const ruleLevels = {
  noun:'A1', past:'A1', present:'A1', preposition:'A1', pronoun:'A1', demonstrative:'A1', topic:'A1', predicate:'A1',
  subject:'A2', object:'A2', adjective:'A2', conjunction:'A2', imperative:'A2', nominative:'A2', accusative:'A2', genitive:'A2', role_adjective:'A2', described_noun:'A2',
  idafa_first:'B1', idafa_second:'B1', kana_noun:'B1', kana_predicate:'B1', inna_noun:'B1', inna_predicate:'B1', masdar:'B1', participle:'B1',
  jussive:'B2', jussive_particle:'B2', subjunctive_particle:'B2', interrogative_particle:'B2', single_predicate:'B2',
  quasi_sentence:'C1', quasi_predicate:'C1', delayed_topic:'C1', fronted_predicate:'C1',
  verbal_predicate:'C2', nominal_predicate:'C2',
} satisfies Record<string, 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'>
