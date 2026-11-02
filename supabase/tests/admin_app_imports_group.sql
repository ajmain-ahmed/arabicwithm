-- No provider calls; synthetic rows and registrations are rolled back.
begin;
do $$
#variable_conflict use_variable
declare actor uuid; owner_id uuid:=gen_random_uuid(); imports uuid; original_group uuid;
  row_id uuid; completed_id uuid; registered_id uuid; manual_id uuid; episode_link uuid;
  response jsonb; value jsonb; ids text[]:='{}'; expected integer; page integer:=0;
  canonical jsonb:='[{"tokens":[{"pos":"interjection","arabic":"\u0645\u064e\u0631\u0652\u062d\u064e\u0628\u064b\u0627","english":"hello","headword":null,"entry_type":"word","transliteration":"marhaban"}],"timestamp":"00:00","translation":"Hello","paragraph":1}]';
  raw_json jsonb:='{"lang":"ar","content":[{"text":"\u0645\u064e\u0631\u0652\u062d\u064e\u0628\u064b\u0627","offset":0,"duration":1000,"english":"Hello"}]}';
begin
  select id into actor from auth.users where public.account_role(id)='admin' limit 1;
  assert actor is not null;
  select id into strict imports from public.transcript_groups where system_key='app_imports' and name='Imports';
  assert exists(select 1 from public.transcript_groups where system_key='imported'), 'Prior Imported group removed';
  assert not has_function_privilege('authenticated','public.admin_list_manual_transcripts(uuid,integer,text,uuid,boolean)','execute');
  assert not has_function_privilege('anon','public.admin_list_manual_transcripts(uuid,integer,text,uuid,boolean)','execute');
  insert into auth.users(id) values(owner_id);
  insert into private.manual_premium_grants(user_id,enabled,reason) values(owner_id,true,'Rollback Imports group test');
  insert into public.transcript_groups(name) values('Manual QA '||gen_random_uuid()) returning id into original_group;
  -- Completion associates every canonical import without a user-library join.
  for i in 1..35 loop
    insert into public.youtube_transcripts(youtube_id,canonical_url,title,thumbnail,provider,source_origin,status,canonical_transcript,raw_transcript,searchable,explore_published)
    values('IMPT'||lpad(i::text,7,'0'),'https://www.youtube.com/watch?v=IMPT'||lpad(i::text,7,'0'),'App import '||i,'','gemini','user_import','ready',canonical,raw_json,false,false)
    returning id into row_id;
    assert exists(select 1 from public.admin_manual_transcripts where transcript_id=row_id and group_id=imports);
  end loop;
  insert into public.youtube_transcripts(youtube_id,canonical_url,title,thumbnail,provider,source_origin,status,canonical_transcript,raw_transcript,searchable,explore_published)
    values('IMPTLATE001','https://www.youtube.com/watch?v=IMPTLATE001','Later completion','','gemini','user_import','processing',canonical,raw_json,false,false) returning id into completed_id;
  update public.youtube_transcripts set status='ready' where id=completed_id;
  assert exists(select 1 from public.admin_manual_transcripts where transcript_id=completed_id and group_id=imports);
  -- Even an episode association cannot hide app-origin records from the list.
  select id into episode_link from public.episodes limit 1;
  insert into public.youtube_transcripts(youtube_id,canonical_url,title,thumbnail,provider,source_origin,status,canonical_transcript,raw_transcript,episode_id,searchable,explore_published)
    values('IMPTLINK001','https://www.youtube.com/watch?v=IMPTLINK001','Linked app import','','gemini','user_import','ready',canonical,raw_json,episode_link,false,false);
  registered_id:=public.register_gemini_youtube_transcript(owner_id,'IMPTREG0001','https://www.youtube.com/watch?v=IMPTREG0001');
  assert exists(select 1 from public.admin_manual_transcripts where transcript_id=registered_id and group_id=imports), 'Existing registration did not assign Imports';
  delete from public.user_video_library where user_id=owner_id and transcript_id=registered_id;
  assert exists(select 1 from public.youtube_transcripts where id=registered_id);
  assert exists(select 1 from public.admin_manual_transcripts where transcript_id=registered_id and group_id=imports);
  insert into public.youtube_transcripts(youtube_id,canonical_url,title,thumbnail,provider,source_origin,status,canonical_transcript,raw_transcript,searchable,explore_published)
    values('MANUALQA001','https://www.youtube.com/watch?v=MANUALQA001','Manual control','','manual','website_admin_transcript','ready',canonical,raw_json,false,false) returning id into manual_id;
  insert into public.admin_manual_transcripts(transcript_id,group_id) values(manual_id,original_group);
  assert not exists(select 1 from public.admin_manual_transcripts where transcript_id=manual_id and group_id=imports);
  begin
    update public.admin_manual_transcripts set group_id=imports where transcript_id=manual_id;
    raise exception 'Manual transcript entered Imports';
  exception when raise_exception then if sqlerrm<>'automatic_import_group' then raise; end if; end;
  begin
    update public.admin_manual_transcripts set group_id=original_group where transcript_id=completed_id;
    raise exception 'App import left automatic group';
  exception when raise_exception then if sqlerrm<>'automatic_import_group' then raise; end if; end;
  begin
    perform public.admin_list_manual_transcripts(owner_id,0,'',imports,false);
    raise exception 'Non-admin read Imports';
  exception when raise_exception then if sqlerrm<>'Forbidden' then raise; end if; end;
  perform public.admin_record_transcript_origin(actor,completed_id);
  assert (select source_origin from public.youtube_transcripts where id=completed_id)='user_import';
  select count(*) into expected from public.youtube_transcripts where source_origin='user_import';
  loop
    response:=public.admin_list_manual_transcripts(actor,page,'',imports,false);
    assert (response->>'total')::integer=expected;
    for value in select * from jsonb_array_elements(response->'rows') loop
      assert value->>'source_origin'='user_import';
      assert not(value?'created_by') and not(value?'user_id');
      if value->>'status'<>'ready' then assert (value->>'has_saved_transcript')::boolean=false; end if;
      ids:=array_append(ids,value->>'id');
    end loop;
    exit when (page+1)*30>=expected;
    page:=page+1;
  end loop;
  assert page>0 and cardinality(ids)=expected;
  assert (select count(distinct id) from unnest(ids) id)=expected;
  assert (select count(*) from public.youtube_transcripts where source_origin='user_import' and not searchable and not explore_published)=expected;
  assert (public.admin_imported_transcript(actor,completed_id)->'transcript')=canonical;
  assert exists(select 1 from public.admin_manual_transcripts where transcript_id=manual_id and group_id=original_group);
end $$;
rollback;
