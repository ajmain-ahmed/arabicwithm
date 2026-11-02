-- Imports is an origin group over existing canonical rows, not a content store.
insert into public.transcript_groups(name,system_key)
select 'Imports','app_imports'
where not exists(select 1 from public.transcript_groups where system_key='app_imports');

-- Preserve all existing groups, including Imported; move only app-origin links.
insert into public.admin_manual_transcripts(transcript_id,group_id)
select t.id,g.id from public.youtube_transcripts t
cross join public.transcript_groups g
where t.source_origin='user_import' and g.system_key='app_imports'
on conflict(transcript_id) do update set group_id=excluded.group_id
where public.admin_manual_transcripts.group_id is distinct from excluded.group_id;

create function transcript_private.assign_app_import_group() returns trigger
language plpgsql set search_path='' as $$
declare origin text; imports uuid;
begin
  select source_origin into origin from public.youtube_transcripts where id=new.transcript_id;
  select id into strict imports from public.transcript_groups where system_key='app_imports';
  if origin='user_import' then
    if tg_op='UPDATE' and new.group_id is distinct from imports then
      raise exception 'automatic_import_group';
    end if;
    -- Existing registration inserts a reference through the original path.
    -- Canonical origin, not a client-supplied group ID, chooses its destination.
    new.group_id:=imports;
  elsif new.group_id=imports then
    raise exception 'automatic_import_group';
  end if;
  return new;
end $$;
revoke all on function transcript_private.assign_app_import_group() from public,anon,authenticated;
create trigger assign_app_import_group before insert or update of group_id,transcript_id
on public.admin_manual_transcripts for each row execute function transcript_private.assign_app_import_group();

create function transcript_private.complete_app_import_group() returns trigger
language plpgsql set search_path='' as $$
begin
  insert into public.admin_manual_transcripts(transcript_id,group_id)
  select new.id,id from public.transcript_groups where system_key='app_imports'
  on conflict(transcript_id) do update set group_id=excluded.group_id
  where public.admin_manual_transcripts.group_id is distinct from excluded.group_id;
  return new;
end $$;
revoke all on function transcript_private.complete_app_import_group() from public,anon,authenticated;
create trigger complete_app_import_group after insert or update of status,source_origin
on public.youtube_transcripts for each row
when(new.source_origin='user_import' and new.status='ready')
execute function transcript_private.complete_app_import_group();

-- The existing system-group protection retains its original behaviour elsewhere.
create or replace function transcript_private.protect_system_transcript_group() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.system_key is not null and (tg_op='DELETE' or new.system_key is distinct from old.system_key) then
    raise exception 'System groups can be renamed but cannot be removed';
  end if;
  if old.system_key='app_imports' and (new.name<>'Imports' or new.parent_id is not null) then
    raise exception 'automatic_import_group';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

-- Retain the established role guard, search and 30-row pagination contract.
-- Only app-origin eligibility is wider than standalone/manual eligibility.
do $$
declare definition text; old_scope text;
begin
  definition:=replace(pg_get_functiondef('public.admin_list_manual_transcripts(uuid,integer,text,uuid,boolean)'::regprocedure),chr(13),'');
  old_scope:=$old$where ((t.provider='manual' and t.source_origin='website_admin_transcript') or t.source_origin='user_import') and t.episode_id is null
  and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)$old$;
  old_scope:=replace(old_scope,chr(13),'');
  if position(old_scope in definition)=0
    or position('select t.id,t.youtube_id,t.canonical_url' in definition)=0
    or position('select g.id,g.name,g.parent_id,count(t.id)' in definition)=0
    or position($old$'error_code',error_code,'group_id',group_id$old$ in definition)=0 then
    raise exception 'Admin transcript list contract changed; review Imports migration';
  end if;
  definition:=replace(definition,old_scope,$new$where (t.source_origin='user_import' or (t.provider='manual' and t.source_origin='website_admin_transcript'
    and t.episode_id is null and not exists(select 1 from public.episodes e where e.youtube_id=t.youtube_id)))$new$);
  definition:=replace(definition,'select t.id,t.youtube_id,t.canonical_url',$new$select t.source_origin,
    (t.status='ready' and case when jsonb_typeof(t.canonical_transcript)='array' then jsonb_array_length(t.canonical_transcript)>0 else false end) as has_saved_transcript,
    transcript_private.manual_transcript_allowed(t.id) as can_edit,t.id,t.youtube_id,t.canonical_url$new$);
  definition:=replace(definition,'select g.id,g.name,g.parent_id,count(t.id)','select g.id,g.name,g.parent_id,g.system_key,count(t.id)');
  definition:=replace(definition,$old$'error_code',error_code,'group_id',group_id$old$,
    $new$'error_code',error_code,'source_origin',source_origin,'has_saved_transcript',has_saved_transcript,'can_edit',can_edit,'group_id',group_id$new$);
  execute definition;
end $$;
notify pgrst,'reload schema';
