-- Export of the existing live worker verifier used by the enrichment dispatch.
-- Existing installations keep their verifier and its permissions unchanged.
-- A fresh installation needs the transcript worker settings before activation.
do $baseline$
begin
 if to_regprocedure('public.transcript_worker_authorised(text)') is null then
  if to_regclass('transcript_private.settings') is null then
   execute $definition$create function public.transcript_worker_authorised(p_token text) returns boolean language sql security definer set search_path='' as 'select false'$definition$;
  else
   execute $definition$create function public.transcript_worker_authorised(p_token text) returns boolean language sql security definer set search_path='' as 'select p_token = worker_token from transcript_private.settings where singleton'$definition$;
  end if;
  revoke all on function public.transcript_worker_authorised(text) from public,anon,authenticated;
  grant execute on function public.transcript_worker_authorised(text) to service_role;
 end if;
end $baseline$;
