begin;
set local lock_timeout='5s';
alter table public.grammar_notes add column mechanics text not null default '',
 add column recognition_tip text not null default '',
 add column transformations text[] not null default '{}';
-- explanation remains the plain explanation; detail remains the advanced note.
alter table public.content_enrichment_examples add column source_order integer not null default 0,
 add column manual_override boolean not null default false,
 add column origin_rule_id uuid references public.grammar_notes(id);
create table public.grammar_note_relations (
 note_id uuid not null references public.grammar_notes(id) on delete cascade,
 related_id uuid not null references public.grammar_notes(id) on delete cascade,
 primary key(note_id,related_id), check(note_id<>related_id)
);
alter table public.grammar_note_relations enable row level security;
revoke all on public.grammar_note_relations from public,anon,authenticated;
grant all on public.grammar_note_relations to service_role;
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
  detail,confidence,mechanics,recognition_tip,transformations)
  values(item->>'ruleKey',item->>'titleEn',item->>'titleAr',item->>'cefr',item->>'category',
  item->>'explanation',coalesce(item->>'detail',''),(item->>'confidence')::numeric,coalesce(item->>'mechanics',''),coalesce(item->>'recognitionTip',''),array(select jsonb_array_elements_text(coalesce(item->'transformations','[]'::jsonb))))
  on conflict(rule_key) do nothing;
  select coalesce(merged_into,id) into note from public.grammar_notes where rule_key=item->>'ruleKey' for update;
  end if;
  if note is not null then
    select coalesce((select e.grammar_note_id from public.content_enrichment_examples e
      where e.source_kind=job.source_kind and e.source_id=job.source_id and e.unit_key=item->>'unitKey'
      and e.manual_override and coalesce((select merged_into from public.grammar_notes where id=e.origin_rule_id),e.origin_rule_id)=note limit 1),note) into note;
  end if;
  insert into public.content_enrichment_examples(phrase_id,grammar_note_id,source_kind,source_id,
  unit_key,version_hash,source_title,parent_id,parent_title,source_url,original_url,source_timestamp,
  arabic,english,explanation,highlight,example_cefr,source_order)
  values(phrase,note,job.source_kind,job.source_id,item->>'unitKey',job.version_hash,item->>'sourceTitle',
  item->>'parentId',item->>'parentTitle',item->>'sourceUrl',item->>'originalUrl',item->>'timestamp',
  item->>'sourceArabic',coalesce(item->>'sourceEnglish',''),coalesce(nullif(item->>'sourceExplanation',
  ''),item->>'exampleExplanation',''),item->>'highlight',item->>'exampleCefr',coalesce((item->>'sourceOrder')::integer,0))
  on conflict do nothing;
  -- Refresh only generated occurrence data. Curated rule/Phrase fields win.
  update public.content_enrichment_examples set review_status=case when phrase is not null then 'approved' when arabic is distinct from item->>'sourceArabic' or english is distinct from coalesce(item->>'sourceEnglish',
  '') or (not manual_override and (highlight is distinct from item->>'highlight' or explanation is distinct from coalesce(nullif(item->>'sourceExplanation',
  ''),item->>'exampleExplanation',''))) then 'candidate' else review_status end,
  source_order=coalesce((item->>'sourceOrder')::integer,0),version_hash=job.version_hash,run_id=job.run_id,arabic=item->>'sourceArabic',english=coalesce(item->>'sourceEnglish',
  ''),explanation=case when manual_override then explanation else coalesce(nullif(item->>'sourceExplanation',''),item->>'exampleExplanation','') end,highlight=case when manual_override then highlight else item->>'highlight' end,source_title=item->>'sourceTitle',parent_title=item->>'parentTitle',
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



create or replace function public.website_admin_grammar(p_action text,p_id uuid default null,p_fields jsonb default '{}',
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
  arabic,english,explanation,highlight,example_cefr,active,review_status,manual_override,source_order,origin_rule_id)
  values(null,target,entry.source_kind,entry.source_id,entry.unit_key,entry.version_hash,entry.source_title,
  entry.parent_id,entry.parent_title,entry.source_url,entry.original_url,entry.source_timestamp,
  entry.arabic,entry.english,entry.explanation,entry.highlight,entry.example_cefr,entry.active,
  entry.review_status,entry.manual_override,entry.source_order,entry.origin_rule_id)on conflict do nothing;
  if entry.manual_override then
    update public.content_enrichment_examples set manual_override=true,highlight=entry.highlight,
      explanation=entry.explanation,review_status=entry.review_status,source_order=entry.source_order,
      origin_rule_id=entry.origin_rule_id
    where grammar_note_id=target and source_kind=entry.source_kind and source_id=entry.source_id
      and unit_key=entry.unit_key and not manual_override;
  end if;
  end loop;
  delete from public.content_enrichment_examples where grammar_note_id=p_id;
  update public.grammar_notes set merged_into=target,status='rejected',updated_at=now() where id=p_id;
  update public.grammar_notes set merged_into=target where merged_into=p_id;
  else raise exception 'Invalid grammar action';
  end if;
  return jsonb_build_object('ok',true);
end $$;

create function public.website_grammar_related(p_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(distinct coalesce(target.merged_into,target.id)), '[]'::jsonb)
 from public.grammar_note_relations r join public.grammar_notes owner on owner.id=r.note_id
 join public.grammar_notes target on target.id=r.related_id
 where coalesce(owner.merged_into,owner.id)=p_id and coalesce(target.merged_into,target.id)<>p_id;
$$;
create function public.website_edit_canonical_grammar(p_id uuid,p_fields jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform public.website_admin_grammar('edit',p_id,p_fields);
 update public.grammar_notes set mechanics=coalesce(p_fields->>'mechanics',mechanics),
 recognition_tip=coalesce(p_fields->>'recognition_tip',recognition_tip),
 transformations=case when p_fields?'transformations' then array(select jsonb_array_elements_text(p_fields->'transformations')) else transformations end
 where id=p_id;
 if p_fields?'related_ids' then
  delete from public.grammar_note_relations where note_id in(select id from public.grammar_notes where coalesce(merged_into,id)=p_id);
  insert into public.grammar_note_relations(note_id,related_id)
  select p_id,value::uuid from jsonb_array_elements_text(p_fields->'related_ids') on conflict do nothing;
 end if;
end $$;
create function public.website_edit_grammar_example(p_id uuid,p_fields jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare example public.content_enrichment_examples; target uuid;
begin
 select * into example from public.content_enrichment_examples where id=p_id and grammar_note_id is not null for update;
 if not found then raise exception 'Example unavailable';end if;
 if p_fields?'highlight' and (coalesce(p_fields->>'highlight','')='' or position(p_fields->>'highlight' in example.arabic)=0) then raise exception 'Highlight must match exact source Arabic';end if;
 target:=coalesce((p_fields->>'grammar_note_id')::uuid,example.grammar_note_id);
 if not exists(select 1 from public.grammar_notes where id=target and merged_into is null) then raise exception 'Choose a canonical rule';end if;
 update public.content_enrichment_examples set origin_rule_id=case when target<>grammar_note_id then coalesce(origin_rule_id,grammar_note_id) else origin_rule_id end,grammar_note_id=target,highlight=coalesce(p_fields->>'highlight',highlight),
 explanation=coalesce(p_fields->>'explanation',explanation),manual_override=true,review_status='candidate',updated_at=now()
 where id=p_id;
end $$;
create function public.website_read_canonical_grammar(p_id uuid,p_signed_in boolean default false,p_kind text default null,p_source text default null,p_page integer default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 select to_jsonb(n)||jsonb_build_object('related_ids',coalesce((select jsonb_agg(target.id) from public.grammar_notes target where target.id in(select value::uuid from jsonb_array_elements_text(public.website_grammar_related(n.id))) and target.status='approved' and target.merged_into is null),'[]'::jsonb),
 'examples',coalesce((select jsonb_agg(to_jsonb(e) order by e.source_kind,e.source_id,e.source_order,e.unit_key) from (
  select e.* from public.content_enrichment_examples e where e.grammar_note_id=n.id and e.active and e.review_status='approved'
  and (p_kind is null or e.source_kind=p_kind) and (p_source is null or e.source_id=p_source)
  and position(e.highlight in e.arabic)>0
  and ((e.source_kind='episode' and exists(select 1 from public.episodes source where source.id::text=e.source_id))
   or (e.source_kind='transcript' and exists(select 1 from public.youtube_transcripts source where source.id::text=e.source_id and source.status='ready' and (source.searchable or source.explore_published)))
   or (e.source_kind='chapter' and p_signed_in and exists(select 1 from public.chapters c join public.books b on b.id=c.book_id where c.id::text=e.source_id and b.is_completed and coalesce((to_jsonb(c)->>'is_published')::boolean,true)))
   or (e.source_kind='vocabulary' and exists(select 1 from public.vocabulary v where v.word_id::text=e.source_id)))
  order by e.source_kind,e.source_id,e.source_order,e.unit_key limit 25 offset least(greatest(p_page,0),10000)*25
 )e),'[]'::jsonb)) into result from public.grammar_notes n where n.id=p_id and n.status='approved' and n.merged_into is null;
 return result;
end $$;
revoke all on function public.website_grammar_related(uuid),public.website_edit_canonical_grammar(uuid,jsonb),public.website_edit_grammar_example(uuid,jsonb),public.website_read_canonical_grammar(uuid,boolean,text,text,integer) from public,anon,authenticated;
grant execute on function public.website_grammar_related(uuid),public.website_edit_canonical_grammar(uuid,jsonb),public.website_edit_grammar_example(uuid,jsonb),public.website_read_canonical_grammar(uuid,boolean,text,text,integer) to service_role;
commit;
