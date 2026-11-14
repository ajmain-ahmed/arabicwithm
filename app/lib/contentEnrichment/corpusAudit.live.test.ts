// @vitest-environment node
import { it, vi } from 'vitest'
import { mkdir, writeFile } from 'node:fs/promises'
import { canonicalUnits, normalizePhrase } from './canonical'
import { extractPhrases } from './phrases'
import { authoredGrammar } from './grammar'
import { CEFR_LEVELS, string, type EnrichmentSource, type GrammarCandidate } from './types'
vi.mock('server-only', () => ({}))
import { serviceClient } from '@/app/lib/supabase'
import { loadEnrichmentSource } from './sources'
import { recoverRead } from '@/app/lib/readRecovery'

it.skipIf(process.env.AWM_ENRICHMENT_AUDIT !== '1')(
  'audits the real corpus without model calls or production writes',
  async () => {
    process.loadEnvFile('.env.local')
    const client = serviceClient
    const inventory: Record<string, { sources: number; units: number; empty: number }> = {}
    const phrases = new Map<string, unknown>(),
      notes = new Map<string, GrammarCandidate & { source: Omit<EnrichmentSource, 'content'> }>()
    const warnings: string[] = []
    const distribution = Object.fromEntries(CEFR_LEVELS.map((level) => [level, 0]))
    function inspect(source: EnrichmentSource) {
      const units = canonicalUnits(source),
        counts = (inventory[source.kind] ??= { sources: 0, units: 0, empty: 0 })
      counts.sources++
      counts.units += units.length
      if (!units.length) counts.empty++
      for (const phrase of extractPhrases(units))
        if (!phrases.has(normalizePhrase(phrase.arabic)))
          phrases.set(normalizePhrase(phrase.arabic), {
            ...phrase,
            source: { kind: source.kind, id: source.id, title: source.title, url: source.url },
          })
      const { content, ...provenance } = source
      void content
      for (const note of authoredGrammar(units)) {
        const key = `${note.ruleKey}:${source.kind}:${source.id}:${note.unit.key}`
        if (notes.has(key)) continue
        notes.set(key, { ...note, source: provenance })
      }
    }
    async function* rows(
      table: 'books' | 'shows' | 'chapters' | 'episodes' | 'vocabulary' | 'youtube_transcripts',
      columns: string,
    ) {
      const pageSize = table === 'chapters' || table === 'episodes' ? 25 : 500
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await recoverRead(() =>
          client
            .from(table)
            .select(columns)
            .order(table === 'vocabulary' ? 'word_id' : 'id')
            .range(offset, offset + pageSize - 1),
        )
        if (error) throw new Error(`Audit read failed for ${table}`)
        for (const value of data ?? []) yield value as unknown as Record<string, unknown>
        if ((data?.length ?? 0) < pageSize) break
      }
    }
    const parents = new Map<string, { title: string; slug: string; level: string }>()
    for (const table of ['books', 'shows'] as const)
      for await (const row of rows(table, 'id,title,slug,level'))
        parents.set(String(row.id), {
          title: string(row.title),
          slug: string(row.slug),
          level: string(row.level),
        })
    for (const table of ['chapters', 'episodes'] as const) {
      for await (const row of rows(
        table,
        table === 'chapters'
          ? 'id,book_id,title,slug,content'
          : 'id,show_id,title,slug,level,transcript',
      )) {
        const kind = table === 'chapters' ? 'chapter' : 'episode',
          id = String(row.id),
          parentId = String(row[table === 'chapters' ? 'book_id' : 'show_id']),
          parent = parents.get(parentId)
        inspect({
          kind,
          id,
          title: string(row.title),
          parentId,
          parentTitle: parent?.title,
          url:
            kind === 'chapter'
              ? `/admin/books/preview/${id}`
              : `/cartoons/${parent?.slug}/${string(row.slug)}`,
          language: 'ar',
          level: string(row.level) || parent?.level,
          content: row[table === 'chapters' ? 'content' : 'transcript'],
        })
      }
    }
    for await (const row of rows('youtube_transcripts', 'id,status,source_origin')) {
      if (
        row.status !== 'ready' ||
        !['awm', 'website_admin_transcript'].includes(string(row.source_origin))
      )
        continue
      try {
        const source = await loadEnrichmentSource('transcript', String(row.id))
        if (source) inspect(source)
      } catch {
        warnings.push(`Transcript ${String(row.id)} could not be read completely.`)
      }
    }
    for await (const row of rows(
      'vocabulary',
      'word_id,word_di,word_tr,level,definitions,examples',
    ))
      inspect({
        kind: 'vocabulary',
        id: String(row.word_id),
        title: string(row.word_di),
        url: '',
        language: 'ar',
        level: string(row.level),
        content: row,
      })
    const existing = new Set<string>()
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client
        .from('phrases')
        .select('phrase_ar_di')
        .order('id')
        .range(offset, offset + 499)
      if (error) throw new Error('Phrase audit read failed')
      for (const row of data ?? []) existing.add(normalizePhrase(row.phrase_ar_di))
      if ((data?.length ?? 0) < 500) break
    }
    const examples = [...notes.values()]
    const uniqueRules = new Map(examples.map((note) => [note.ruleKey, note]))
    for (const note of uniqueRules.values()) distribution[note.cefr]++
    const sample = {
      beginner_intermediate: examples
        .filter((note) => ['A1', 'A2', 'B1'].includes(note.cefr))
        .slice(0, 20),
      b2: examples.filter((note) => note.cefr === 'B2').slice(0, 30),
      c1_c2: examples.filter((note) => ['C1', 'C2'].includes(note.cefr)).slice(0, 30),
    }
    const report = {
      generatedAt: new Date().toISOString(),
      productionWrites: false,
      modelCalls: 0,
      analysisMode:
        'Authored rule evidence only. Contextual model discovery awaits a configured provider.',
      inventory,
      distribution,
      grammarRules: new Set(examples.map((note) => note.ruleKey)).size,
      grammarOccurrences: examples.length,
      phrases: phrases.size,
      newPhraseKeys: [...phrases.keys()].filter((key) => !existing.has(key)).length,
      warnings,
      sample,
      ruleSummaries: [...uniqueRules.values()].map((note) => ({
        ruleKey: note.ruleKey,
        titleEn: note.titleEn,
        titleAr: note.titleAr,
        cefr: note.cefr,
      })),
      phraseSample: [...phrases.values()].slice(0, 30),
    }
    await mkdir('artifacts/content-enrichment', { recursive: true })
    await writeFile('artifacts/content-enrichment/audit.json', JSON.stringify(report, null, 2))
    const lines = [
      '# Read-only content enrichment quality audit',
      '',
      'This run uses the production corpus and the shared canonical adapters and analysers. Model calls and production writes are zero. Distribution counts reflect authored rule evidence, not a completed contextual model crawl.',
      '',
      '| CEFR | Distinct authored-evidence rule candidates |',
      '|---|---:|',
      ...CEFR_LEVELS.map((level) => `| ${level} | ${distribution[level]} |`),
      '',
      '## Requested review samples',
      '',
      `Beginner/intermediate ${sample.beginner_intermediate.length}/20; B2 ${sample.b2.length}/30; C1/C2 ${sample.c1_c2.length}/30. Missing counts remain a provider/quality-validation gap.`,
      ...Object.entries(sample).flatMap(([group, values]) => [
        '',
        `## ${group}`,
        ...values.flatMap((note) => [
          '',
          `### ${note.titleEn} (${note.cefr})`,
          note.unit.arabic,
          note.explanation,
          `Source ${note.source.kind} / ${note.source.id} / ${note.unit.key}`,
          note.source.url,
        ]),
      ]),
    ]
    await writeFile('artifacts/content-enrichment/review.md', lines.join('\n'))
    console.log(
      JSON.stringify({
        inventory,
        distribution,
        grammarRules: report.grammarRules,
        grammarOccurrences: examples.length,
        phrases: phrases.size,
        newPhraseKeys: report.newPhraseKeys,
        warnings: warnings.length,
        samples: Object.fromEntries(
          Object.entries(sample).map(([key, values]) => [key, values.length]),
        ),
      }),
    )
  },
  600000,
)
