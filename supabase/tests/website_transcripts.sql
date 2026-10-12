begin;
do $$
declare actor uuid; v uuid; existing uuid; ids bigint[];
begin
 select user_id into actor from public.account_roles where role='admin' limit 1;
 assert actor is not null;
 assert not has_function_privilege('anon','public.admin_import_youtube_transcript(uuid,text,text,text,jsonb,boolean)','execute');
 assert not has_function_privilege('authenticated','public.admin_import_youtube_transcript(uuid,text,text,text,jsonb,boolean)','execute');
 assert not has_function_privilege('authenticated','public.index_youtube_transcript(uuid,uuid)','execute');
 assert not has_column_privilege('authenticated','public.youtube_transcripts','raw_transcript','select');
 assert not has_table_privilege('authenticated','public.book_chapter_audio','select');
 assert (select not public from storage.buckets where id='audiobooks');
 assert not exists(select 1 from public.books where description is null or length(btrim(description))<20);
 begin
  perform public.admin_import_youtube_transcript(gen_random_uuid(),'TESTManual1','No','','{"content":[]}',true);
  raise exception 'non-admin accepted';
 exception when raise_exception then assert sqlerrm='Forbidden'; end;
 begin
  perform public.admin_import_youtube_transcript(actor,'TESTManual1','No','','{"content":[{"text":"تعلم","offset":0}]}',true);
  raise exception 'untimed accepted';
 exception when raise_exception then assert sqlerrm='invalid_manual_transcript'; end;
 v:=public.admin_import_youtube_transcript(actor,'TESTManual1','Website manual test','Source',
  '{"content":[{"text":"غلايات جميلة","offset":10000,"duration":2500,"english":"Beautiful kettles"},{"text":"غلايات العربية","offset":1200,"duration":2500,"english":"Arabic kettles"}]}',false);
 assert (select provider='manual' and status='ready' and not searchable and translation_status='ready' from public.youtube_transcripts where id=v);
 assert (select array_agg(start_seconds order by position)=array[1.2,10]::double precision[] from public.transcript_segments where transcript_id=v);
 assert (select count(english_text)=2 from public.transcript_segments where transcript_id=v);
 assert exists(select 1 from public.transcript_tokens k join public.transcript_segments s on s.id=k.segment_id where s.transcript_id=v);
 assert not exists(select 1 from transcript_private.translations where transcript_id=v);
 assert not exists(select 1 from public.search_transcript_word('غلايات',0,50,0) where transcript_id=v);
 select array_agg(id order by position) into ids from public.transcript_segments where transcript_id=v;
 existing:=public.admin_import_youtube_transcript(actor,'TESTManual1','Replacement','',
  '{"content":[{"text":"غلايات","offset":20000,"duration":2500}]}',true);
 assert v=existing;
 assert (select array_agg(id order by position)=ids from public.transcript_segments where transcript_id=v);
 assert (select title='Website manual test' and not searchable from public.youtube_transcripts where id=v);
 update public.youtube_transcripts set searchable=true where id=v;
 assert exists(select 1 from public.search_transcript_word('غلايات',ids[1]-1,50,0) where transcript_id=v and english_text='Arabic kettles' and start_seconds=1.2);
 assert (select gladia_youtube_id is null from transcript_private.settings where singleton);
 assert (select count(*)=170 from public.transcript_segments s join public.youtube_transcripts t on t.id=s.transcript_id where t.youtube_id='Dgj9fQYbCZY');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 assert exists(select 1 from public.search_transcript_word('غلايات',0,50,0) where youtube_id='TESTManual1');
 assert not exists(select 1 from public.user_video_library where transcript_id=(select id from public.youtube_transcripts where youtube_id='TESTManual1'));
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin assert exists(select 1 from public.search_transcript_word('غلايات',0,50,0) where youtube_id='TESTManual1' and english_text is not null); end $$;
reset role;
rollback;
