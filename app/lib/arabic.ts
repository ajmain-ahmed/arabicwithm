// app/lib/arabic.ts

const DIACRITICS_AND_TATWEEL = /[\u0640\u064B-\u065F\u0670\u0656\u0657]/g

// Definite-article combinations — safe to strip unconditionally
const DEFINITE_ARTICLE_PREFIXES = [
  'وال',
  'فال',
  'بال',
  'لل',
  'كال',
  'ال',
]

// Single-letter proclitics — only strip when remaining word is long enough
// to avoid false positives (e.g. س in سريع, أ in أنا)
const SINGLE_PROCLITICS = ['و', 'ف', 'ب', 'ل', 'ك', 'س', 'أ']

const ENCLITIC_SUFFIXES = [
  'هما',
  'كما',
  'ها',
  'هم',
  'هن',
  'كم',
  'كن',
  'نا',
  'يه',
  'ية',
  'تي',
  'ه',
  'ك',
  'ي',
  'ت',
  'ا',
  'ى',
  'ن',
]

function stripPrefix(word: string, prefix: string): string | null {
  if (word.startsWith(prefix) && word.length > prefix.length + 1) {
    return word.slice(prefix.length)
  }
  return null
}

function stripSuffix(word: string, suffix: string): string | null {
  // Be more conservative with single-letter suffixes that are often part of the root
  if (suffix === 'ا' || suffix === 'ى') {
    if (word.endsWith(suffix) && word.length >= 5) {
      return word.slice(0, -suffix.length)
    }
    return null
  }
  if (word.endsWith(suffix) && word.length > suffix.length + 1) {
    return word.slice(0, -suffix.length)
  }
  return null
}

/**
 * Normalize an Arabic token by:
 * 1. Removing diacritics and tatweel
 * 2. Stripping definite article prefixes (ال, وال, فال, بال, لل, كال)
 * 3. Stripping single-letter proclitics ONLY when the remaining word
 *    is at least 4 characters long (avoids false positives like سريع → ريع)
 * 4. Stripping common enclitic pronoun suffixes
 * 5. Handling sun letters via ال removal
 */
export function normalizeArabicToken(token: string): string {
  let t = token.normalize('NFC').replace(DIACRITICS_AND_TATWEEL, '')

  // Strip definite-article combinations
  let changed = true
  while (changed) {
    changed = false
    for (const prefix of DEFINITE_ARTICLE_PREFIXES) {
      const stripped = stripPrefix(t, prefix)
      if (stripped !== null) {
        t = stripped
        changed = true
        break
      }
    }
  }

  // Strip single-letter proclitics only if:
  // 1. The remaining stem is at least 4 characters, AND
  // 2. The original word itself is longer than 4 characters
  // This prevents stripping root letters from short words like سريع → ريع or فجأة → جأة
  for (const prefix of SINGLE_PROCLITICS) {
    const stripped = stripPrefix(t, prefix)
    if (stripped !== null && stripped.length >= 4 && t.length > 4) {
      t = stripped
      break
    }
  }

  // Strip enclitics
  for (const suffix of ENCLITIC_SUFFIXES) {
    const stripped = stripSuffix(t, suffix)
    if (stripped !== null) {
      t = stripped
      break
    }
  }

  return t
}

/**
 * Strip only diacritics and tatweel from an Arabic token.
 * Keeps all prefixes and suffixes intact for exact matching.
 */
export function stripDiacritics(token: string): string {
  return token.replace(DIACRITICS_AND_TATWEEL, '')
}


