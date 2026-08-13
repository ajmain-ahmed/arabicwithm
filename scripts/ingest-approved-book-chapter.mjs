import fs from 'node:fs/promises'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const SOURCE_DIVIDER = 'COMPLETE APPROVED BRITISH ENGLISH'
const ARABIC_HEADING = 'COMPLETE APPROVED VOCALISED ARABIC'
const DIACRITICS = /[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TERMINALS = new Set(['.', '!', '?', '؟'])
const LEADING_PUNCTUATION = new Set(['«', '“', '"', '('])
const TRAILING_PUNCTUATION = new Set(['.', '!', '؟', '،', '؛', ':', '»', '”', '"', ')'])
const CEFR_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

const COMMON = new Map(Object.entries({
  'في': ['preposition', 'A1', 'in'],
  'من': ['preposition', 'A1', 'from / of'],
  'إلى': ['preposition', 'A1', 'to'],
  'على': ['preposition', 'A1', 'on / upon'],
  'عن': ['preposition', 'A1', 'from / about'],
  'مع': ['preposition', 'A1', 'with'],
  'دون': ['preposition', 'A2', 'without / below'],
  'قبل': ['preposition', 'A1', 'before'],
  'بعد': ['preposition', 'A1', 'after'],
  'بين': ['preposition', 'A1', 'between'],
  'عند': ['preposition', 'A1', 'at / with'],
  'خلال': ['preposition', 'A2', 'during / through'],
  'نحو': ['preposition', 'A2', 'towards'],
  'بلا': ['preposition', 'A2', 'without'],
  'و': ['conjunction', 'A1', 'and'],
  'ف': ['conjunction', 'A1', 'so / then'],
  'ثم': ['conjunction', 'A1', 'then'],
  'لكن': ['conjunction', 'A1', 'but'],
  'أو': ['conjunction', 'A1', 'or'],
  'بينما': ['conjunction', 'A2', 'while'],
  'حين': ['conjunction', 'A2', 'when'],
  'إذا': ['conjunction', 'A1', 'if / when'],
  'أن': ['particle', 'A1', 'that / to'],
  'هل': ['particle', 'A1', 'question particle'],
  'لا': ['particle', 'A1', 'no / not'],
  'لم': ['particle', 'A1', 'did not'],
  'قد': ['particle', 'A2', 'already / may'],
  'أما': ['particle', 'A2', 'as for'],
  'ما': ['pronoun', 'A1', 'what / that which'],
  'أنا': ['pronoun', 'A1', 'I'],
  'أنت': ['pronoun', 'A1', 'you'],
  'هذا': ['pronoun', 'A1', 'this'],
  'ذلك': ['pronoun', 'A1', 'that'],
  'التي': ['pronoun', 'A2', 'who / which'],
  'الذي': ['pronoun', 'A2', 'who / which'],
  'أين': ['adverb', 'A1', 'where'],
  'متى': ['adverb', 'A1', 'when'],
  'الآن': ['adverb', 'A1', 'now'],
  'أمس': ['adverb', 'A1', 'yesterday'],
  'هناك': ['adverb', 'A1', 'there'],
  'نعم': ['particle', 'A1', 'yes'],
}))

const PROPER_NAMES = new Map(Object.entries({
  'مريم': 'Mariam',
  'سلمى': 'Salma',
  'يوسف': 'Yusuf',
  'حداد': 'Haddad',
  'عمان': 'Amman',
}))

// Contextual lemma choices for forms that cannot be resolved reliably by
// mechanical prefix/suffix stripping alone. A null value is intentional for
// proper names: it prevents a surname or place name from opening an unrelated
// Hans Wehr entry.
const HEADWORD_OVERRIDES = new Map(Object.entries({
  'مريم': null,
  'سلمى': null,
  'يوسف': null,
  'حداد': null,
  'عمان': null,
  'يطرق': 'طرق',
  'أمضت': 'مضى',
  'واضحا': 'وضح',
  'طفولتها': 'طفولة',
  'خللا': 'خلل',
  'بصريا': 'بصر',
  'تتخللها': 'خلل',
  'تجد': 'وجد',
  'يفسر': 'فسر',
  'تزوجتما': 'زوج',
  'تتذكر': 'ذكر',
  'زفافا': 'زفاف',
  'شهورا': 'شهر',
  'يمنحها': 'منح',
  'تهديدا': 'تهديد',
  'غريبا': 'غرب',
  'تعلنها': 'علن',
  'يبقيا': 'بقي',
  'مقعدا': 'مقعد',
  'يحدث': 'حدث',
  'وتتذكرين': 'ذكر',
  'سيعود': 'عود',
  'تغادري': 'غدر',
  'تعيشين': 'عشر',
  'اتخاذ': 'اخذ',
  'تستطيع': 'طوع',
  'الابتعاد': 'بعد',
  'تتحول': 'حول',
  'قالا': 'قول',
  'تعيش': 'عشر',
  'تضم': 'ضم',
  'حقيبتها': 'حقيبة',
  'يفترض': 'فرض',
  'معلقا': 'علق',
  'شاحنا': 'شاحن',
  'يناسب': 'نسب',
  'يعيدا': 'عود',
  'يقودها': 'قود',
  'انحنت': 'حنو',
  'تسمحين': 'سمح',
  'ضعها': 'وضع',
  'يجعل': 'جعل',
  'مألوفا': 'الف',
  'دفترا': 'دفتر',
  'تحتاجين': 'حوج',
  'كيلا': 'كي',
  'تضطري': 'ضر',
  'أنام': 'نوم',
  'أتحدث': 'حدث',
  'مغادرة': 'غدر',
  'احتجت': 'حوج',
  'سأرتب': 'رتب',
  'يحاول': 'حول',
  'مجلدا': 'مجلد',
  'يحمل': 'حمل',
  'مخططا': 'مخطط',
  'مطبوعا': 'مطبوع',
  'ونسخا': 'نسخ',
  'مثبتة': 'ثبت',
  'تترك': 'ترك',
  'نقصا': 'نقص',
  'عشوائيا': 'عشو',
  'مقصودا': 'مقصود',
  'تكتمل': 'كمل',
  'تستعد': 'عد',
  'خاليا': 'خلو',
  'يستقيم': 'قوم',
  'سأراجعها': 'رجع',
  'أريد': 'رود',
  'ينقص': 'نقص',
}))

const PREFIXES = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل', 'س']
const SUFFIXES = ['كما', 'هما', 'اتها', 'ياتها', 'اتهم', 'اتكم', 'اتنا', 'تين', 'تان', 'يون', 'يات', 'ون', 'ين', 'ان', 'ات', 'ها', 'هم', 'هن', 'كم', 'كن', 'نا', 'ني', 'ك', 'ه', 'ي', 'ة', 'ت']

function stripDiacritics(value) {
  return value.normalize('NFC').replace(DIACRITICS, '')
}

function normalizeAlef(value) {
  return value.replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ|ى/g, 'ي')
}

function splitSentences(text) {
  const sentences = []
  let current = ''
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    current += character
    if (!TERMINALS.has(character)) continue
    while (text[index + 1] === '»' || text[index + 1] === '”' || text[index + 1] === '"') {
      current += text[++index]
    }
    sentences.push(current.trim())
    current = ''
  }
  if (current.trim()) sentences.push(current.trim())
  return sentences
}

function alignParagraph(arabic, english) {
  const arabicSentences = splitSentences(arabic)
  const englishSentences = splitSentences(english)
  if (arabicSentences.length === englishSentences.length) {
    return arabicSentences.map((sentence, index) => ({ arabic: sentence, translation: englishSentences[index] }))
  }
  if (arabicSentences.length === 1) return [{ arabic, translation: english }]
  if (arabicSentences.length + 1 === englishSentences.length) {
    return arabicSentences.map((sentence, index) => ({
      arabic: sentence,
      translation: index === 0
        ? `${englishSentences[0]} ${englishSentences[1]}`
        : englishSentences[index + 1],
    }))
  }
  throw new Error(`Unable to align paragraph (${arabicSentences.length} Arabic / ${englishSentences.length} English sentences): ${arabic} || ${english}`)
}

function parseApprovedSource(source) {
  const [arabicSection, englishSection] = source.split(SOURCE_DIVIDER)
  if (!arabicSection || !englishSection) throw new Error(`Source must contain ${SOURCE_DIVIDER}`)
  const arabicLines = arabicSection.replace(ARABIC_HEADING, '').trim().split(/\r?\n/).filter(Boolean)
  const englishLines = englishSection.trim().split(/\r?\n/).filter(Boolean)
  const titleAr = arabicLines.shift()
  const title = englishLines.shift()
  if (arabicLines.length !== englishLines.length) {
    throw new Error(`Paragraph count mismatch: ${arabicLines.length} Arabic / ${englishLines.length} English`)
  }
  return {
    title,
    titleAr,
    blocks: arabicLines.flatMap((paragraph, index) => alignParagraph(paragraph, englishLines[index])),
  }
}

function tokenizeWithPunctuation(sentence) {
  return sentence.split(/\s+/).filter(Boolean).map((raw) => {
    let prefix = ''
    let suffix = ''
    let arabic = raw
    while (arabic && LEADING_PUNCTUATION.has(arabic[0])) {
      prefix += arabic[0]
      arabic = arabic.slice(1)
    }
    while (arabic && TRAILING_PUNCTUATION.has(arabic.at(-1))) {
      suffix = arabic.at(-1) + suffix
      arabic = arabic.slice(0, -1)
    }
    if (!arabic) throw new Error(`Punctuation-only token in: ${sentence}`)
    return { arabic, ...(prefix ? { prefix } : {}), ...(suffix ? { suffix } : {}) }
  })
}

function variantsFor(surface) {
  const start = stripDiacritics(surface)
  const variants = new Map([[start, 0], [normalizeAlef(start), 0]])
  const queue = [start, normalizeAlef(start)]
  while (queue.length) {
    const value = queue.shift()
    const depth = variants.get(value) ?? 0
    if (depth >= 3) continue
    for (const prefix of PREFIXES) {
      if (value.startsWith(prefix) && value.length - prefix.length >= 2) add(value.slice(prefix.length), depth + 1)
    }
    for (const suffix of SUFFIXES) {
      if (value.endsWith(suffix) && value.length - suffix.length >= 2) add(value.slice(0, -suffix.length), depth + 1)
    }
  }
  return [...variants.entries()]

  function add(value, depth) {
    for (const candidate of [value, normalizeAlef(value)]) {
      if (!variants.has(candidate)) {
        variants.set(candidate, depth)
        queue.push(candidate)
      }
    }
  }
}

async function fetchAll(client, table, columns) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

function buildDictionaryIndex(rows) {
  const direct = new Map()
  const search = new Map()
  for (const row of rows) {
    for (const key of [stripDiacritics(row.word), normalizeAlef(stripDiacritics(row.word))]) push(direct, key, row)
    for (const term of String(row.search_vector ?? '').match(/[\u0600-\u06FF]+/g) ?? []) {
      const clean = stripDiacritics(term)
      push(search, clean, row)
      push(search, normalizeAlef(clean), row)
    }
  }
  return { direct, search }

  function push(index, key, row) {
    if (!key) return
    const bucket = index.get(key) ?? []
    if (!bucket.some((item) => item.id === row.id)) bucket.push(row)
    index.set(key, bucket)
  }
}

function chooseDictionaryEntry(surface, index) {
  const plain = stripDiacritics(surface)
  const normalized = normalizeAlef(plain)
  const hasOverride = HEADWORD_OVERRIDES.has(plain) || HEADWORD_OVERRIDES.has(normalized)
  if (hasOverride) {
    const headword = HEADWORD_OVERRIDES.get(plain) ?? HEADWORD_OVERRIDES.get(normalized) ?? null
    if (headword === null) return { selected: null, alternatives: 0, intentional: true }
    const rows = index.direct.get(headword) ?? index.direct.get(normalizeAlef(headword)) ?? []
    if (!rows.length) throw new Error(`Configured Hans Wehr headword not found: ${headword} (${surface})`)
    const selected = rows.find((row) => row.is_root) ?? rows[0]
    return { selected, alternatives: rows.length, intentional: true }
  }

  const candidates = []
  for (const [variant, depth] of variantsFor(surface)) {
    for (const row of index.direct.get(variant) ?? []) candidates.push({ row, score: 120 - depth * 12 })
    for (const row of index.search.get(variant) ?? []) candidates.push({ row, score: 80 - depth * 12 })
  }
  for (const candidate of candidates) {
    if (candidate.row.is_root) candidate.score += 6
    const length = stripDiacritics(candidate.row.word).length
    if (length >= 3 && length <= 6) candidate.score += 3
  }
  candidates.sort((left, right) => right.score - left.score || left.row.id - right.row.id)
  return {
    selected: candidates[0]?.row ?? null,
    alternatives: candidates.filter((item) => item.score === candidates[0]?.score).length,
    intentional: false,
  }
}

function shortDefinition(entry, surface) {
  if (!entry) return stripDiacritics(surface)
  let definition = String(entry.definition ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (definition.startsWith(entry.word)) definition = definition.slice(entry.word.length).trim()
  const firstMeaning = definition.match(/\bto\s+[a-z][^;]*/i)?.[0]
  if (firstMeaning) definition = firstMeaning
  return definition.split(';').slice(0, 2).join('; ').slice(0, 160) || stripDiacritics(surface)
}

function classify(surface, entry) {
  const plain = stripDiacritics(surface)
  const normalized = normalizeAlef(plain)
  const common = COMMON.get(plain) ?? COMMON.get(normalized)
  if (common) return { pos: common[0], cefr: common[1], english: common[2] }
  const proper = PROPER_NAMES.get(plain) ?? PROPER_NAMES.get(normalized)
  if (proper) return { pos: 'proper_noun', cefr: 'A1', english: proper }
  const definition = String(entry?.definition ?? '')
  const earlyDefinition = definition.slice(0, 180)
  const pos = /\bto\s+[a-z]/i.test(earlyDefinition) ? 'verb'
    : /\b(adj|adjective)\b/i.test(earlyDefinition) ? 'adjective'
      : 'noun'
  const occurrence = Number(entry?.quran_occurrence ?? 0)
  const cefr = occurrence >= 50 ? 'A1' : occurrence >= 10 ? 'A2' : plain.length >= 8 ? 'B2' : 'B1'
  return { pos, cefr, english: shortDefinition(entry, surface) }
}

function transliterateArabic(value) {
  let text = value.normalize('NFC')
    .replace(/َا/g, 'ā').replace(/ِي/g, 'ī').replace(/ُو/g, 'ū')
    .replace(/َى/g, 'ā')
  const map = {
    'ء': 'ʾ', 'أ': 'ʾ', 'إ': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ', 'ا': 'ā', 'آ': 'ʾā', 'ٱ': '',
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
    'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ',
    'ع': 'ʿ', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'ة': 'h', 'و': 'w', 'ي': 'y', 'ى': 'ā', 'َ': 'a', 'ُ': 'u', 'ِ': 'i',
    'ً': 'an', 'ٌ': 'un', 'ٍ': 'in', 'ْ': '', 'ٰ': 'ā', 'ـ': '',
  }
  let result = ''
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (character === 'ّ') {
      const previous = result.match(/(?:kh|gh|sh|th|dh|[a-zāīūḥṣḍṭẓʿʾ])$/)?.[0]
      if (previous) result += previous
      continue
    }
    result += map[character] ?? character
  }
  return result.replace(/ʾ([aiu])/g, 'ʾ$1').replace(/āā/g, 'ā')
}

function enrichBlocks(blocks, dictionaryIndex) {
  const report = { tokens: 0, matched: 0, intentionalNames: 0, unmatched: new Map(), ambiguous: new Map() }
  const content = blocks.map((block) => {
    const tokens = tokenizeWithPunctuation(block.arabic).map((rawToken) => {
      report.tokens++
      const resolution = chooseDictionaryEntry(rawToken.arabic, dictionaryIndex)
      if (resolution.selected) report.matched++
      else if (resolution.intentional) report.intentionalNames++
      else report.unmatched.set(stripDiacritics(rawToken.arabic), (report.unmatched.get(stripDiacritics(rawToken.arabic)) ?? 0) + 1)
      if (!resolution.intentional && resolution.alternatives > 1) report.ambiguous.set(stripDiacritics(rawToken.arabic), resolution.alternatives)
      const classification = classify(rawToken.arabic, resolution.selected)
      if (!CEFR_LEVELS.has(classification.cefr)) throw new Error(`Invalid CEFR ${classification.cefr}`)
      return {
        ...rawToken,
        pos: classification.pos,
        cefr: classification.cefr,
        english: classification.english,
        headword: resolution.selected?.word ?? null,
        entry_type: 'word',
        transliteration: transliterateArabic(rawToken.arabic),
      }
    })
    const reconstructed = tokens.map((token) => `${token.prefix ?? ''}${token.arabic}${token.suffix ?? ''}`).join(' ')
    if (reconstructed !== block.arabic) throw new Error(`Arabic changed during tokenisation: ${block.arabic} || ${reconstructed}`)
    return { translation: block.translation, tokens }
  })
  return { content, report }
}

async function main() {
  const [sourcePath, chapterNumberText, ...flags] = process.argv.slice(2)
  if (!sourcePath || !chapterNumberText) {
    throw new Error('Usage: node --env-file=.env.local scripts/ingest-approved-book-chapter.mjs <source.txt> <chapter-number> [--write]')
  }
  const write = flags.includes('--write')
  const chapterNumber = Number(chapterNumberText)
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) throw new Error('Chapter number must be a positive integer')
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('Supabase service configuration is missing')

  const parsed = parseApprovedSource(await fs.readFile(sourcePath, 'utf8'))
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const dictionary = await fetchAll(client, 'hanswehr_dictionary', 'id, word, definition, is_root, parent_id, quran_occurrence, search_vector')
  const { content, report } = enrichBlocks(parsed.blocks, buildDictionaryIndex(dictionary))

  console.log(JSON.stringify({
    title: parsed.title,
    titleAr: parsed.titleAr,
    chapterNumber,
    blocks: content.length,
    tokens: report.tokens,
    matched: report.matched,
    intentionalNames: report.intentionalNames,
    unmatched: [...report.unmatched.entries()],
    ambiguous: [...report.ambiguous.entries()].slice(0, 50),
    write,
  }, null, 2))

  if (!write) return
  const slug = 'the-stranger-who-knows-my-name'
  let { data: book, error: bookError } = await client.from('books').select('id').eq('slug', slug).maybeSingle()
  if (bookError) throw bookError
  if (!book) {
    const result = await client.from('books').insert({
      slug,
      title: parsed.title,
      title_ar: parsed.titleAr,
      description: 'After an accident disrupts Mariam’s recent memories, she wakes to discover that the stranger beside her hospital bed is her husband.',
      cover: null,
      level: 'B1-B2',
      category: 'Mystery',
    }).select('id').single()
    if (result.error) throw result.error
    book = result.data
  }

  const chapterSlug = `stranger-${chapterNumber}`
  const chapterTitle = chapterNumber === 1 ? 'Chapter 1' : `Chapter ${chapterNumber}: ${parsed.title}`
  const existing = await client.from('chapters').select('id').eq('book_id', book.id).eq('chapter_number', chapterNumber).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) {
    const update = await client.from('chapters').update({ slug: chapterSlug, title: chapterTitle, content }).eq('id', existing.data.id)
    if (update.error) throw update.error
    console.log(`UPDATED_CHAPTER=${existing.data.id}`)
  } else {
    const insert = await client.from('chapters').insert({ book_id: book.id, slug: chapterSlug, title: chapterTitle, chapter_number: chapterNumber, content }).select('id').single()
    if (insert.error) throw insert.error
    console.log(`CREATED_CHAPTER=${insert.data.id}`)
  }
  console.log(`BOOK_ID=${book.id}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
