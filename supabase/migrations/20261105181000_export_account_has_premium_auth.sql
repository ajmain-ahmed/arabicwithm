-- Export of functions that exist only in the live DB (auth-gated wrapper
-- around private.has_premium), per AGENTS.md: export live-only RPCs into
-- migrations before modifying around them. Definitions captured from the
-- live database on 2026-11-05; behaviour unchanged.
create or replace function private.account_has_premium_for_caller(p_user_id uuid)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
 if auth.role()='service_role' then return private.has_premium(p_user_id); end if;
 if auth.uid() is null or p_user_id is distinct from auth.uid() then raise exception 'Not authorised'; end if;
 return private.has_premium(auth.uid());
end; $function$;
revoke all on function private.account_has_premium_for_caller(uuid) from public,anon,authenticated;
grant execute on function private.account_has_premium_for_caller(uuid) to service_role;

create or replace function public.account_has_premium(p_user_id uuid)
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$ select private.account_has_premium_for_caller(p_user_id); $function$;
revoke all on function public.account_has_premium(uuid) from public,anon,authenticated;
grant execute on function public.account_has_premium(uuid) to service_role;
notify pgrst,'reload schema';
