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
  it('migrates legacy audio and progress without changing paths and isolates languages', async () => {
    await db.exec(readFileSync('supabase/migrations/20261004092444_chapter_audio_languages.sql', 'utf8'))
    const legacy = (await db.query<{language:string;storage_path:string}>('select language,storage_path from book_chapter_audio')).rows[0]
    expect(legacy).toEqual({language:'ar',storage_path:`${chapter}/audio.mp3`})
    await db.query("insert into book_chapter_audio(chapter_id,language,source_type,storage_path) values($1,'en','supabase_storage',$2)",[chapter,`${chapter}/en/audio.m4a`])
    expect((await db.query('select * from book_chapter_audio where chapter_id=$1',[chapter])).rows).toHaveLength(2)
    await expect(db.query("insert into book_chapter_audio(chapter_id,language,source_type,storage_path) values($1,'en','supabase_storage','other.m4a')",[chapter])).rejects.toThrow()
    await db.query("insert into book_audio_progress(user_id,chapter_id,language,position_seconds) values($1,$2,'en',19)",[user,chapter])
    expect((await db.query<{language:string;position_seconds:number}>('select language,position_seconds from book_audio_progress order by language')).rows).toEqual([{language:'ar',position_seconds:42},{language:'en',position_seconds:19}])
    await db.exec('set role authenticated')
    await expect(db.query('select * from book_chapter_audio')).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  })

})
