import lexicon from './phraseLexicon.json'
import { normalizePhrase } from './canonical'
import { cefr, string, type CanonicalUnit, type PhraseCandidate } from './types'

/** Automatic additions require authored phrase-level glosses or a known expression. */
export function extractPhrases(units: CanonicalUnit[]): PhraseCandidate[] {
  const result: PhraseCandidate[] = []
  for (const unit of units) {
    const seen = new Set<string>()
    function offer(
      arabic: string,
      transliteration: string,
      english: string,
      evidence: string,
      existingId?: string,
      level?: unknown,
    ) {
      arabic = arabic.trim().replace(/^[.,!?؟،؛\s]+|[.,!?؟،؛\s]+$/gu, '')
      const key = normalizePhrase(arabic)
      if (
        seen.has(key) ||
        !/[\u0621-\u064a]/u.test(key) ||
        key.split(' ').length < 2 ||
        /[.!?؟\n]|https?:|\{\{/u.test(arabic)
      )
        return
      if ((!transliteration || !english) && !existingId) return
      seen.add(key)
      result.push({
        arabic,
        transliteration,
        english,
        existingId,
        cefr: cefr(level) ?? unit.exampleCefr ?? null,
        confidence: 0.99,
        evidence,
        unit,
      })
    }
    for (const token of unit.tokens) {
      if (token.entry_type !== 'phrase' && token.pos !== 'phrase') continue
      const headword =
        typeof token.headword === 'number' && Number.isSafeInteger(token.headword)
          ? String(token.headword)
          : string(token.headword)
      const id = /^\d+$/.test(headword) ? headword : undefined
      offer(
        string(token.arabic),
        string(token.transliteration),
        string(token.english),
        'Authored phrase token',
        id,
        token.cefr,
      )
    }
    for (const sentence of unit.arabic.split(/[.!?؟؛\n]/u)) {
      const normalized = ` ${normalizePhrase(sentence)} `
      if (/(?:^|\s)ما إن\s+.+?\s+حتى(?:\s|$)/u.test(normalized))
        offer(
          'مَا إِنْ … حَتَّى …',
          'mā ʾin … ḥattā …',
          'no sooner … than …',
          'Known discontinuous expression',
        )
      for (const phrase of lexicon) {
        if (normalized.includes(` ${normalizePhrase(phrase.arabic)} `))
          offer(phrase.arabic, phrase.transliteration, phrase.english, 'Known fixed expression')
      }
    }
  }
  return result
}
