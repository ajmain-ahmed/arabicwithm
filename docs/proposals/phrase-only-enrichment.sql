-- PROPOSAL ONLY. NOT EXECUTED. Requires the user's explicit Part H approval.
-- Existing production project: whbxgwucsoguqzpnpzjd.
-- Replace two existing function bodies; preserve signatures, grants, tables,
-- source content, Phrase rows, Grammar rows, and historical jobs.
-- Do not edit an applied historical migration to make this change.

begin;

create or replace function public.website_queue_enrichment(
  p_kind text,
  p_id text,
  p_force boolean default false,
  p_priority smallint default 0
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  source record;
  count_rows integer;
begin
  select * into source
  from private.enrichment_source_versions
  where source_kind = p_kind and source_id = p_id;

  -- A missing/ineligible source must not delete jobs or change Grammar history.
  if not found then
    return 0;
  end if;

  insert into public.content_enrichment_jobs (
    source_kind, source_id, source_title, priority, analyser, version_hash
  )
  values (
    p_kind, p_id, source.source_title, p_priority, 'phrases', source.version_hash
  )
  on conflict (source_kind, source_id, analyser) do update
  set version_hash = excluded.version_hash,
      source_title = excluded.source_title,
      priority = excluded.priority,
      run_id = gen_random_uuid(),
      status = 'queued',
      cursor = 0,
      attempts = 0,
      lease_id = null,
      lease_until = null,
      error_code = null,
      next_attempt_at = now(),
      updated_at = now()
  where content_enrichment_jobs.version_hash is distinct from excluded.version_hash
     or p_force
     or content_enrichment_jobs.status in ('failed', 'warnings');

  get diagnostics count_rows = row_count;

  -- Preserve Grammar examples. Only superseded Phrase occurrences go inactive.
  update public.content_enrichment_examples
  set active = false
  where source_kind = p_kind
    and source_id = p_id
    and phrase_id is not null
    and version_hash <> source.version_hash;

  return count_rows;
end;
$function$;

create or replace function public.website_claim_enrichment()
returns setof public.content_enrichment_jobs
language sql
security invoker
set search_path = ''
as $function$
  with selected as (
    select id
    from public.content_enrichment_jobs
    where analyser = 'phrases'
      and next_attempt_at <= now()
      and (
        status = 'queued'
        or (status = 'processing' and lease_until < now())
      )
    order by priority, next_attempt_at, created_at
    for update skip locked
    limit 1
  )
  update public.content_enrichment_jobs j
  set status = 'processing',
      lease_id = gen_random_uuid(),
      lease_until = now() + interval '90 seconds',
      attempts = attempts + 1,
      updated_at = now()
  from selected s
  where j.id = s.id
  returning j.*;
$function$;

commit;
