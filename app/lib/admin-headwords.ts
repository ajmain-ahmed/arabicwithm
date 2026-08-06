// app/lib/admin-headwords.ts — shared helpers for episode/chapter headword tables

export interface TokenLocation {
  blockIndex: number
  tokenIndex: number
}

export interface TokenInfo extends TokenLocation {
  entryType: "word" | "phrase"
  arabic: string
  plain: string
  headword: string
  transliteration: string
  english?: string
  pos?: string
  cefr?: string
}

export interface TokenRow {
  token: TokenInfo
  entry: {
    id: number
    word: string
    definition: string
    isPhrase?: boolean
  } | null
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

export function extractHeadwordTokens(
  content: unknown,
  options?: { includePhrases?: boolean }
): TokenInfo[] {
  const tokens: TokenInfo[] = []
  const includePhrases = options?.includePhrases ?? false

  if (!Array.isArray(content)) return tokens

  for (let blockIndex = 0; blockIndex < content.length; blockIndex++) {
    const block = content[blockIndex]
    if (!isPlainObject(block)) continue

    const blockTokens = block.tokens
    if (Array.isArray(blockTokens)) {
      for (let tokenIndex = 0; tokenIndex < blockTokens.length; tokenIndex++) {
        const token = blockTokens[tokenIndex]
        if (!isPlainObject(token)) continue
        const entryType = String(token.entry_type ?? "").toLowerCase()
        if (entryType !== "word" && !(includePhrases && entryType === "phrase")) continue

        tokens.push({
          blockIndex,
          tokenIndex,
          entryType: entryType === "phrase" ? "phrase" : "word",
          arabic: String(token.arabic ?? ""),
          plain: String(token.plain ?? token.arabic ?? ""),
          headword: String(token.headword ?? "").trim(),
          transliteration: String(token.transliteration ?? ""),
          english: token.english ? String(token.english) : undefined,
          pos: token.pos ? String(token.pos) : undefined,
          cefr: token.cefr ? String(token.cefr) : undefined,
        })
      }
      continue
    }

    const words = block.words
    if (Array.isArray(words)) {
      for (let tokenIndex = 0; tokenIndex < words.length; tokenIndex++) {
        const word = words[tokenIndex]
        if (!isPlainObject(word)) continue
        const entryType = String(word.entry_type ?? "word").toLowerCase()
        if (entryType !== "word" && !(includePhrases && entryType === "phrase")) continue

        tokens.push({
          blockIndex,
          tokenIndex,
          entryType: entryType === "phrase" ? "phrase" : "word",
          arabic: String(word.arabic ?? ""),
          plain: String(word.plain ?? word.arabic ?? ""),
          headword: String(word.headword ?? "").trim(),
          transliteration: String(word.transliteration ?? ""),
          english: word.english ? String(word.english) : undefined,
          pos: word.pos ? String(word.pos) : undefined,
          cefr: word.cefr ? String(word.cefr) : undefined,
        })
      }
    }
  }

  return tokens
}

export type EditableTokenField = "arabic" | "headword" | "pos" | "cefr" | "english" | "transliteration"
