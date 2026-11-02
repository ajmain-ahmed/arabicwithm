-- Consolidate the retired Imported folder into the canonical Imports group.
-- The existing registration pipeline now targets Imports directly.
do $$
declare definition text; legacy uuid; destination uuid; guard_definition text;
begin
  lock table public.transcript_groups in access exclusive mode;
  select id into strict destination from public.transcript_groups where system_key='app_imports';
  definition:=pg_get_functiondef('transcript_private.register_gemini_youtube_transcript(uuid,text,text)'::regprocedure);
  if position('system_key=''imported''' in definition)=0 then
    raise exception 'Gemini registration group contract changed';
  end if;
  execute replace(definition,'system_key=''imported''','system_key=''app_imports''');
  select id into legacy from public.transcript_groups where system_key='imported';
  if legacy is not null then
    if exists(select 1 from public.admin_manual_transcripts where group_id=legacy)
      or exists(select 1 from public.transcript_groups where parent_id=legacy) then
      raise exception 'Legacy Imported group must be empty before retirement';
    end if;
    -- Retire only this verified empty system folder within the locked transaction.
    -- Restore the unchanged system-group protection before the transaction ends.
    select pg_get_triggerdef(oid) into strict guard_definition from pg_trigger
      where tgrelid='public.transcript_groups'::regclass and tgname='protect_system_transcript_group';
    execute 'drop trigger protect_system_transcript_group on public.transcript_groups';
    delete from public.transcript_groups where id=legacy and system_key='imported';
    execute guard_definition;
  end if;
end $$;
notify pgrst,'reload schema';
