begin;
set local lock_timeout='5s';
alter table public.phrases add column word_glosses jsonb;
alter table public.phrases add constraint phrase_word_glosses_array check(word_glosses is null or jsonb_typeof(word_glosses)='array');
create table private.home_daily_phrase (
 day date primary key,
 phrase_id bigint references public.phrases(id) on delete set null
);
alter table private.home_daily_phrase enable row level security;
revoke all on private.home_daily_phrase from public,anon,authenticated;
grant all on private.home_daily_phrase to service_role;
create or replace function public.website_write_phrase(p_id bigint,p_fields jsonb) returns bigint
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
  insert into public.phrases(phrase_ar_di,phrase_tr,english,cefr,notes,word_glosses)
  values(arabic,p_fields->>'phrase_tr',p_fields->>'english',p_fields->>'cefr',p_fields->>'notes',p_fields->'word_glosses') returning id into matched;
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
  create or replace function public.website_commit_enrichment(p_job uuid,p_lease uuid,p_cursor integer,
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
  item->>'evidence','word_glosses',item->'wordGlosses'));
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

  
create view private.home_eligible_phrases as
select * from public.phrases
where phrase_ar_di ~ '[ء-ي]'
  and english ~ '[A-Za-z]'
  and english !~* 'https?://'
  and lower(btrim(english)) !~ '^(test|placeholder|todo|tbd|n/a|undefined|null|example|coming soon)([ .!]*$)'
  and lower(phrase_ar_di) !~ '(placeholder|todo|test|undefined)';
revoke all on private.home_eligible_phrases from public,anon,authenticated;
grant select on private.home_eligible_phrases to service_role;

create function public.website_phrase_of_day(p_day date default (now() at time zone 'Europe/London')::date)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare chosen bigint; previous bigint; pool bigint[]; position integer; result jsonb;
begin
  if p_day is null then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('home-phrase-'||p_day::text,0));
  select d.phrase_id into chosen from private.home_daily_phrase d
  join private.home_eligible_phrases p on p.id=d.phrase_id where d.day=p_day;
  if chosen is null then
    select array_agg(id order by id) into pool from private.home_eligible_phrases;
    if coalesce(cardinality(pool),0)=0 then return null; end if;
    position:=mod(p_day-date '2000-01-01',cardinality(pool));
    position:=mod(position+cardinality(pool),cardinality(pool))+1;
    chosen:=pool[position];
    select phrase_id into previous from private.home_daily_phrase where day=p_day-1;
    if chosen=previous and cardinality(pool)>1 then
      chosen:=pool[mod(position,cardinality(pool))+1];
    end if;
    insert into private.home_daily_phrase(day,phrase_id) values(p_day,chosen)
    on conflict(day) do update set phrase_id=excluded.phrase_id;
  end if;
  select jsonb_build_object('id',id::text,'phrase_ar_di',phrase_ar_di,'english',english,'word_glosses',word_glosses)
  into result from private.home_eligible_phrases where id=chosen;
  return result;
end $$;
revoke all on function public.website_phrase_of_day(date) from public,anon,authenticated;
grant execute on function public.website_phrase_of_day(date) to service_role;
commit;
