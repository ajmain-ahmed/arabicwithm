// Explicit linguistic review of the 24 November discovery snapshot, not an automatic approval rule.
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const dir = 'artifacts/phrase-restore/corpus'
const raw = await readFile(`${dir}/discovery.json`, 'utf8')
const data = JSON.parse(raw)
assert.equal(data.candidates.length, 155, 'Changed corpus: review it again before preparing an import')
assert.equal(data.candidates[143].arabic, 'يُسْقِطُ عَلَى')
const rejected = new Map([
  [12, 'Broken source wording; not a sound reusable expression'],
  [27, 'Attested first use means peered at, not the reference sense looks forward to'],
  [29, 'Ordinary numeral; not a reusable lexical expression for this library'],
  [31, 'Generic verb/preposition fragment; contextual reference sense not established'],
  [33, 'Cross-clause match: ذلك refers to a destination; بأن is instrumental, not because'],
  [53, 'False collocation: على belongs to قادر, not a provided-that expression'],
  [58, 'Generic fragment; the source means evidence of anything, not somewhat'],
  [63, 'Literal margin of a copy, not the reference sense on the sidelines'],
  [67, 'Source has a nominal form, not the proposed verb collocation'],
  [72, 'Literal location fragment; no fixed expression established'],
  [73, 'Ordinary location plus possessive pronoun'],
  [74, 'Ordinary location plus possessive pronoun'],
  [75, 'False match: حق is a right, not a regarding/concerning expression'],
  [82, 'Truncated idiom; the essential complement is absent'],
  [84, 'Ordinary pronoun phrase; insufficient evidence of a useful fixed unit'],
  [97, 'False lexical sense: no responsibility, not irresponsibility'],
  [104, 'Compositional post-modifier; held outside the conservative lexical-chunk selection'],
  [105, 'Ordinary between construction; no distinct lexical expression established'],
  [114, 'Arbitrary adjective plus intensifier, not a fixed collocation'],
  [117, 'Ordinary location fragment from the door'],
  [120, 'False match: شأنه means his standing, not is likely to'],
  [124, 'False boundary: the source says since the previous day'],
  [130, 'Ordinary action stood before him; the idiomatic opposed sense is unsupported'],
  [143, 'False vocalisation/sense: source means falls onto, not projects onto'],
  [144, 'Context has orders issuing from a palace; the reference stems-from sense is not established'],
])
// Levels assess the expression itself. They are not copied from source/book difficulty.
const levels = {
  A1: [3,5,6,10,13,18,30,42,90,96,107,110,111,113,118,121,129],
  A2: [0,1,2,7,14,16,17,19,22,23,26,32,38,41,43,45,46,49,52,62,66,70,76,89,92,95,108,112,115,119,123,126,127,128,131,135,145,152],
  B1: [4,8,9,11,15,24,25,28,34,35,36,37,44,48,50,51,54,57,59,60,64,68,69,71,79,83,86,87,88,93,94,100,102,106,109,116,132,136,137,138,139,141,142,147,149,150,151,153],
  B2: [20,21,39,40,47,55,56,61,65,77,78,80,81,85,91,98,99,101,103,122,125,133,134,140,146,148,154],
}
const levelFor = new Map(Object.entries(levels).flatMap(([level, indices]) => indices.map(index => [index, level])))
const accepted = [], excluded = []
for (const [index, candidate] of data.candidates.entries()) {
  if (rejected.has(index)) { excluded.push({ ...candidate, reason: rejected.get(index) }); continue }
  assert.ok(levelFor.has(index), `Expression ${index} needs a phrase-level CEFR review`)
  const entry = { ...candidate, cefr: levelFor.get(index) }
  if (index === 4) Object.assign(entry, { arabic: 'عَلَى الرَّحْبِ وَالسَّعَةِ', transliteration: 'ʿalā r-raḥbi wa-s-saʿa', english: "You're welcome; with pleasure", wordGlosses: [] })
  if (index === 80) entry.english = 'in the shadow of'
  if (index === 126) entry.english = 'a spare copy'
  if (index === 127) entry.english = 'nodded'
  if (index === 138) entry.english = 'brings together'
  if (index === 141) entry.english = 'links'
  if (index === 149) entry.english = 'compares'
  // Store one checked occurrence per phrase. Multiple meanings must not acquire unchecked evidence.
  if (index === 60) entry.occurrences = candidate.occurrences.filter(value => value.arabic.includes('حَال') && !value.arabic.includes('سَحِيل'))
  if (index === 106) entry.occurrences = candidate.occurrences.filter(value => !value.arabic.includes('الزَّمَن') && !value.arabic.includes('الزَّمَن'))
  if (!entry.occurrences.length) { excluded.push({ ...entry, reason: 'No checked occurrence remains after contextual-sense filtering' }); continue }
  entry.occurrences = entry.occurrences.slice(0, 1)
  accepted.push(entry)
}
assert.ok(accepted.length >= 50 && excluded.length >= 25 && data.borderline.length >= 25)
const review = { generatedAt: new Date().toISOString(), discoverySha256: createHash('sha256').update(raw).digest('hex'),
  qualityGate: 'passed for the explicit reviewed selection only; no quota or claim of exhaustive semantic discovery',
  accepted, rejected: excluded, borderline: data.borderline,
  summary: { initialPhrases: data.inventory.phrases, sourceRecords: data.inventory, canonicalDocuments: data.canonicalDocuments,
    sourceUnits: data.units, distinctCandidates: data.candidates.length, accepted: accepted.length,
    alreadyExisting: accepted.filter(row => row.existingId).length, newProposed: accepted.filter(row => !row.existingId).length,
    rejected: excluded.length, borderlineReferenceEntries: data.borderline.length,
    withSourceWordGlosses: accepted.filter(row => row.wordGlosses.length).length },
  sample: { accepted: Array.from({ length: 50 }, (_, index) => accepted[Math.floor(index * accepted.length / 50)]),
    borderline: data.borderline.slice(0, 25), rejected: excluded.slice(0, 25) } }
await writeFile(`${dir}/reviewed.json`, JSON.stringify(review, null, 2))
const table = rows => ['| Arabic | Meaning / reason |', '|---|---|', ...rows.map(row => `| ${row.arabic} | ${(row.reason ?? row.english).replaceAll('|', '/')} |`)]
await writeFile(`${dir}/quality-review.md`, ['# Corpus Phrase quality review', '', JSON.stringify(review.summary, null, 2),
  '', '50 accepted expressions, distributed across the complete reviewed selection:', ...table(review.sample.accepted),
  '', '25 borderline reference entries: not accepted without resolving their open complements and attesting them in the corpus.', ...table(review.sample.borderline),
  '', '25 rejected corpus matches, checked against source sentences:', ...table(review.sample.rejected),
  '', 'This is a conservative first pass using authored expressions and lexical references. It scans the corpus, but cannot establish that every useful phrase has been discovered. It does not approve 2,000 dictionary entries merely to meet a remembered count.',
].join('\n'))
console.log(review.summary)
