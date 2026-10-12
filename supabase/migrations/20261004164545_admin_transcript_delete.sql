-- Standalone and idempotent: also works before website generation is enabled.
create or replace function public.admin_delete_youtube_transcript(p_actor uuid,p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden'; end if;
  -- FK cascades remove segments, tokens, translations, guest capabilities and
  -- user-library associations. Shared episodes and dictionary data stay intact.
  delete from public.youtube_transcripts where id=p_id;
  return found;
end $$;
revoke all on function public.admin_delete_youtube_transcript(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_delete_youtube_transcript(uuid,uuid) to service_role;
