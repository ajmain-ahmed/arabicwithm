// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { enrichmentDatabase } from '@/supabase/tests/helpers/enrichment'

let db: PGlite
const parent = '11111111-1111-4111-8111-111111111111'
const chapter = '22222222-2222-4222-8222-222222222222'
const episode = '33333333-3333-4333-8333-333333333333'
const transcript = '44444444-4444-4444-8444-444444444444'
const proposal = readFileSync('docs/proposals/phrase-only-enrichment.sql', 'utf8')
const content = JSON.stringify([{ arabic: 'عَلَى الْفَوْرِ', translation: 'immediately' }])

beforeEach(async () => {
  db = await enrichmentDatabase()
  await db.query('insert into books values($1,$2,$3,$4)', [parent, 'Book', 'book', 'B1'])
  await db.query('insert into shows values($1,$2,$3,$4)', [parent, 'Show', 'show', 'B1'])
})
afterEach(async () => { await db.close() })

it('queues only Phrases for new chapters, Episodes and ready transcripts', async () => {
  await db.exec(proposal)
  await db.query('insert into chapters(id,book_id,content) values($1,$2,$3)', [chapter, parent, content])
  await db.query('insert into episodes(id,show_id,transcript) values($1,$2,$3)', [episode, parent, content])
  await db.query(`insert into youtube_transcripts(id,status,source_origin,raw_transcript)
    values($1,'ready','website_admin_transcript',$2)`, [transcript, content])
  const { rows } = await db.query('select source_kind,analyser from content_enrichment_jobs order by source_kind')
  expect(rows).toEqual([
    { source_kind: 'chapter', analyser: 'phrases' },
    { source_kind: 'episode', analyser: 'phrases' },
    { source_kind: 'transcript', analyser: 'phrases' },
  ])
})

it('preserves historical Grammar jobs and claims only Phrases; requeue is idempotent and retryable', async () => {
  // The old function is deliberately active while creating historical fixtures.
  await db.query('insert into chapters(id,book_id,content) values($1,$2,$3)', [chapter, parent, content])
  const history = (await db.query(`select * from content_enrichment_jobs where analyser='grammar'`)).rows
  expect(history).toHaveLength(1)
  await db.exec(proposal)
  expect((await db.query('select website_queue_enrichment($1,$2) result', ['chapter', chapter])).rows).toEqual([{ result: 0 }])
  expect((await db.query('select analyser from website_claim_enrichment()')).rows).toEqual([{ analyser: 'phrases' }])
  expect((await db.query('select * from website_claim_enrichment()')).rows).toEqual([])
  await db.query(`update content_enrichment_jobs set status='failed' where analyser='phrases'`)
  expect((await db.query('select website_queue_enrichment($1,$2) result', ['chapter', chapter])).rows).toEqual([{ result: 1 }])
  await db.query('update chapters set content=$1 where id=$2', [JSON.stringify([{ arabic: 'لَا بَأْسَ', translation: 'no problem' }]), chapter])
  expect((await db.query(`select * from content_enrichment_jobs where analyser='grammar'`)).rows).toEqual(history)
  expect((await db.query('select website_queue_enrichment($1,$2) result', ['chapter', 'missing-source'])).rows).toEqual([{ result: 0 }])
  expect((await db.query('select count(*)::int count from content_enrichment_jobs')).rows).toEqual([{ count: 2 }])
})

it('preserves the existing source-save exception boundary when enqueue fails', async () => {
  await db.exec(proposal)
  await db.exec(`create or replace function public.website_queue_enrichment(
    p_kind text,p_id text,p_force boolean default false,p_priority smallint default 0)
    returns integer language plpgsql set search_path='' as $$
    begin raise exception 'synthetic enqueue outage'; end $$;`)
  await db.query('insert into chapters(id,book_id,content) values($1,$2,$3)', [chapter, parent, content])
  expect((await db.query('select content from chapters where id=$1', [chapter])).rows).toEqual([{ content: JSON.parse(content) }])
})
