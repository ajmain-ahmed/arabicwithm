// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { enrichmentDatabase } from './helpers/enrichment'
let db: PGlite
const source = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const third = '33333333-3333-4333-8333-333333333333'
beforeAll(async () => {
  db = await enrichmentDatabase()
}, 30000)
afterAll(() => db?.close())
async function claim(analyser: string, id = source) {
  await db.query(`update content_enrichment_jobs set next_attempt_at=now()+interval '1 day'`)
  await db.query(
    `update content_enrichment_jobs set next_attempt_at=now()-interval '1 second' where source_id=$1 and analyser=$2`,
    [id, analyser],
  )
  return (
    await db.query<{ id: string; lease_id: string }>(`select * from website_claim_enrichment()`)
  ).rows[0]
}
const phrase = {
  arabic: 'عَلَى الْفَوْرِ',
  transliteration: 'ʿalā l-fawr',
  english: 'immediately',
  confidence: 0.99,
  evidence: 'Known fixed expression',
  unitKey: 'sentence/0',
  sourceArabic: 'عُدْ عَلَى الْفَوْرِ.',
  sourceEnglish: 'Return immediately.',
  sourceTitle: 'First chapter',
  sourceUrl: '/books/book/one',
  highlight: 'عَلَى الْفَوْرِ',
}
const grammar = {
  ruleKey: 'weak-final-jussive',
  titleEn: 'Jussive weak-final imperfect verbs',
  titleAr: 'جَزْمُ الْمُعْتَلِّ الْآخِرِ',
  cefr: 'B2',
  category: 'sarf',
  explanation: 'After لَمْ, the verb is jussive (مَجْزُومٌ), and its final weak letter disappears.',
  detail: '',
  confidence: 0.95,
  unitKey: 'sentence/0',
  sourceArabic: 'لَمْ يَدْعُ الْإِمَامُ.',
  sourceEnglish: 'The imam did not call.',
  sourceTitle: 'First chapter',
  sourceUrl: '/books/book/one',
  highlight: 'لَمْ يَدْعُ',
}
async function commit(job: { id: string; lease_id: string }, items: unknown[], done = true) {
  return (
    await db.query(`select website_commit_enrichment($1,$2,1,$3,$4::jsonb) ok`, [
      job.id,
      job.lease_id,
      done,
      JSON.stringify(items),
    ])
  ).rows[0]
}
it('queues both analysers only for persisted, eligible sources and excludes personal imports', async () => {
  await db.query(`insert into chapters(id,title,content)values($1,'First','[]')`, [source])
  await db.query(`insert into episodes(id,title,transcript)values($1,'Episode','[]')`, [second])
  await db.query(
    `insert into youtube_transcripts(id,status,source_origin,raw_transcript)values($1,'ready','website_admin_transcript','{}'),($2,'ready','user_import','{}')`,
    [third, '44444444-4444-4444-8444-444444444444'],
  )
  expect(
    (await db.query(`select count(*)::int total from content_enrichment_jobs`)).rows[0],
  ).toEqual({ total: 6 })
  await expect(
    db.query(`insert into chapters(id,title,content)values($1,'Duplicate','[]')`, [source]),
  ).rejects.toThrow()
  expect(
    (await db.query(`select count(*)::int total from content_enrichment_jobs`)).rows[0],
  ).toEqual({ total: 6 })
})
it('deduplicates diacritics, punctuation, Unicode and concurrent source occurrences while preserving curated meanings', async () => {
  await db.query(`select website_write_phrase(null,$1::jsonb)`, [
    JSON.stringify({
      phrase_ar_di: 'على الفور',
      phrase_tr: 'manual',
      english: 'Curated meaning',
      notes: 'Manual note',
    }),
  ])
  for (const id of [source, second, third]) await commit(await claim('phrases', id), [phrase])
  expect((await db.query(`select phrase_ar_di,phrase_tr,english,notes from phrases`)).rows).toEqual(
    [
      {
        phrase_ar_di: 'على الفور',
        phrase_tr: 'manual',
        english: 'Curated meaning',
        notes: 'Manual note',
      },
    ],
  )
  expect(
    (
      await db.query(
        `select count(*)::int total from content_enrichment_examples where phrase_id is not null`,
      )
    ).rows[0],
  ).toEqual({ total: 3 })
  await db.query(`select website_queue_enrichment('chapter',$1,true)`, [source])
  await commit(await claim('phrases'), [phrase])
  expect(
    (
      await db.query(
        `select count(*)::int total from content_enrichment_examples where phrase_id is not null`,
      )
    ).rows[0],
  ).toEqual({ total: 3 })
})
it('clusters one grammar rule across sources and keeps approved manual edits on reprocessing', async () => {
  for (const id of [source, second, third]) await commit(await claim('grammar', id), [grammar])
  expect((await db.query(`select count(*)::int total from grammar_notes`)).rows[0]).toEqual({
    total: 1,
  })
  const note = (await db.query<{ id: string }>(`select id from grammar_notes`)).rows[0]
  await db.query(`select website_admin_grammar('edit',$1,$2::jsonb)`, [
    note.id,
    JSON.stringify({
      status: 'approved',
      explanation: 'A manually improved explanation for learners.',
    }),
  ])
  await db.query(`select website_queue_enrichment('chapter',$1,true)`, [source])
  await commit(await claim('grammar'), [grammar])
  expect((await db.query(`select status,explanation from grammar_notes`)).rows[0]).toEqual({
    status: 'approved',
    explanation: 'A manually improved explanation for learners.',
  })
  expect(
    (
      await db.query(
        `select count(*)::int total from content_enrichment_examples where grammar_note_id is not null`,
      )
    ).rows[0],
  ).toEqual({ total: 3 })
})
it('reviews each example independently and returns changed examples to Candidates', async () => {
  const note = (await db.query<{ id: string }>(`select id from grammar_notes`)).rows[0]
  const examples = (
    await db.query<{ id: string; source_id: string }>(
      `select id,source_id from content_enrichment_examples where grammar_note_id=$1 order by source_id`,
      [note.id],
    )
  ).rows
  await db.query(`select website_admin_grammar('edit',$1,$2::jsonb)`, [
    note.id,
    JSON.stringify({ status: 'approved', reviewed_examples: [examples[0].id] }),
  ])
  expect(
    (
      await db.query(`select review_status from content_enrichment_examples where id=$1`, [
        examples[0].id,
      ])
    ).rows[0],
  ).toEqual({ review_status: 'approved' })
  expect(
    (
      await db.query(`select review_status from content_enrichment_examples where id=$1`, [
        examples[1].id,
      ])
    ).rows[0],
  ).toEqual({ review_status: 'candidate' })
  await db.query(`select website_queue_enrichment('chapter',$1,true)`, [source])
  await commit(await claim('grammar'), [grammar])
  expect(
    (
      await db.query(`select review_status from content_enrichment_examples where id=$1`, [
        examples[0].id,
      ])
    ).rows[0],
  ).toEqual({ review_status: 'approved' })
  await db.query(`select website_queue_enrichment('chapter',$1,true)`, [source])
  await commit(await claim('grammar'), [
    { ...grammar, sourceEnglish: 'An updated authored translation.' },
  ])
  expect(
    (
      await db.query(`select review_status from content_enrichment_examples where id=$1`, [
        examples[0].id,
      ])
    ).rows[0],
  ).toEqual({ review_status: 'candidate' })
  const dashboard = (
    await db.query<{ result: { notes: { id: string; pending_examples: number }[] } }>(
      `select website_admin_grammar('list',null,'{}','{"status":"candidate"}') result`,
    )
  ).rows[0].result
  expect(dashboard.notes.find((value) => value.id === note.id)?.pending_examples).toBe(3)
  await db.query(`select website_admin_grammar('example_status',$1,'{"status":"rejected"}')`, [
    examples[0].id,
  ])
  expect(
    (
      await db.query(`select review_status from content_enrichment_examples where id=$1`, [
        examples[0].id,
      ])
    ).rows[0],
  ).toEqual({ review_status: 'rejected' })
})
it('rejects stale leases and source versions before privileged writes', async () => {
  await db.query(`select website_queue_enrichment('chapter',$1,true)`, [source])
  const job = await claim('phrases')
  await db.query(`update chapters set content='[{"arabic":"نَصٌّ جَدِيدٌ"}]' where id=$1`, [source])
  expect(await commit(job, [{ ...phrase, arabic: 'عبارة جديدة', english: 'New phrase' }])).toEqual({
    ok: false,
  })
  expect((await db.query(`select count(*)::int total from phrases`)).rows[0]).toEqual({ total: 1 })
})
it('retires removed occurrences on a successful new run and preserves curated library rows', async () => {
  await commit(await claim('phrases'), [])
  expect(
    (
      await db.query(
        `select count(*)::int total from content_enrichment_examples where source_id=$1 and phrase_id is not null and active`,
        [source],
      )
    ).rows[0],
  ).toEqual({ total: 0 })
  expect((await db.query(`select count(*)::int total from phrases`)).rows[0]).toEqual({ total: 1 })
})
it('isolates enqueue failure from the core content save and recovers via incremental scan', async () => {
  const saved = (
    await db.query<{ definition: string }>(
      `select pg_get_functiondef('website_queue_enrichment(text,text,boolean,smallint)'::regprocedure) definition`,
    )
  ).rows[0].definition
  await db.exec(
    `create or replace function website_queue_enrichment(p_kind text,p_id text,p_force boolean default false,p_priority smallint default 0)returns integer language plpgsql as $$begin raise exception 'Simulated outage';end$$`,
  )
  const id = '55555555-5555-4555-8555-555555555555'
  await db.query(`insert into chapters(id,title,content)values($1,'Saved despite outage','[]')`, [
    id,
  ])
  expect((await db.query(`select title from chapters where id=$1`, [id])).rows).toHaveLength(1)
  await db.exec(saved)
  await db.query(`select website_scan_enrichment('new')`)
  expect(
    (
      await db.query(`select count(*)::int total from content_enrichment_jobs where source_id=$1`, [
        id,
      ])
    ).rows[0],
  ).toEqual({ total: 2 })
})
it('denies ordinary roles every new table and privileged write function', async () => {
  for (const role of ['anon', 'authenticated']) {
    expect(
      (
        await db.query(
          `select has_function_privilege($1,'website_commit_enrichment(uuid,uuid,integer,boolean,jsonb,text)','execute') allowed`,
          [role],
        )
      ).rows[0],
    ).toEqual({ allowed: false })
    expect(
      (await db.query(`select has_table_privilege($1,'grammar_notes','select') allowed`, [role]))
        .rows[0],
    ).toEqual({ allowed: false })
  }
})
it('gives new saves priority over a backfill and serializes identical model requests', async () => {
  await db.query(`select website_scan_enrichment('all')`)
  const fresh = '66666666-6666-4666-8666-666666666666'
  await db.query(`insert into chapters(id,title,content)values($1,'New content','[]')`, [fresh])
  const job = (
    await db.query<{ source_id: string; priority: number }>(
      `select * from website_claim_enrichment()`,
    )
  ).rows[0]
  expect(job.source_id).toBe(fresh)
  expect(job.priority).toBe(0)
  const first = (
    await db.query<{ lease: string }>(`select website_claim_enrichment_analysis('same-text') lease`)
  ).rows[0].lease
  expect(first).toBeTruthy()
  expect(
    (await db.query(`select website_claim_enrichment_analysis('same-text') lease`)).rows[0],
  ).toEqual({ lease: null })
  await db.query(`select website_enrichment_cache('same-text','{"notes":[]}'::jsonb,$1)`, [first])
  expect((await db.query(`select website_enrichment_cache('same-text') cached`)).rows[0]).toEqual({
    cached: { notes: [] },
  })
})
it('merges duplicate rules, preserves approval and redirects future occurrences through the retained alias', async () => {
  const target = (
    await db.query<{ id: string }>(
      `select id from grammar_notes where rule_key='weak-final-jussive'`,
    )
  ).rows[0].id
  await db.query(`select website_queue_enrichment('transcript',$1,true)`, [third])
  const other = { ...grammar, ruleKey: 'jussive-alias' }
  await commit(await claim('grammar', third), [other])
  const origin = (
    await db.query<{ id: string }>(`select id from grammar_notes where rule_key='jussive-alias'`)
  ).rows[0].id
  await db.query(`select website_admin_grammar('merge',$1,$2::jsonb)`, [
    origin,
    JSON.stringify({ target }),
  ])
  expect(
    (await db.query(`select status,merged_into from grammar_notes where id=$1`, [origin])).rows[0],
  ).toEqual({ status: 'rejected', merged_into: target })
  await db.query(`select website_queue_enrichment('transcript',$1,true)`, [third])
  await commit(await claim('grammar', third), [other])
  expect(
    (
      await db.query(
        `select count(*)::int total from content_enrichment_examples where grammar_note_id=$1 and source_id=$2`,
        [target, third],
      )
    ).rows[0],
  ).toEqual({ total: 1 })
  expect(
    (await db.query(`select status from grammar_notes where id=$1`, [target])).rows[0],
  ).toEqual({ status: 'approved' })
})
it('retires deleted source examples without deleting curated library entries', async () => {
  await db.query(`delete from episodes where id=$1`, [second])
  expect(
    (
      await db.query(
        `select count(*)::int total from content_enrichment_examples where source_id=$1 and active`,
        [second],
      )
    ).rows[0],
  ).toEqual({ total: 0 })
  expect((await db.query(`select count(*)::int total from phrases`)).rows[0]).toEqual({ total: 1 })
  expect(
    (await db.query(`select count(*)::int total from grammar_notes where status='approved'`))
      .rows[0],
  ).toEqual({ total: 1 })
})
it('retires occurrences and pending jobs when a transcript loses canonical eligibility', async () => {
  const id = '77777777-7777-4777-8777-777777777777'
  await db.query(
    `insert into youtube_transcripts(id,status,source_origin,raw_transcript)values($1,'ready','website_admin_transcript','{}')`,
    [id],
  )
  await commit(await claim('phrases', id), [phrase])
  await db.query(`update youtube_transcripts set source_origin='user_import' where id=$1`, [id])
  expect(
    (
      await db.query(`select count(*)::int total from content_enrichment_jobs where source_id=$1`, [
        id,
      ])
    ).rows[0],
  ).toEqual({ total: 0 })
  expect(
    (await db.query(`select active from content_enrichment_examples where source_id=$1`, [id]))
      .rows[0],
  ).toEqual({ active: false })
  expect((await db.query(`select count(*)::int total from phrases`)).rows[0]).toEqual({ total: 1 })
})
