// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
    create table public.vocabulary(level text, theme text);
    create table public.learning_profiles(user_id uuid);
    create table public.my_list(user_id uuid);
    create function public.get_vocab_level_theme_stats() returns table(level text, theme text, word_count bigint) language sql stable as $$select level, theme, count(*) from public.vocabulary group by level, theme$$;
    create function public.bump_content_version() returns trigger language plpgsql security definer as $$begin return null; end$$;
    create function public.rls_auto_enable() returns event_trigger language plpgsql security definer as $$begin null; end$$;
    create function public.search_transcript_word(text, bigint, integer, integer) returns jsonb language sql security definer set search_path = '' as $$select null::jsonb$$;
    create function public.transcript_for_you_groups(text, bigint[], uuid[], integer, uuid[]) returns jsonb language sql security definer set search_path = '' as $$select null::jsonb$$;
    create function public.transcript_for_you_groups_list() returns jsonb language sql security definer set search_path = '' as $$select null::jsonb$$;
    create policy "Users can read their learning profile" on public.learning_profiles for select to public using (auth.uid() = user_id);
    create policy "my_list_select_own" on public.my_list for select to authenticated using (auth.uid() = user_id);
    create policy "my_list_insert_own" on public.my_list for insert to authenticated with check (auth.uid() = user_id);
    create policy "my_list_delete_own" on public.my_list for delete to authenticated using (auth.uid() = user_id);
  `)
  await db.exec(readFileSync('supabase/migrations/20261110142836_launch_security_hardening.sql', 'utf8'))
}, 30000)

afterAll(async () => { await db?.close() })

it('removes public execution from trigger-only privileged functions', async () => {
  for (const fn of ['public.bump_content_version()', 'public.rls_auto_enable()']) {
    for (const role of ['anon', 'authenticated']) {
      const result = await db.query<{ allowed: boolean }>('select has_function_privilege($1, $2, $3) allowed', [role, fn, 'execute'])
      expect(result.rows[0].allowed).toBe(false)
    }
  }
})

it('pins the flagged search path and bounds public RPC execution time', async () => {
  const result = await db.query<{ name: string; config: string[] | null }>(`
    select p.proname name, p.proconfig config from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('get_vocab_level_theme_stats', 'search_transcript_word', 'transcript_for_you_groups', 'transcript_for_you_groups_list')
    order by p.proname
  `)
  const config = new Map(result.rows.map(row => [row.name, row.config?.join(',') ?? '']))
  expect(config.get('get_vocab_level_theme_stats')).toContain('search_path=public')
  expect(config.get('search_transcript_word')).toContain('statement_timeout=6s')
  expect(config.get('transcript_for_you_groups')).toContain('statement_timeout=8s')
  expect(config.get('transcript_for_you_groups_list')).toContain('statement_timeout=5s')
})

it('evaluates Auth once per policy without changing ownership predicates', async () => {
  const result = await db.query<{ policyname: string; expression: string }>(`
    select policyname, coalesce(qual, with_check) expression from pg_policies
    where schemaname = 'public' and tablename in ('learning_profiles', 'my_list') order by policyname
  `)
  expect(result.rows).toHaveLength(4)
  for (const policy of result.rows) {
    expect(policy.expression).toContain('SELECT auth.uid()')
    expect(policy.expression).toContain('user_id')
  }
})
