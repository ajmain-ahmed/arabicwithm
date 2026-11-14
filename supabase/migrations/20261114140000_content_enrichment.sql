begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create table public.grammar_notes (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  title_en text not null,
  title_ar text not null,
  rule_cefr text not null check(rule_cefr in('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  category text not null check(category in('nahw', 'sarf', 'balaghah')),
  explanation text not null,
  detail text not null default '',
  confidence numeric not null check(confidence between 0 and 1),
  status text not null default 'candidate' check(status in('candidate', 'approved', 'rejected')),
  merged_into uuid references public.grammar_notes(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check(source_kind in('chapter', 'episode', 'transcript', 'vocabulary')),
  source_id text not null,
  source_title text not null default '',
  priority smallint not null default 0,
  analyser text not null check(analyser in('phrases', 'grammar')),
  version_hash text not null,
  run_id uuid not null default gen_random_uuid(),
  status text not null default 'queued' check(status in('queued', 'processing', 'completed', 'warnings', 'failed')),
  cursor integer not null default 0,
  attempts integer not null default 0,
  lease_id uuid,
  lease_until timestamptz,
  last_processed_version text,
  error_code text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_kind,
  source_id,
  analyser)
);

create index on public.content_enrichment_jobs(priority,next_attempt_at,created_at) where status in('queued', 'processing');

create table public.content_enrichment_examples (
  id uuid primary key default gen_random_uuid(),
  phrase_id bigint references public.phrases(id) on delete cascade,
  grammar_note_id uuid references public.grammar_notes(id) on delete cascade,
  source_kind text not null,
  source_id text not null,
  unit_key text not null,
  version_hash text not null,
  run_id uuid,
  source_title text not null,
  parent_id text,
  parent_title text,
  source_url text not null,
  original_url text,
  source_timestamp text,
  arabic text not null,
  english text not null default '',
  explanation text not null default '',
  highlight text not null,
  example_cefr text check(example_cefr in('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  active boolean not null default true,
  review_status text not null default 'candidate' check(review_status in('candidate', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((phrase_id is not null)::integer+(grammar_note_id is not null)::integer=1)
);

create unique index on public.content_enrichment_examples(source_kind,source_id,unit_key,phrase_id) where phrase_id is not null;

create unique index on public.content_enrichment_examples(source_kind,source_id,unit_key,grammar_note_id) where grammar_note_id is not null;

create index on public.content_enrichment_examples(grammar_note_id) where active;

create index on public.grammar_notes(status,rule_cefr,category);

create table private.content_enrichment_revisions(source_id uuid primary key,
  revision bigint not null default 0);

create table public.content_enrichment_analysis_cache(analysis_hash text primary key,
  result jsonb,
  lease_id uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now());

  alter table private.content_enrichment_revisions enable row level security;

  alter table public.content_enrichment_analysis_cache enable row level security;

  revoke all on private.content_enrichment_revisions,public.content_enrichment_analysis_cache from public,
  anon,authenticated;

  grant all on private.content_enrichment_revisions,public.content_enrichment_analysis_cache to service_role;

  alter table public.grammar_notes enable row level security;

  alter table public.content_enrichment_jobs enable row level security;

  alter table public.content_enrichment_examples enable row level security;

  revoke all on public.grammar_notes,public.content_enrichment_jobs,public.content_enrichment_examples from public,
  anon,authenticated;

  grant all on public.grammar_notes,public.content_enrichment_jobs,public.content_enrichment_examples to service_role;

  create function private.enrichment_phrase_key(value text) returns text language sql immutable set search_path='' as $$
  select regexp_replace(btrim(regexp_replace(regexp_replace(regexp_replace(normalize(coalesce(value,
  ''),NFKC),'[ؐ-ًؚ-ٰٟۖ-ۭـ]','','g'),'[^[:alnum:][:space:]]',' ','g'),'[[:space:]]+',' ','g')),
  '(^|[[:space:]])و[[:space:]]+(?=[ء-ي])','\1و','g');
$$;

  create index phrases_enrichment_key on public.phrases(private.enrichment_phrase_key(phrase_ar_di));

  create function private.enrichment_phrase_id(value text) returns bigint language plpgsql immutable strict set search_path='' as $$
begin return value::bigint;
  exception when invalid_text_representation or numeric_value_out_of_range then return null;
end $$;
  -- One canonical create/update path keeps existing IDs and curated fields.

  create function public.website_write_phrase(p_id bigint,p_fields jsonb) returns bigint
  language plpgsql security invoker set search_path='' as $$
declare matched bigint;
  normalized text;
  arabic text;
begin
  arabic:=p_fields->>'phrase_ar_di';
  if arabic is not null then
  normalized:=private.enrichment_phrase_key(arabic);
  if normalized='' then raise exception 'Arabic phrase is required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(normalized,0));
  select id into matched from public.phrases where private.enrichment_phrase_key(phrase_ar_di)=normalized order by id limit 1;
  end if;
  if p_id is null then
  if matched is not null then return matched;
  end if;
  if coalesce(p_fields->>'english','')='' or coalesce(p_fields->>'phrase_tr','')='' then raise exception 'Phrase meaning and transliteration are required';
  end if;
  insert into public.phrases(phrase_ar_di,phrase_tr,english,cefr,notes)
  values(arabic,p_fields->>'phrase_tr',p_fields->>'english',p_fields->>'cefr',p_fields->>'notes') returning id into matched;
  return matched;
  end if;
  if matched is not null and matched<>p_id then raise exception 'This phrase already exists';
  end if;
  update public.phrases set phrase_ar_di=coalesce(arabic,phrase_ar_di),phrase_tr=coalesce(p_fields->>'phrase_tr',
  phrase_tr),
  english=coalesce(p_fields->>'english',english),cefr=coalesce(p_fields->>'cefr',cefr),
  notes=case when p_fields?'notes' then p_fields->>'notes' else notes end,updated_at=now() where id=p_id;
  if not found then raise exception 'Phrase not found';
  end if;
  return p_id;
end $$;
  -- These are canonical text containers. Parent Book/Show metadata is not analysed.

  create view private.enrichment_source_versions as
  select 'chapter'::text source_kind,id::text source_id,md5(content::text) version_hash,coalesce(title,
  'Chapter') source_title from public.chapters where content is not null
  union all select 'episode',id::text,md5(transcript::text),coalesce(title,'Episode') from public.episodes where transcript is not null
  union all select 'transcript',t.id::text,md5(jsonb_build_array(t.raw_transcript,t.canonical_transcript,
  coalesce(r.revision,0))::text),coalesce(t.title,'Transcript') from public.youtube_transcripts t left join private.content_enrichment_revisions r on r.source_id=t.id where t.status='ready' and t.source_origin in('awm', 'website_admin_transcript')
  union all select 'vocabulary',word_id::text,md5(jsonb_build_array(word_di,word_tr,definitions,
  examples,level)::text),word_di from public.vocabulary;

  create function public.website_queue_enrichment(p_kind text,p_id text,p_force boolean default false,
  p_priority smallint default 0) returns integer
  language plpgsql security invoker set search_path='' as $$
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
end $$;

  create function private.queue_content_enrichment() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text;
  source_id text;
begin
  kind:=case tg_table_name when 'chapters' then 'chapter' when 'episodes' then 'episode' when 'vocabulary' then 'vocabulary' else 'transcript' end;
  source_id:=case when tg_table_name='vocabulary' then to_jsonb(new)->>'word_id' else to_jsonb(new)->>'id' end;
  perform public.website_queue_enrichment(kind,source_id);
  return new;
  exception when others then
  -- The reconciliation scan can recover a missed job. Source persistence wins.
  raise warning 'Content enrichment enqueue failed for %/%',kind,source_id;
  return new;
end $$;

  create trigger content_enrichment_after_chapter after insert or update of content on public.chapters for each row execute function private.queue_content_enrichment();

  create trigger content_enrichment_after_episode after insert or update of transcript on public.episodes for each row execute function private.queue_content_enrichment();

  create trigger content_enrichment_after_transcript after insert or update of raw_transcript,
  canonical_transcript,status,source_origin on public.youtube_transcripts for each row execute function private.queue_content_enrichment();

  create trigger content_enrichment_after_vocabulary after insert or update of word_di,word_tr,
  definitions,examples,level on public.vocabulary for each row execute function private.queue_content_enrichment();

  create function private.queue_segment_content_enrichment() returns trigger language plpgsql security definer set search_path='' as $$
declare parent uuid;
begin
  parent:=case when tg_op='DELETE' then old.transcript_id else new.transcript_id end;
  insert into private.content_enrichment_revisions(source_id,revision) values(parent,1) on conflict(source_id) do update set revision=content_enrichment_revisions.revision+1;
  perform public.website_queue_enrichment('transcript',parent::text);
  return null;
  exception when others then raise warning 'Segment enrichment enqueue failed';
  return null;
end $$;

  create trigger content_enrichment_after_segment after insert or update of canonical_paragraph,
  original_text,english_text,start_seconds,position or delete on public.transcript_segments for each row execute function private.queue_segment_content_enrichment();

  create function private.retire_content_enrichment() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text;
  source text;
begin
  kind:=case tg_table_name when 'chapters' then 'chapter' when 'episodes' then 'episode' when 'vocabulary' then 'vocabulary' else 'transcript' end;
  source:=case when tg_table_name='vocabulary' then to_jsonb(old)->>'word_id' else to_jsonb(old)->>'id' end;
  update public.content_enrichment_examples set active=false where source_kind=kind and source_id=source;
  delete from public.content_enrichment_jobs where source_kind=kind and source_id=source;
  return old;
  exception when others then raise warning 'Content enrichment retirement failed';
  return old;
end $$;

  create trigger content_enrichment_delete_chapter after delete on public.chapters for each row execute function private.retire_content_enrichment();

  create trigger content_enrichment_delete_episode after delete on public.episodes for each row execute function private.retire_content_enrichment();

  create trigger content_enrichment_delete_transcript after delete on public.youtube_transcripts for each row execute function private.retire_content_enrichment();

  create trigger content_enrichment_delete_vocabulary after delete on public.vocabulary for each row execute function private.retire_content_enrichment();

  create function public.website_claim_enrichment() returns setof public.content_enrichment_jobs
  language sql security invoker set search_path='' as $$
  with selected as (
  select id from public.content_enrichment_jobs where next_attempt_at<=now() and
  (status='queued' or (status='processing' and lease_until<now())) order by priority,next_attempt_at,
  created_at
  for update skip locked limit 1
) update public.content_enrichment_jobs j set status='processing',lease_id=gen_random_uuid(),
  lease_until=now()+interval '90 seconds',attempts=attempts+1,updated_at=now()
  from selected s where j.id=s.id returning j.*;
$$;

  create function public.website_commit_enrichment(p_job uuid,p_lease uuid,p_cursor integer,
  p_done boolean,p_items jsonb,p_warning text default null)
  returns boolean language plpgsql security invoker set search_path='' as $$
declare job public.content_enrichment_jobs;
  item jsonb;
  phrase bigint;
  note uuid;
  related record;
  current_version text;
begin
  select * into job from public.content_enrichment_jobs where id=p_job and lease_id=p_lease and status='processing' and lease_until>now() for update;
  if not found then return false;
  end if;
  select version_hash into current_version from private.enrichment_source_versions where source_kind=job.source_kind and source_id=job.source_id;
  if current_version is distinct from job.version_hash then
  update public.content_enrichment_jobs set status='failed',error_code='source_changed',lease_id=null,
  lease_until=null where id=p_job;
  return false;
  end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>2000 or p_cursor<job.cursor then raise exception 'Invalid enrichment batch';
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
  phrase:=null;
  note:=null;
  if job.analyser='phrases' then
  if (item->>'confidence')::numeric<0.98 then continue;
  end if;
  select id into phrase from public.phrases where private.enrichment_phrase_key(phrase_ar_di)=private.enrichment_phrase_key(item->>'arabic') order by (phrase_ar_di=item->>'arabic') desc,
  id limit 1;
  if phrase is null then select id into phrase from public.phrases where id=private.enrichment_phrase_id(item->>'existingId');
  end if;
  if phrase is null then
  if coalesce(item->>'english','')='' or coalesce(item->>'transliteration','')='' then continue;
  end if;
  phrase:=public.website_write_phrase(null,jsonb_build_object('phrase_ar_di',item->>'arabic',
  'phrase_tr',item->>'transliteration','english',item->>'english','cefr',item->>'cefr','notes',
  item->>'evidence'));
  end if;
  else
  insert into public.grammar_notes(rule_key,title_en,title_ar,rule_cefr,category,explanation,
  detail,confidence)
  values(item->>'ruleKey',item->>'titleEn',item->>'titleAr',item->>'cefr',item->>'category',
  item->>'explanation',coalesce(item->>'detail',''),(item->>'confidence')::numeric)
  on conflict(rule_key) do nothing;
  select coalesce(merged_into,id) into note from public.grammar_notes where rule_key=item->>'ruleKey' for update;
  end if;
  insert into public.content_enrichment_examples(phrase_id,grammar_note_id,source_kind,source_id,
  unit_key,version_hash,source_title,parent_id,parent_title,source_url,original_url,source_timestamp,
  arabic,english,explanation,highlight,example_cefr)
  values(phrase,note,job.source_kind,job.source_id,item->>'unitKey',job.version_hash,item->>'sourceTitle',
  item->>'parentId',item->>'parentTitle',item->>'sourceUrl',item->>'originalUrl',item->>'timestamp',
  item->>'sourceArabic',coalesce(item->>'sourceEnglish',''),coalesce(nullif(item->>'sourceExplanation',
  ''),item->>'exampleExplanation',''),item->>'highlight',item->>'exampleCefr')
  on conflict do nothing;
  -- Refresh only generated occurrence data. Curated rule/Phrase fields win.
  update public.content_enrichment_examples set review_status=case when phrase is not null then 'approved' when arabic is distinct from item->>'sourceArabic' or english is distinct from coalesce(item->>'sourceEnglish',
  '') or highlight is distinct from item->>'highlight' or explanation is distinct from coalesce(nullif(item->>'sourceExplanation',
  ''),item->>'exampleExplanation','') then 'candidate' else review_status end,
  version_hash=job.version_hash,run_id=job.run_id,arabic=item->>'sourceArabic',english=coalesce(item->>'sourceEnglish',
  ''),explanation=coalesce(nullif(item->>'sourceExplanation',''),item->>'exampleExplanation',
  ''),highlight=item->>'highlight',source_title=item->>'sourceTitle',parent_title=item->>'parentTitle',
  source_url=item->>'sourceUrl',original_url=item->>'originalUrl',source_timestamp=item->>'timestamp',
  active=true,updated_at=now()
  where source_kind=job.source_kind and source_id=job.source_id and unit_key=item->>'unitKey' and (phrase_id=phrase or grammar_note_id=note);
  end loop;
  if p_done then
  update public.content_enrichment_examples set active=false where source_kind=job.source_kind and source_id=job.source_id and run_id is distinct from job.run_id and
  ((job.analyser='phrases' and phrase_id is not null) or (job.analyser='grammar' and grammar_note_id is not null));
  end if;
  update public.content_enrichment_jobs set cursor=p_cursor,attempts=0,status=case when not p_done then 'queued' when p_warning is null and coalesce(error_code,
  '')<>'analysis_provider_not_configured' then 'completed' else 'warnings' end,
  last_processed_version=case when p_done then version_hash else last_processed_version end,
  error_code=case when p_warning is not null then p_warning when error_code='analysis_provider_not_configured' then error_code else null end,
  lease_id=null,lease_until=null,next_attempt_at=now(),updated_at=now() where id=p_job;
  return true;
end $$;

  create function public.website_fail_enrichment(p_job uuid,p_lease uuid,p_error text) returns void
  language sql security invoker set search_path='' as $$
  update public.content_enrichment_jobs set status=case when attempts<3 then 'queued' else 'failed' end,
  error_code=left(p_error,120),lease_id=null,lease_until=null,next_attempt_at=now()+interval '1 minute'*power(2,
  least(attempts,6)),updated_at=now()
  where id=p_job and lease_id=p_lease and status='processing';
$$;

  create function public.website_claim_enrichment_analysis(p_hash text) returns uuid language sql security invoker set search_path='' as $$
  insert into public.content_enrichment_analysis_cache(analysis_hash,lease_id,lease_until)values(p_hash,
  gen_random_uuid(),now()+interval '90 seconds')
  on conflict(analysis_hash) do update set lease_id=excluded.lease_id,lease_until=excluded.lease_until
  where content_enrichment_analysis_cache.result is null and content_enrichment_analysis_cache.lease_until<now()
  returning lease_id;
$$;

  create function public.website_enrichment_cache(p_hash text,p_result jsonb default null,p_lease uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare cached jsonb;
begin
  if p_result is not null then
  if length(p_result::text)>200000 then raise exception 'Analysis cache limit exceeded';
  end if;
  update public.content_enrichment_analysis_cache set result=p_result,lease_id=null,lease_until=null where analysis_hash=p_hash and lease_id=p_lease and lease_until>now();
  end if;
  select result into cached from public.content_enrichment_analysis_cache where analysis_hash=p_hash;
  return cached;
end $$;

  create function public.website_scan_enrichment(p_mode text,p_after text default '',p_limit integer default 100) returns jsonb
  language plpgsql security invoker set search_path='' as $$
declare source record;
  queued integer:=0;
  scanned integer:=0;
  cursor_value text:=p_after;
begin
  if p_mode not in('new', 'all') then raise exception 'Invalid scan mode';
  end if;
  for source in select * from private.enrichment_source_versions where source_kind||':'||source_id>p_after order by source_kind||':'||source_id limit least(greatest(p_limit,
  1),100) loop
  queued:=queued+public.website_queue_enrichment(source.source_kind,source.source_id,p_mode='all',
  10::smallint);
  scanned:=scanned+1;
  cursor_value:=source.source_kind||':'||source.source_id;
  end loop;
  return jsonb_build_object('scanned',scanned,'queued',queued,'after',cursor_value,'done',scanned<least(greatest(p_limit,
  1),100));
end $$;

  create function public.website_admin_grammar(p_action text,p_id uuid default null,p_fields jsonb default '{}',
  p_filter jsonb default '{}') returns jsonb
  language plpgsql security invoker set search_path='' as $$
declare result jsonb;
  target uuid;
  entry public.content_enrichment_examples;
  page_number integer:=greatest(coalesce((p_filter->>'page')::integer,0),0);
begin
  if p_action='list' then
  select jsonb_build_object('notes',coalesce((select jsonb_agg(to_jsonb(n)||jsonb_build_object('example_count',
  (select count(*) from public.content_enrichment_examples e where e.grammar_note_id=n.id and e.active),
  'pending_examples',(select count(*) from public.content_enrichment_examples e where e.grammar_note_id=n.id and e.active and e.review_status='candidate'))) from (
  select * from public.grammar_notes n where merged_into is null and (coalesce(p_filter->>'status',
  '')='' or status=p_filter->>'status' or (p_filter->>'status'='candidate' and n.status='approved' and exists(select 1 from public.content_enrichment_examples e where e.grammar_note_id=n.id and e.active and e.review_status='candidate'))) and (coalesce(p_filter->>'cefr',
  '')='' or rule_cefr=p_filter->>'cefr') and (coalesce(p_filter->>'category','')='' or category=p_filter->>'category')
  and (coalesce(p_filter->>'search','')='' or title_en||' '||title_ar||' '||explanation ilike '%'||(p_filter->>'search')||'%') order by updated_at desc,
  id limit 25 offset page_number*25
)n),'[]'::jsonb),
  'jobs',coalesce((select jsonb_agg(to_jsonb(j)) from(select * from public.content_enrichment_jobs order by updated_at desc limit 100)j),
  '[]'::jsonb),
  'distribution',coalesce((select jsonb_object_agg(rule_cefr,total)from(select rule_cefr,count(*) total from public.grammar_notes n where merged_into is null and (status='candidate' or (status='approved' and exists(select 1 from public.content_enrichment_examples e where e.grammar_note_id=n.id and e.active and e.review_status='candidate'))) group by rule_cefr)d),
  '{}'::jsonb),
  'job_counts',coalesce((select jsonb_object_agg(status,total)from(select status,count(*)total from public.content_enrichment_jobs group by status)c),
  '{}'::jsonb)) into result;
  return result;
  elsif p_action='examples' then
  select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) into result from(select * from public.content_enrichment_examples where grammar_note_id=p_id and active order by source_kind,
  source_id,unit_key limit 25 offset page_number*25)e;
  return result;
  elsif p_action='edit' then
  update public.grammar_notes set title_en=coalesce(p_fields->>'title_en',title_en),title_ar=coalesce(p_fields->>'title_ar',
  title_ar),rule_cefr=coalesce(p_fields->>'rule_cefr',rule_cefr),category=coalesce(p_fields->>'category',
  category),explanation=coalesce(p_fields->>'explanation',explanation),detail=coalesce(p_fields->>'detail',
  detail),status=coalesce(p_fields->>'status',status),updated_at=now() where id=p_id and merged_into is null;
  if not found then raise exception 'Grammar note unavailable';
  end if;
  if p_fields->>'status'='approved' and jsonb_typeof(p_fields->'reviewed_examples')='array' then
  update public.content_enrichment_examples set review_status='approved' where grammar_note_id=p_id and active and id in(select value::uuid from jsonb_array_elements_text(p_fields->'reviewed_examples'));
  end if;
  elsif p_action='example_status' then
  if p_fields->>'status' not in('approved', 'rejected') then raise exception 'Invalid example status';
  end if;
  update public.content_enrichment_examples set review_status=p_fields->>'status',updated_at=now() where id=p_id and grammar_note_id is not null and active;
  elsif p_action='retry' then
  update public.content_enrichment_jobs set status='queued',run_id=gen_random_uuid(),cursor=0,
  attempts=0,lease_id=null,lease_until=null,error_code=null,next_attempt_at=now(),updated_at=now() where id=p_id;
  elsif p_action='merge' then
  target:=(p_fields->>'target')::uuid;
  if target=p_id then raise exception 'Choose another rule';
  end if;
  perform id from public.grammar_notes where id in(p_id,target) order by id for update;
  if not exists(select 1 from public.grammar_notes where id=target and merged_into is null) or not exists(select 1 from public.grammar_notes where id=p_id and merged_into is null) then raise exception 'Choose existing unmerged rules';
  end if;
  for entry in select * from public.content_enrichment_examples where grammar_note_id=p_id loop
  insert into public.content_enrichment_examples(phrase_id,grammar_note_id,source_kind,source_id,
  unit_key,version_hash,source_title,parent_id,parent_title,source_url,original_url,source_timestamp,
  arabic,english,explanation,highlight,example_cefr,active,review_status)
  values(null,target,entry.source_kind,entry.source_id,entry.unit_key,entry.version_hash,entry.source_title,
  entry.parent_id,entry.parent_title,entry.source_url,entry.original_url,entry.source_timestamp,
  entry.arabic,entry.english,entry.explanation,entry.highlight,entry.example_cefr,entry.active,
  entry.review_status)on conflict do nothing;
  end loop;
  delete from public.content_enrichment_examples where grammar_note_id=p_id;
  update public.grammar_notes set merged_into=target,status='rejected',updated_at=now() where id=p_id;
  update public.grammar_notes set merged_into=target where merged_into=p_id;
  else raise exception 'Invalid grammar action';
  end if;
  return jsonb_build_object('ok',true);
end $$;
  -- All callable functions are service-only. Admin identity is checked in actions.
  do $$ declare entry record;
begin
  for entry in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='public' and p.proname in('website_write_phrase', 'website_queue_enrichment', 'website_claim_enrichment', 'website_commit_enrichment', 'website_fail_enrichment', 'website_enrichment_cache', 'website_claim_enrichment_analysis', 'website_scan_enrichment', 'website_admin_grammar'))
  or (n.nspname='private' and p.proname in('queue_content_enrichment', 'queue_segment_content_enrichment', 'retire_content_enrichment', 'enrichment_phrase_key', 'enrichment_phrase_id')) loop
  execute format('revoke all on function %s from public,anon,authenticated',entry.signature);
  execute format('grant execute on function %s to service_role',entry.signature);
  end loop;
end $$;

  grant select on private.enrichment_source_versions to service_role;

  revoke all on private.enrichment_source_versions from public,anon,authenticated;

  grant usage on schema private to service_role;
  commit;
