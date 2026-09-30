// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  'supabase/migrations/20260930132611_add_book_reading_time_and_descriptions.sql',
  'utf8',
)

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create table public.books (
      id uuid primary key,
      title text not null,
      description text
    );
    insert into public.books (id, title, description) values
      ('6e48b69e-68db-4b80-88c5-f38a7a611cd1', 'A Debt of Silence', null),
      ('27a6ba6a-a1e3-4584-bdde-49842be91ea3', 'Small Plans, Busy Days', 'Keep this description'),
      ('534cf977-42a7-4989-914b-2f58395779c4', 'The Prisoner''s Proof', null);
  `)
  await db.exec(migration)
})

afterAll(async () => {
  await db?.close()
})

describe('book reading-time migration', () => {
  it('adds a nullable positive duration and is rerunnable', async () => {
    await db.exec(migration)
    await db.exec("update public.books set reading_time_minutes = 85 where title = 'A Debt of Silence'")
    const result = await db.query<{ reading_time_minutes: number }>(
      "select reading_time_minutes from public.books where title = 'A Debt of Silence'",
    )
    expect(result.rows[0].reading_time_minutes).toBe(85)
    await expect(db.exec("update public.books set reading_time_minutes = 0 where title = 'A Debt of Silence'"))
      .rejects.toThrow()
  })

  it('fills only blank descriptions', async () => {
    const result = await db.query<{ title: string; description: string | null }>(
      'select title, description from public.books order by title',
    )
    expect(result.rows.find((book) => book.title === 'A Debt of Silence')?.description)
      .toContain('Al-Marsa Al-Abyad')
    expect(result.rows.find((book) => book.title === 'Small Plans, Busy Days')?.description)
      .toBe('Keep this description')
    expect(result.rows.find((book) => book.title === "The Prisoner's Proof")?.description)
      .toContain('Daniel Mercer')
  })
})
