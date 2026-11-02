-- Preserve app provenance when an Admin reuses an existing canonical transcript.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.admin_record_transcript_origin(uuid,uuid)'::regprocedure);
  if position('set source_origin=case' in definition)=0 then
    raise exception 'admin_record_transcript_origin contract changed';
  end if;
  definition := replace(definition, 'set source_origin=case',
    'set source_origin=case when t.source_origin=''user_import'' then ''user_import''');
  execute definition;
end $$;
notify pgrst, 'reload schema';
