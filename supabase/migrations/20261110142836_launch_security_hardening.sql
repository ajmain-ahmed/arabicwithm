revoke execute on function public.bump_content_version() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.get_vocab_level_theme_stats() set search_path = public;

alter function public.search_transcript_word(text, bigint, integer, integer) set statement_timeout = '6s';
alter function public.transcript_for_you_groups(text, bigint[], uuid[], integer, uuid[]) set statement_timeout = '8s';
alter function public.transcript_for_you_groups_list() set statement_timeout = '5s';

drop policy if exists "Users can read their learning profile" on public.learning_profiles;
create policy "Users can read their learning profile"
  on public.learning_profiles for select
  to public
  using ((select auth.uid()) = user_id);

drop policy if exists "my_list_select_own" on public.my_list;
create policy "my_list_select_own" on public.my_list
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "my_list_insert_own" on public.my_list;
create policy "my_list_insert_own" on public.my_list
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "my_list_delete_own" on public.my_list;
create policy "my_list_delete_own" on public.my_list
  for delete to authenticated using ((select auth.uid()) = user_id);
