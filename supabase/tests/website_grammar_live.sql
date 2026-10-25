-- Run as the migration owner. All source fixtures and side effects roll back.
begin;
do $$
declare actor uuid; bid uuid; chapter uuid=gen_random_uuid(); video uuid; segment bigint; p jsonb; q jsonb;
begin
 select user_id into actor from public.account_roles where role='admin' limit 1;
 select id into bid from public.books order by id limit 1;
 assert actor is not null and bid is not null;
 p='{"tokens":[{"arabic":"كَتَبَ","english":"wrote","pos":"verb","cefr":"a1","headword":"كتب","entry_type":"word","transliteration":"kataba"},{"arabic":"الطَّالِبُ","english":"the student","pos":"noun","cefr":"a1","headword":"طالب","entry_type":"word","transliteration":"aṭ-ṭālibu","syntactic_role":{"arabic":"فَاعِلٌ","english":"Subject/doer"},"grammatical_case":{"arabic":"مَرْفُوعٌ","english":"Nominative"}},{"arabic":"دَرْسًا","english":"a lesson","pos":"noun","cefr":"a1","headword":"درس","entry_type":"word","transliteration":"darsan"}],"translation":"The student wrote a lesson."}'::jsonb;
 insert into public.chapters(id,book_id,slug,title,chapter_number,content)
 values(chapter,bid,'grammar-qa-'||chapter,'Temporary Grammar QA',999999,jsonb_build_array(p,p-'tokens'||jsonb_build_object('tokens',jsonb_build_array(jsonb_build_object('arabic','قَرَأَ','pos','verb'),jsonb_build_object('arabic','عَلِيٌّ','pos','noun')),'translation','Ali read a book.')));
 assert exists(select 1 from private.website_grammar_sources where chapter_id=chapter and paragraph_index=0 and modes @> array['sentence_role','grammatical_case','word_type']);
 assert exists(select 1 from private.website_grammar_sources where chapter_id=chapter and paragraph_index=1 and modes @> array['word_type'] and not(modes && array['sentence_role','grammatical_case']));
 -- An edit removes the old role while retaining independently supported facts.
 update public.chapters set content=jsonb_build_array(jsonb_set(p,'{tokens,1,syntactic_role}','null')) where id=chapter;
 assert (select count(*)=1 from private.website_grammar_sources where chapter_id=chapter);
 assert not exists(select 1 from private.website_grammar_sources where chapter_id=chapter and modes @> array['sentence_role']);
 delete from public.chapters where id=chapter;
 assert not exists(select 1 from private.website_grammar_sources where chapter_id=chapter);

 video=public.admin_import_youtube_transcript(actor,'GRAMMARQA01','Temporary Grammar QA','QA',jsonb_build_object('content',jsonb_build_array(jsonb_build_object('text','كَتَبَ الطَّالِبُ دَرْسًا','offset',1000,'duration',3000,'english',p->>'translation','tokens',p->'tokens'))),true);
 select s.id into segment from public.transcript_segments s where s.transcript_id=video limit 1;
 assert exists(select 1 from private.website_grammar_sources where segment_id=segment and modes @> array['sentence_role','grammatical_case','word_type']);
 update public.transcript_segments set canonical_paragraph=jsonb_set(canonical_paragraph,'{tokens,1,syntactic_role}','null') where id=segment;
 assert not exists(select 1 from private.website_grammar_sources where segment_id=segment and modes @> array['sentence_role']);
 perform set_config('request.jwt.claim.sub',actor::text,true);
 q=public.website_grammar_candidates('word_type','live-qa','{}',null);
 assert jsonb_array_length(q)>1;
 assert (select count(*)=count(distinct x->>'sentence_hash') from jsonb_array_elements(q) x);
 assert not exists(select 1 from jsonb_array_elements(public.website_grammar_candidates('word_type','live-qa',array(select x->>'sentence_hash' from jsonb_array_elements(q) x),null)) x where x->>'sentence_hash'=any(array(select y->>'sentence_hash' from jsonb_array_elements(q) y)));
 delete from public.youtube_transcripts where id=video;
 assert not exists(select 1 from private.website_grammar_sources where segment_id=segment);
 assert not has_table_privilege('authenticated','private.website_grammar_sources','select');
 assert not has_function_privilege('anon','public.website_grammar_candidates(text,text,text[],integer)','execute');
end $$;
rollback;
