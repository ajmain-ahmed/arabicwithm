// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

let db: PGlite
const chapter = '11111111-1111-4111-8111-111111111111'
const user = '22222222-2222-4222-8222-222222222222'

describe('audiobook migration', () => {
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
      create table auth.users(id uuid primary key);
      create table public.chapters(id uuid primary key);
      insert into auth.users values ('${user}');
      insert into public.chapters values ('${chapter}');`)
    await db.exec(readFileSync('supabase/migrations/20260930152212_chapter_audiobooks.sql', 'utf8'))
  })
  afterAll(async () => { await db?.close() })

  it('allows one valid source per chapter and rejects ambiguous records', async () => {
    await db.query("insert into book_chapter_audio(chapter_id,source_type,storage_path) values($1,'supabase_storage',$2)", [chapter, `${chapter}/audio.mp3`])
    await expect(db.query("insert into book_chapter_audio(chapter_id,source_type,external_video_id) values($1,'youtube','abcdefghijk')", [chapter])).rejects.toThrow()
    const secondChapter = '33333333-3333-4333-8333-333333333333'
    await db.query('insert into chapters values ($1)', [secondChapter])
    await expect(db.query("insert into book_chapter_audio(chapter_id,source_type,storage_path,external_video_id) values($1,'youtube','file.mp3','abcdefghijk')", [secondChapter])).rejects.toThrow()
  })

  it('stores audio progress separately and blocks direct authenticated reads', async () => {
    await db.query('insert into book_audio_progress(user_id,chapter_id,position_seconds) values($1,$2,42)', [user, chapter])
    expect((await db.query<{ position_seconds: number }>('select position_seconds from book_audio_progress')).rows[0].position_seconds).toBe(42)
    await db.exec('set role authenticated')
    await expect(db.query('select * from book_chapter_audio')).rejects.toThrow(/permission denied/)
    await expect(db.query('select * from book_audio_progress')).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  })
})
