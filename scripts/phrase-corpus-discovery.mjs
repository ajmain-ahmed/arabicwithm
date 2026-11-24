// Read-only corpus discovery. No queue RPC, model request or database mutation.
import { createClient } from '@supabase/supabase-js'
import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const output = process.argv[2] ?? 'artifacts/phrase-restore/corpus'
const vite = await createServer({ configFile: false, server: { middlewareMode: true, watch: null }, optimizeDeps: { noDiscovery: true }, resolve: { alias: { '@': process.cwd() } } })
const { canonicalUnits, normalizePhrase: key } = await vite.ssrLoadModule('/app/lib/contentEnrichment/canonical.ts')
const { extractPhrases } = await vite.ssrLoadModule('/app/lib/contentEnrichment/phrases.ts')
const { sourcePhraseGlosses } = await vite.ssrLoadModule('/app/lib/dailyPhrase.ts')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }) },
})
async function read(table, columns, order = 'id') {
  const rows = []
  let after
  for (;;) {
    let query = db.from(table).select(columns).order(order).limit(100)
    if (after !== undefined) query = query.gt(order, after)
    const { data, error } = await query
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 100) return rows
    after = data.at(-1)[order]
  }
}
try {
  const inventory = {}
  const tables = {}
  for (const [table, columns, order] of [
    ['phrases', '*'], ['books', 'id,title,slug,level'], ['shows', 'id,title,slug,level'],
    ['episodes', 'id,title,slug,show_id,youtube_id,transcript'],
    ['chapters', 'id,title,slug,book_id,content'],
    ['youtube_transcripts', 'id,title,episode_id,status,source_origin,raw_transcript,canonical_transcript,canonical_url'],
    ['transcript_segments', 'id,transcript_id,position,start_seconds,original_text,english_text,canonical_paragraph'],
    ['vocabulary', 'word_id,word_di,word_tr,level,definitions', 'word_id'],
  ]) {
    tables[table] = await read(table, columns, order)
    inventory[table] = tables[table].length
    console.log(table, inventory[table])
  }
  const parents = new Map([...tables.books, ...tables.shows].map(row => [row.id, row]))
  const documents = new Map(), skipped = []
  const digest = value => createHash('sha256').update(value).digest('hex')
  function inspect(source, canonicalId = `${source.kind}:${source.id}`) {
    const units = canonicalUnits(source)
    const document = documents.get(canonicalId) ?? { canonicalId, aliases: [], units: [], hashes: new Set() }
    document.aliases.push({ kind: source.kind, id: source.id })
    for (const unit of units) {
      const fingerprint = digest(key(unit.arabic))
      if (document.hashes.has(fingerprint)) continue
      document.hashes.add(fingerprint)
      document.units.push({ ...unit, source: { ...source, content: undefined, unitKeys: undefined } })
    }
    documents.set(canonicalId, document)
  }
  for (const [table, kind, parentField, field] of [['episodes', 'episode', 'show_id', 'transcript'], ['chapters', 'chapter', 'book_id', 'content']]) {
    for (const row of tables[table]) {
      const parent = parents.get(row[parentField])
      inspect({ kind, id: row.id, title: row.title, parentId: parent?.id, parentTitle: parent?.title,
        language: 'ar', url: kind === 'chapter' ? `/admin/books/preview/${row.id}` : `/cartoons/${parent?.slug}/${row.slug}`,
        originalUrl: row.youtube_id ? `https://www.youtube.com/watch?v=${row.youtube_id}` : undefined, content: row[field] })
    }
  }
  const segments = Map.groupBy(tables.transcript_segments, row => row.transcript_id)
  for (const row of tables.youtube_transcripts) {
    if (row.status !== 'ready' || !['awm', 'website_admin_transcript'].includes(row.source_origin)) {
      skipped.push({ id: row.id, reason: row.source_origin === 'user_import' ? 'Personal user import' : 'Source not ready' }); continue
    }
    const root = typeof row.raw_transcript === 'string' ? JSON.parse(row.raw_transcript) : row.raw_transcript
    const source = { kind: 'transcript', id: row.id, title: row.title, language: root?.source_language === 'en' ? 'en' : 'ar', url: `/transcripts/${row.id}`, originalUrl: row.canonical_url }
    const canonicalId = row.episode_id && documents.has(`episode:${row.episode_id}`) ? `episode:${row.episode_id}` : `transcript:${row.id}`
    // Raw authored tokens take precedence over canonical projections which can omit phrase metadata.
    function inspectTranscript(content, unitKeys) {
      inspect({ ...source, content, unitKeys }, canonicalId)
      // Some English-source records retain authored Arabic tokens as well as
      // an Arabic sentence translation. Both are language content, not metadata.
      if (source.language === 'en') inspect({ ...source, language: 'ar', content, unitKeys }, canonicalId)
    }
    inspectTranscript(root?.content ?? root)
    inspectTranscript(row.canonical_transcript)
    const rows = (segments.get(row.id) ?? []).sort((a, b) => a.position - b.position)
    inspectTranscript(rows.map(segment => segment.canonical_paragraph ?? (source.language === 'en' ? {
      translation: segment.english_text, tokens: [{ english: segment.original_text }], timestamp: String(segment.start_seconds),
    } : {
      arabic: /[\u0621-\u064a]/u.test(segment.original_text ?? '') ? segment.original_text : segment.english_text,
      translation: segment.english_text, timestamp: String(segment.start_seconds),
    })), rows.map(segment => `segment/${segment.id}`))
  }
  const lexical = [], rejected = [], borderline = []
  for (const row of tables.vocabulary) {
    const normalized = key(row.word_di ?? '')
    if (normalized.split(' ').length < 2) continue
    const meanings = [...new Set((Array.isArray(row.definitions) ? row.definitions : []).map(value => value.direct_english).filter(Boolean))]
    const candidate = { arabic: row.word_di, english: meanings[0], transliteration: row.word_tr, vocabularyId: row.word_id }
    if (/[/\\|]/u.test(row.word_di)) rejected.push({ ...candidate, reason: 'Alternative word forms, not a reusable expression' })
    else if (/[ـ…()\[\]]/u.test(row.word_di) || meanings.length !== 1 || !row.word_tr) borderline.push({ ...candidate, reason: 'Needs phrase-level sense or transliteration review' })
    else lexical.push({ ...candidate, key: normalized })
  }
  const candidates = new Map()
  function offer(candidate, unit, document, evidence) {
    const normalized = key(candidate.arabic)
    const record = candidates.get(normalized) ?? { key: normalized, arabic: candidate.arabic, english: candidate.english,
      transliteration: candidate.transliteration, cefr: candidate.cefr ?? null, evidence, wordGlosses: [], occurrences: [] }
    const glosses = sourcePhraseGlosses(record.arabic, unit.tokens)
    if (!record.wordGlosses.length && glosses.length) record.wordGlosses = glosses
    record.occurrences.push({ canonicalId: document.canonicalId, unitKey: unit.key, source: unit.source,
      arabic: unit.arabic, english: unit.english, timestamp: unit.timestamp })
    candidates.set(normalized, record)
  }
  for (const document of documents.values()) for (const unit of document.units) {
    for (const candidate of extractPhrases([unit])) offer(candidate, unit, document, candidate.evidence)
    for (const sentence of unit.arabic.split(/[.!?؟؛\n]/u)) {
      const normalized = ` ${key(sentence)} `
      for (const phrase of lexical) if (normalized.includes(` ${phrase.key} `)) offer(phrase, unit, document, 'Authored lexical expression attested in learner corpus; requires semantic review')
    }
  }
  const existing = new Map(tables.phrases.map(row => [key(row.phrase_ar_di), row.id]))
  const all = [...candidates.values()].sort((a, b) => a.key.localeCompare(b.key, 'ar')).map(row => ({ ...row, existingId: existing.get(row.key) }))
  const report = { generatedAt: new Date().toISOString(), productionWrites: false, inventory, skipped,
    canonicalDocuments: documents.size, nonemptyDocuments: [...documents.values()].filter(d => d.units.length).length,
    units: [...documents.values()].reduce((count, doc) => count + doc.units.length, 0),
    candidates: all, borderline, rejected, existingSnapshot: tables.phrases,
    notes: 'Vocabulary is a matching reference, not an independent passage source. Shared Episode/Transcript mirrors are merged by canonical document and normalized sentence. Parent tables contain metadata only. No phrase is approved merely because it has multiple words.' }
  await mkdir(output, { recursive: true })
  await writeFile(path.join(output, 'discovery.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ documents: report.canonicalDocuments, nonempty: report.nonemptyDocuments, units: report.units, candidates: all.length, existing: all.filter(row => row.existingId).length, borderline: borderline.length, rejected: rejected.length }))
} finally { await vite.close() }
