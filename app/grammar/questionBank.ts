import type { Mode } from './models'
import { websiteQuestions, type WebsiteQuestion } from './websiteQuestions'
import { displayArabic } from '@/app/lib/displayArabic'

export interface BankRow {
  id: number; sentence_hash: string; chapter_id: string | null; paragraph_index: number | null; segment_id: number | null; cefr_rank: number | null;
  payload: { tokens: { arabic: string }[]; translation: string; facts: { token_index: number; mode: Mode; key: string; arabic: string; english: string }[] }
}
export interface BankQuestion extends WebsiteQuestion { sentenceHash?: string; targetIndex?: number; source?: Pick<BankRow, 'chapter_id' | 'paragraph_index' | 'segment_id'> }
export const bankLabels = {
  word_type: ['Noun', 'Verb', 'Adjective', 'Preposition', 'Conjunction', 'Pronoun', 'Adverb', 'Particle', 'Demonstrative'],
  sentence_role: ['Doer / subject of the verb', 'Direct object', 'Topic', 'Predicate', 'Delayed topic', 'Fronted predicate', 'Describing adjective', 'First noun of iḍāfa', 'Second noun of iḍāfa', 'Noun of kāna', 'Predicate of kāna', 'Noun of inna', 'Predicate of inna'],
  grammatical_case: ['Nominative', 'Accusative', 'Genitive', 'Jussive'],
} satisfies Record<Mode, string[]>
export function shuffle<T>(values: T[]): T[] { const next = [...values]; for (let i = next.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]] } return next }
export function bankQuestions(rows: BankRow[], mode: Mode): BankQuestion[] {
  const seen = new Set<string>()
  return rows.flatMap(row => {
    if (!row || typeof row.sentence_hash !== 'string' || seen.has(row.sentence_hash) || !Array.isArray(row.payload?.tokens) || !Array.isArray(row.payload?.facts) || typeof row.payload.translation !== 'string') return []
    const facts = row.payload.facts.filter(f => f.mode === mode && Number.isInteger(f.token_index) && row.payload.tokens[f.token_index]?.arabic && bankLabels[mode].includes(f.english))
    if (!facts.length) return []
    seen.add(row.sentence_hash)
    const fact = shuffle(facts)[0]
    return [{ id: `derived-${row.id}-${fact.token_index}-${mode}`, activity: mode, arabic: row.payload.tokens.map(t => t.arabic).join(' '), english: row.payload.translation, targetIndex: fact.token_index,
      prompt: `What is the ${mode === 'word_type' ? 'word type' : mode === 'sentence_role' ? 'sentence role' : 'grammatical case'} of the highlighted word?`,
      choices: shuffle([fact.english, ...shuffle(bankLabels[mode].filter(label => label !== fact.english)).slice(0, 3)]), answer: fact.english,
      explanation: `${row.payload.tokens[fact.token_index].arabic}: ${fact.arabic} — ${fact.english}.`, sentenceHash: row.sentence_hash,
      source: { chapter_id: row.chapter_id, paragraph_index: row.paragraph_index, segment_id: row.segment_id } }]
  })
}
export function curatedQuestions(mode: Mode): BankQuestion[] {
  if (mode === 'sentence_role') return websiteQuestions.filter(q => q.activity === 'roles')
  if (mode === 'grammatical_case') return websiteQuestions.filter(q => q.caseParts && q.caseParts[0] !== 'Built (indeclinable)').map(q => ({ ...q, id: `case-${q.id}`, activity: mode, prompt: q.prompt.replace('Analyse', 'What is the grammatical case of'), caseParts: undefined, choices: shuffle(bankLabels.grammatical_case), answer: q.caseParts![0] }))
  return [
    { arabic: 'كَتَبَ الطَّالِبُ الرِّسَالَةَ.', english: 'The student wrote the letter.', targetIndex: 0, answer: 'Verb' },
    { arabic: 'جَلَسَ الطَّالِبُ فِي الْبَيْتِ.', english: 'The student sat in the house.', targetIndex: 2, answer: 'Preposition' },
    { arabic: 'الطَّالِبُ مُجْتَهِدٌ.', english: 'The student is diligent.', targetIndex: 0, answer: 'Noun' },
  ].map((q, i) => ({ ...q, id: `word-foundation-${i}`, activity: mode, prompt: 'What is the word type of the highlighted word?', choices: shuffle(['Noun', 'Verb', 'Preposition', 'Pronoun']), explanation: `${q.arabic.split(' ')[q.targetIndex]} is a ${q.answer.toLowerCase()}.` }))
}
export function practiceBatch(rows:BankRow[],mode:Mode):BankQuestion[]{
  const derived=bankQuestions(rows,mode),seen=new Set<string>()
  return [...derived,...shuffle(curatedQuestions(mode))].filter(q=>{
    const key=displayArabic(q.arabic,false).replace(/[^\p{L}\p{N}]/gu,'')
    if(seen.has(key))return false
    seen.add(key);return true
  }).slice(0,Math.max(10,derived.length))
}
