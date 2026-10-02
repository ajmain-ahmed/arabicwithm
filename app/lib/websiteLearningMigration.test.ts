// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const id = '11111111-1111-4111-8111-111111111111'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table learning_activity_daily(user_id uuid,activity_date date,active_seconds bigint,reading_seconds bigint,video_seconds bigint,word_lookups integer);
    create table memory_reviews(user_id uuid,activity_date date,xp integer);
    create table word_search_completions(user_id uuid,activity_date date,xp_earned integer);
    grant select on learning_activity_daily,memory_reviews,word_search_completions to service_role;
    insert into learning_activity_daily select '${id}',date '2025-01-01'+i,60,30,30,1 from generate_series(0,404)i;
    insert into memory_reviews values('${id}','2026-10-02',5),('${id}','2026-10-02',0),('${id}','2026-09-01',10);
    insert into word_search_completions values('${id}','2026-10-02',30);`)
  await db.exec(readFileSync('supabase/migrations/20261002173850_website_learning_dashboard.sql','utf8'))
}, 30000)
afterAll(async () => { await db?.close() })
it('aggregates all lifetime records while bounding the daily chart response', async () => {
  const { rows } = await db.query<{r:{totals:{readingSeconds:number;wordLookups:number};daily:{date:string;xp:number;memoryCards:number}[];activeDates:string[]}}>('select website_learning_history($1) r',[id])
  expect(rows[0].r.totals).toMatchObject({ readingSeconds: 405*30, wordLookups: 405 })
  expect(rows[0].r.daily).toHaveLength(400);expect(rows[0].r.activeDates).toHaveLength(405)
  expect(rows[0].r.daily.at(-1)).toMatchObject({ date:'2026-10-02',xp:35,memoryCards:2 })
  expect((await db.query<{r:{cards:number;xp:number}}>('select website_memory_totals($1,$2) r',[id,'2026-09-28'])).rows[0].r).toEqual({cards:2,xp:5})
})
it('denies direct client access and works for the website service without a user JWT', async () => {
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`)
    await expect(db.query('select website_learning_history($1)',[id])).rejects.toThrow(/permission denied/)
    await expect(db.query('select website_memory_totals($1)',[id])).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  }
  await db.exec('set role service_role')
  expect((await db.query<{r:{cards:number;xp:number}}>('select website_memory_totals($1) r',[id])).rows[0].r).toEqual({cards:3,xp:15})
  await db.exec('reset role')
})
