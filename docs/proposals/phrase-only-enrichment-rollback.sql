-- Rollback proposal only: restore the exact production function definitions captured 2026-11-24.
-- Not executed. Requires explicit approval; no content rollback is needed.
begin;
CREATE OR REPLACE FUNCTION public.website_claim_enrichment()
 RETURNS SETOF content_enrichment_jobs
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with selected as (
  select id from public.content_enrichment_jobs where next_attempt_at<=now() and
  (status='queued' or (status='processing' and lease_until<now())) order by priority,next_attempt_at,
  created_at
  for update skip locked limit 1
) update public.content_enrichment_jobs j set status='processing',lease_id=gen_random_uuid(),
  lease_until=now()+interval '90 seconds',attempts=attempts+1,updated_at=now()
  from selected s where j.id=s.id returning j.*;
$function$
;
CREATE OR REPLACE FUNCTION public.website_queue_enrichment(p_kind text, p_id text, p_force boolean DEFAULT false, p_priority smallint DEFAULT 0)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare source record;
  count_rows integer;
begin
  select * into source from private.enrichment_source_versions where source_kind=p_kind and source_id=p_id;
  if not found then
    update public.content_enrichment_examples set active=false
    where source_kind=p_kind and source_id=p_id;
    delete from public.content_enrichment_jobs where source_kind=p_kind and source_id=p_id;
    return 0;
  end if;
  insert into public.content_enrichment_jobs(source_kind,source_id,source_title,priority,analyser,
  version_hash)
  select p_kind,p_id,source.source_title,p_priority,a,source.version_hash from unnest(array['phrases',
  'grammar'])a
  on conflict(source_kind,source_id,analyser) do update set version_hash=excluded.version_hash,
  source_title=excluded.source_title,priority=excluded.priority,run_id=gen_random_uuid(),status='queued',
  cursor=0,attempts=0,
  lease_id=null,lease_until=null,error_code=null,next_attempt_at=now(),updated_at=now()
  where content_enrichment_jobs.version_hash is distinct from excluded.version_hash or p_force or content_enrichment_jobs.status in('failed', 'warnings');
  get diagnostics count_rows=row_count;
  update public.content_enrichment_examples set active=false where source_kind=p_kind and source_id=p_id and version_hash<>source.version_hash;
  return count_rows;
end $function$
;
commit;

