// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { enrichmentDatabase } from './helpers/enrichment'
let db: PGlite
const source = '11111111-1111-4111-8111-111111111111'
let note: string
const example = {
  ruleKey: 'lam-jussive',
  titleEn: 'Jussive after lam',
  titleAr: 'الجزم بلم',
  cefr: 'B1',
  category: 'nahw',
  explanation: 'Lam makes the following verb jussive.',
  detail: 'Advanced detail',
  mechanics: 'Lam governs this verb.',
  recognitionTip: 'Look for lam.',
  transformations: ['يَدْعُو → لَمْ يَدْعُ'],
  confidence: 0.9,
  unitKey: 'sentence/10',
  sourceOrder: 10,
  sourceArabic: 'لَمْ يَدْعُ الْإِمَامُ.',
  sourceEnglish: 'The imam did not call.',
  sourceTitle: 'Episode',
  sourceUrl: '/cartoons/show/one',
  highlight: 'لَمْ يَدْعُ',
  exampleCefr: 'C1',
}
beforeAll(async () => {
  db = await enrichmentDatabase()
  await db.exec(`alter table books add column is_completed boolean default true;
    alter table youtube_transcripts add column searchable boolean default true, add column explore_published boolean default false;`)
  await db.exec(readFileSync('supabase/migrations/20261114203000_home_daily_phrase.sql', 'utf8'))
  await db.exec(
    readFileSync('supabase/migrations/20261114225000_canonical_grammar_notes.sql', 'utf8'),
  )
  await db.query(`insert into episodes(id,title,transcript)values($1,'Episode','[]')`, [source])
}, 30000)
afterAll(() => db?.close())
async function commit(items: unknown[]) {
  await db.query(`select website_queue_enrichment('episode',$1,true)`, [source])
  await db.exec(
    `update content_enrichment_jobs set next_attempt_at=now()+interval '1 day' where analyser='phrases'`,
  )
  const job = (
    await db.query<{ id: string; lease_id: string }>('select * from website_claim_enrichment()')
  ).rows[0]
  await db.query('select website_commit_enrichment($1,$2,20,true,$3::jsonb)', [
    job.id,
    job.lease_id,
    JSON.stringify(items),
  ])
}
it('stores structured rules once, preserves exact examples, separates CEFR and gates public review', async () => {
  await commit([example, { ...example, unitKey: 'sentence/2', sourceOrder: 2 }])
  note = (await db.query<{ id: string }>('select id from grammar_notes')).rows[0].id
  expect(
    (
      await db.query(
        'select mechanics,recognition_tip,transformations,rule_cefr from grammar_notes',
      )
    ).rows[0],
  ).toMatchObject({
    mechanics: example.mechanics,
    recognition_tip: example.recognitionTip,
    transformations: example.transformations,
    rule_cefr: 'B1',
  })
  expect(
    (await db.query('select website_read_canonical_grammar($1) result', [note])).rows[0],
  ).toEqual({ result: null })
  await db.exec(
    `update grammar_notes set status='approved';update content_enrichment_examples set review_status='approved'`,
  )
  const result = (
    await db.query<{
      result: { examples: { source_order: number; example_cefr: string; arabic: string }[] }
    }>('select website_read_canonical_grammar($1) result', [note])
  ).rows[0].result
  expect(result.examples.map((value) => value.source_order)).toEqual([2, 10])
  expect(result.examples[0]).toMatchObject({ example_cefr: 'C1', arabic: example.sourceArabic })
})
it('preserves manual highlights, explanations and rule relationships across automated reruns', async () => {
  const id = (
    await db.query<{ id: string }>(
      'select id from content_enrichment_examples order by source_order limit 1',
    )
  ).rows[0].id
  const target = (
    await db.query<{ id: string }>(
      `insert into grammar_notes(rule_key,title_en,title_ar,rule_cefr,category,explanation,confidence)values('weak-final','Weak-final verbs','المعتل الآخر','B2','sarf','A separate specific rule.',0.9)returning id`,
    )
  ).rows[0].id
  await db.query('select website_edit_grammar_example($1,$2::jsonb)', [
    id,
    JSON.stringify({
      highlight: 'يَدْعُ',
      explanation: 'Manually clarified explanation.',
      grammar_note_id: target,
    }),
  ])
  await db.query(`select website_edit_canonical_grammar($1,$2::jsonb)`, [
    note,
    JSON.stringify({ mechanics: 'Admin mechanics', related_ids: [target] }),
  ])
  await commit([example, { ...example, unitKey: 'sentence/2', sourceOrder: 2 }])
  expect(
    (
      await db.query(
        'select grammar_note_id,highlight,explanation from content_enrichment_examples where id=$1',
        [id],
      )
    ).rows[0],
  ).toEqual({
    grammar_note_id: target,
    highlight: 'يَدْعُ',
    explanation: 'Manually clarified explanation.',
  })
  expect(
    (await db.query('select count(*)::int total from content_enrichment_examples')).rows[0],
  ).toEqual({ total: 2 })
  expect(
    (await db.query('select mechanics from grammar_notes where id=$1', [note])).rows[0],
  ).toEqual({ mechanics: 'Admin mechanics' })
  await expect(
    db.query('select website_edit_grammar_example($1,$2::jsonb)', [
      id,
      JSON.stringify({ highlight: 'invented' }),
    ]),
  ).rejects.toThrow('exact source')
})
it('keeps new privileges service-only', async () => {
  for (const role of ['anon', 'authenticated']) {
    expect(
      (
        await db.query(
          `select has_function_privilege($1,'website_read_canonical_grammar(uuid,boolean,text,text,integer)','execute') allowed`,
          [role],
        )
      ).rows[0],
    ).toEqual({ allowed: false })
    expect(
      (
        await db.query(`select has_table_privilege($1,'grammar_note_relations','insert') allowed`, [
          role,
        ])
      ).rows[0],
    ).toEqual({ allowed: false })
  }
})
it('keeps a manually curated duplicate example when merging into an automatic occurrence', async () => {
  const manual = (
    await db.query<{ id: string; grammar_note_id: string }>(
      `select id,grammar_note_id from content_enrichment_examples where manual_override limit 1`,
    )
  ).rows[0]
  await db.query(
    `insert into content_enrichment_examples(grammar_note_id,source_kind,source_id,unit_key,version_hash,source_title,source_url,arabic,highlight)
    select $1,source_kind,source_id,unit_key,version_hash,source_title,source_url,arabic,arabic from content_enrichment_examples where id=$2`,
    [note, manual.id],
  )
  await db.query(`select website_admin_grammar('merge',$1,$2::jsonb)`, [
    manual.grammar_note_id,
    JSON.stringify({ target: note }),
  ])
  expect(
    (
      await db.query(
        `select highlight,explanation,manual_override from content_enrichment_examples where grammar_note_id=$1 and unit_key='sentence/2'`,
        [note],
      )
    ).rows[0],
  ).toEqual({
    highlight: 'يَدْعُ',
    explanation: 'Manually clarified explanation.',
    manual_override: true,
  })
})
it('honours book release, chapter publication, sign-in and transcript discovery gates', async () => {
  const book = '22222222-2222-4222-8222-222222222222'
  await db.query(
    `insert into books(id,title,slug,is_completed)values($1,'Book','book',true);
  `,
    [book],
  )
  await db.query(
    `insert into chapters(id,book_id,title,slug,content)values($1,$2,'Chapter','chapter','[]')`,
    [book, book],
  )
  await db.query(
    `insert into content_enrichment_examples(grammar_note_id,source_kind,source_id,unit_key,version_hash,source_title,source_url,arabic,highlight,review_status)
  values($1,'chapter',$2,'sentence/0','version','Chapter','/books/book/chapter','لَمْ يَدْعُ.','يَدْعُ','approved')`,
    [note, book],
  )
  async function chapters(signedIn: boolean) {
    return (
      await db.query<{ result: { examples: unknown[] } }>(
        `select website_read_canonical_grammar($1,$2,'chapter') result`,
        [note, signedIn],
      )
    ).rows[0].result.examples
  }
  expect(await chapters(false)).toHaveLength(0)
  expect(await chapters(true)).toHaveLength(1)
  await db.query(`update books set is_completed=false where id=$1`, [book])
  expect(await chapters(true)).toHaveLength(0)
  await db.query(`update books set is_completed=true where id=$1`, [book])
  await db.exec(`alter table chapters add column is_published boolean default false`)
  expect(await chapters(true)).toHaveLength(0)
  await db.query(`update chapters set is_published=true where id=$1`, [book])
  expect(await chapters(true)).toHaveLength(1)
  await db.query(
    `insert into youtube_transcripts(id,title,status,source_origin,raw_transcript,searchable,explore_published)values($1,'Private','ready','awm','{}',false,false)`,
    [book],
  )
  await db.query(
    `insert into content_enrichment_examples(grammar_note_id,source_kind,source_id,unit_key,version_hash,source_title,source_url,arabic,highlight,review_status)
  values($1,'transcript',$2,'sentence/0','version','Private','/transcripts/test','لَمْ يَدْعُ.','يَدْعُ','approved')`,
    [note, book],
  )
  async function transcripts() {
    return (
      await db.query<{ result: { examples: unknown[] } }>(
        `select website_read_canonical_grammar($1,false,'transcript') result`,
        [note],
      )
    ).rows[0].result.examples
  }
  expect(await transcripts()).toHaveLength(0)
  await db.query(`update youtube_transcripts set searchable=true where id=$1`, [book])
  expect(await transcripts()).toHaveLength(1)
})
