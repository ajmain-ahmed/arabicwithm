/** Optional book-only labels; no grammatical information is inferred. */
export type GrammarLabel = { arabic: string; english: string }

export type BookTokenGrammar = {
  syntactic_role?: GrammarLabel | null
  grammatical_case?: GrammarLabel | null
}

export function isGrammarLabel(value: unknown): value is GrammarLabel {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const label = value as Record<string, unknown>
  return typeof label.arabic === 'string' && typeof label.english === 'string'
}

/** Validate only the additive fields, leaving legacy content and all keys intact. */
export function validateBookTokenGrammar(content: unknown): void {
  if (!Array.isArray(content)) return
  content.forEach((block, blockIndex) => {
    if (!block || typeof block !== 'object' || !Array.isArray(block.tokens)) return
    block.tokens.forEach((token: unknown, tokenIndex: number) => {
      if (!token || typeof token !== 'object' || Array.isArray(token)) return
      const record = token as Record<string, unknown>
      for (const field of ['syntactic_role', 'grammatical_case'] as const) {
        const value = record[field]
        if (value !== undefined && value !== null && !isGrammarLabel(value)) {
          throw new Error(`Sentence ${blockIndex + 1}, token ${tokenIndex + 1}: ${field} must be null or an object with string arabic and english values.`)
        }
      }
    })
  })
}
