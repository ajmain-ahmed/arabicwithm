export interface PhraseWordGloss {
  arabic: string
  english: string
}
export interface DailyPhrase {
  id: string
  arabic: string
  english: string
  words: PhraseWordGloss[]
}

const normalized = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()

/** Show word glosses only when every stored token aligns with the phrase. */
export function phraseWordGlosses(arabic: string, value: unknown): PhraseWordGloss[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return []
  const words: PhraseWordGloss[] = []
  for (const item of value) {
    if (
      !item ||
      typeof item.arabic !== 'string' ||
      typeof item.english !== 'string' ||
      !item.arabic.trim() ||
      !item.english.trim() ||
      item.english.length > 160 ||
      /\s/u.test(item.arabic.trim())
    )
      return []
    words.push({ arabic: item.arabic.trim(), english: item.english.trim() })
  }
  return normalized(words.map((word) => word.arabic).join(' ')) === normalized(arabic) ? words : []
}

/** Reuse individual authored token glosses without splitting a phrase-level gloss. */
export function sourcePhraseGlosses(
  arabic: string,
  tokens: Record<string, unknown>[],
): PhraseWordGloss[] {
  const length = arabic.trim().split(/\s+/u).length
  for (let start = 0; start + length <= tokens.length; start++) {
    const result = phraseWordGlosses(arabic, tokens.slice(start, start + length))
    if (result.length) return result
  }
  return []
}
