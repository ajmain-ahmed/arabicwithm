// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { PGlite } from '@electric-sql/pglite'
import { enrichmentDatabase } from './helpers/enrichment'
let db: PGlite
beforeAll(async () => {
  db = await enrichmentDatabase()
  await db.exec(readFileSync('supabase/migrations/20261114203000_home_daily_phrase.sql', 'utf8'))
}, 30000)
afterAll(() => db?.close())
async function day(date: string) {
  return (
    await db.query<{ phrase: { id: string; english: string } | null }>(
      'select website_phrase_of_day($1::date) phrase',
      [date],
    )
  ).rows[0].phrase
}
it('hides an empty or malformed library', async () => {
  expect(await day('2026-11-14')).toBeNull()
  await db.exec(
    `insert into phrases(phrase_ar_di,english) values('','test'),('اختبار عبارة','placeholder'),('...','meaning');`,
  )
  expect(await day('2026-11-14')).toBeNull()
})
it('rotates daily, stays stable after additions and follows canonical edits/deletions', async () => {
  await db.exec(
    `insert into phrases(phrase_ar_di,english) values('عَلَى الْفَوْرِ','Immediately'),('كَيْفَ تَجْرُؤُ','How dare you'),('إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ','We belong to God and to Him we return');`,
  )
  const first = (await day('2026-11-14'))!
  expect(await day('2026-11-14')).toEqual(first)
  await db.exec(`insert into phrases(phrase_ar_di,english)values('فِي الْوَاقِعِ','In fact')`)
  expect(await day('2026-11-14')).toEqual(first)
  await db.query('update phrases set english=$1 where id=$2', ['Corrected meaning', first.id])
  expect((await day('2026-11-14'))?.english).toBe('Corrected meaning')
  expect((await day('2026-11-15'))?.id).not.toBe(first.id)
  expect(await day('2026-11-15')).toEqual(await day('2026-11-15'))
  await db.query('delete from phrases where id=$1', [first.id])
  expect((await day('2026-11-14'))?.id).not.toBe(first.id)
})
it('accepts one eligible phrase and keeps privileged writes inaccessible', async () => {
  await db.exec(
    `delete from phrases;insert into phrases(phrase_ar_di,english)values('على الفور','Immediately');`,
  )
  expect((await day('2026-11-16'))?.id).toBe((await day('2026-11-17'))?.id)
  for (const role of ['anon', 'authenticated']) {
    expect(
      (
        await db.query(
          "select has_function_privilege($1,'website_phrase_of_day(date)','execute') allowed",
          [role],
        )
      ).rows[0],
    ).toEqual({ allowed: false })
  }
})
it('preserves stored source glosses through the canonical Phrase writer', async () => {
  const words = [
    { arabic: 'فِي', english: 'in' },
    { arabic: 'الْوَاقِعِ', english: 'reality' },
  ]
  await db.query('select website_write_phrase(null,$1::jsonb)', [
    JSON.stringify({
      phrase_ar_di: 'فِي الْوَاقِعِ',
      english: 'In fact',
      phrase_tr: 'fī l-wāqiʿ',
      word_glosses: words,
    }),
  ])
  expect(
    (await db.query("select word_glosses from phrases where english='In fact'")).rows[0],
  ).toEqual({ word_glosses: words })
})
it('persists enrichment glosses without changing existing curated Phrase content', async () => {
  await db.exec(`insert into chapters(id,title,content)values('99999999-9999-4999-8999-999999999999','Gloss source','[]');
    update content_enrichment_jobs set next_attempt_at=now()+interval '1 day' where analyser='grammar';`)
  const job = (
    await db.query<{ id: string; lease_id: string }>('select * from website_claim_enrichment()')
  ).rows[0]
  const words = [
    { arabic: 'كَيْفَ', english: 'how' },
    { arabic: 'تَجْرُؤُ', english: 'dare you' },
  ]
  const candidate = {
    arabic: 'كَيْفَ تَجْرُؤُ',
    english: 'How dare you',
    transliteration: 'kayfa tajruʾu',
    confidence: 0.99,
    wordGlosses: words,
    unitKey: 'sentence/0',
    sourceArabic: 'كَيْفَ تَجْرُؤُ',
    sourceEnglish: 'How dare you',
    sourceTitle: 'Gloss source',
    sourceUrl: '/books/test/one',
    highlight: 'كَيْفَ تَجْرُؤُ',
  }
  await db.query('select website_commit_enrichment($1,$2,1,true,$3::jsonb)', [
    job.id,
    job.lease_id,
    JSON.stringify([candidate]),
  ])
  expect(
    (await db.query("select word_glosses from phrases where english='How dare you'")).rows[0],
  ).toEqual({ word_glosses: words })
  expect(
    (await db.query("select english from phrases where phrase_ar_di='على الفور'")).rows[0],
  ).toEqual({ english: 'Immediately' })
})
