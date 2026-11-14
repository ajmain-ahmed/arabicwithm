import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

export async function enrichmentDatabase() {
  const db = new PGlite()
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema private;
   create table books(id uuid primary key,title text,slug text,level text);
   create table shows(id uuid primary key,title text,slug text,level text);
   create table chapters(id uuid primary key default gen_random_uuid(),book_id uuid,title text,slug text,content jsonb);
   create table episodes(id uuid primary key default gen_random_uuid(),show_id uuid,title text,slug text,level text,transcript jsonb);
   create table youtube_transcripts(id uuid primary key default gen_random_uuid(),title text,status text,source_origin text,raw_transcript jsonb,canonical_transcript jsonb,canonical_url text);
   create table transcript_segments(id bigint generated always as identity primary key,transcript_id uuid,position integer,start_seconds numeric,original_text text,english_text text,canonical_paragraph jsonb);
   create table vocabulary(word_id bigint primary key,word_di text,word_tr text,level text,definitions jsonb,examples jsonb);
   create table phrases(id bigint generated always as identity primary key,phrase_ar_di text not null unique,phrase_tr text,english text not null,cefr text,notes text,created_at timestamptz default now(),updated_at timestamptz default now());`)
  await db.exec(
    readFileSync('supabase/migrations/20261114135900_transcript_worker_auth_baseline.sql', 'utf8'),
  )
  await db.exec(readFileSync('supabase/migrations/20261114140000_content_enrichment.sql', 'utf8'))
  return db
}
