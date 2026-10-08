-- Preserve valid existing projections on optional retry; capture legacy source on demand only.
begin;
create or replace function transcript_private.enrich_manual_source(p_id uuid) returns void
language plpgsql set search_path='' as $$
declare item jsonb; t jsonb; projection jsonb; tokens jsonb; n integer:=0; k integer; usable integer:=0; total integer:=0; problems jsonb:='[]';
begin
 for item in select value from jsonb_array_elements((select raw_transcript->'content' from public.youtube_transcripts where id=p_id)) loop
  tokens:='[]';k:=0;
  if jsonb_typeof(item->'tokens')='array' then
   for t in select value from jsonb_array_elements(item->'tokens') loop
    k:=k+1;total:=total+1;
    if transcript_private.usable_manual_token(t) then
     usable:=usable+1;
     tokens:=tokens||jsonb_build_array(jsonb_build_object('arabic',coalesce(t->>'ar',t->>'arabic',t->>'surface'),'english',coalesce(t->>'english',t->>'gloss'),'pos',coalesce(t->>'pos',t->>'POS'),'headword',t->'headword','entry_type',t->>'entry_type','transliteration',t->>'transliteration'));
    else problems:=problems||jsonb_build_array(jsonb_build_object('segment',n+1,'token',k,'reason','Optional enrichment unavailable; original source retained'));end if;
   end loop;
  else problems:=problems||jsonb_build_array(jsonb_build_object('segment',n+1,'reason','Optional token enrichment absent or unsupported; original source retained'));end if;
  projection:=null;
  if k>0 and jsonb_array_length(tokens)=k then projection:=jsonb_build_object('tokens',tokens,'translation',coalesce(item->>'english',''),'timestamp',transcript_private.manual_awm_timestamp((item->>'offset')::float8/1000),'paragraph',n+1);end if;
  update public.transcript_segments set canonical_paragraph=projection where transcript_id=p_id and position=n and canonical_paragraph is null and projection is not null;
  n:=n+1;
 end loop;
 -- Only linguistic operations may fail softly. Storage/permission failures still abort the transaction.
 begin perform transcript_private.enrich_tokens(p_id);
 exception when data_exception or raise_exception or undefined_function or undefined_table or insufficient_privilege then problems:=problems||jsonb_build_array(jsonb_build_object('operation','dictionary enrichment','sqlstate',sqlstate,'reason',sqlerrm));end;
 update transcript_private.manual_sources set enrichment_status=case when usable=0 then 'unavailable' when usable=total and jsonb_array_length(problems)=0 then 'ready' else 'partial' end,diagnostics=problems,updated_at=now() where transcript_id=p_id;
end $$;
create or replace function public.admin_retry_manual_enrichment(p_actor uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_actor is null or public.account_role(p_actor) is distinct from 'admin' then raise exception 'Forbidden';end if;
 perform 1 from public.youtube_transcripts where id=p_id for update;
 if not transcript_private.manual_transcript_allowed(p_id) then raise exception 'Only standalone manual transcripts can be enriched here';end if;
 insert into transcript_private.manual_sources(transcript_id,original_json,source) select id,raw_transcript::text,raw_transcript from public.youtube_transcripts where id=p_id on conflict(transcript_id) do nothing;
 perform transcript_private.enrich_manual_source(p_id);
 return public.admin_manual_enrichment(p_actor,p_id);
end $$;
commit;
